'use client';

import {
  GAME_PHASE,
  ROOM_EVENT,
  type PlayerResponse,
  type RoleAssignedPayload,
  type RoomResponse,
} from '@repo/contract';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

const SERVER_URL = 'http://localhost:4000';
interface JoinRoomResult { player: PlayerResponse; }

export default function RoomLobbyPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const socket = useRef<Socket | null>(null);
  const [room, setRoom] = useState<RoomResponse | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [guess, setGuess] = useState('');
  const [votedFor, setVotedFor] = useState<string | null>(null);
  const [roleAssignment, setRoleAssignment] = useState<RoleAssignedPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [closed, setClosed] = useState(false);
  const storageKey = `liar:room:${roomId}:player-id`;

  const connect = useCallback((id: string) => {
    socket.current?.disconnect();
    const nextSocket = io(SERVER_URL, { autoConnect: false });
    socket.current = nextSocket;
    nextSocket.on('connect', () => {
      setIsConnected(true);
      nextSocket.emit(ROOM_EVENT.JOIN, { roomId, playerId: id });
    });
    nextSocket.on('disconnect', () => setIsConnected(false));
    nextSocket.on(ROOM_EVENT.STATE, ({ room: nextRoom }: { room: RoomResponse }) => {
      setRoom(nextRoom);
      setClosed(false);
      setIsStarting(false);
      if (!nextRoom.game) {
        setRoleAssignment(null);
        setVotedFor(null);
        setGuess('');
      }
    });
    nextSocket.on(ROOM_EVENT.CLOSED, () => {
      setClosed(true);
      setRoom(null);
      localStorage.removeItem(storageKey);
    });
    nextSocket.on(ROOM_EVENT.ROLE_ASSIGNED, (assignment: RoleAssignedPayload) => {
      setRoleAssignment(assignment);
    });
    nextSocket.connect();
  }, [roomId, storageKey]);

  useEffect(() => {
    const savedPlayerId = localStorage.getItem(storageKey);
    queueMicrotask(() => setPlayerId(savedPlayerId));
    fetch(`${SERVER_URL}/rooms/${roomId}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('방을 찾을 수 없습니다.');
        return response.json() as Promise<RoomResponse>;
      })
      .then(setRoom)
      .catch((cause) => setError(cause instanceof Error ? cause.message : '방 정보를 불러오지 못했습니다.'));
    if (savedPlayerId) connect(savedPlayerId);
    return () => { socket.current?.disconnect(); };
  }, [connect, roomId, storageKey]);

  const joinRoom = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = nickname.trim();
    if (!name) return;
    setIsJoining(true);
    setError(null);
    try {
      const response = await fetch(`${SERVER_URL}/rooms/${roomId}/players`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: name }),
      });
      if (!response.ok) throw new Error('이 방에는 입장할 수 없습니다.');
      const { player } = await response.json() as JoinRoomResult;
      localStorage.setItem(storageKey, player.id);
      setPlayerId(player.id);
      connect(player.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '입장 중 오류가 발생했습니다.');
    } finally {
      setIsJoining(false);
    }
  };

  const emit = (event: string, payload?: unknown) => {
    if (!socket.current) return;
    socket.current.emit(event, payload);
  };

  const submitGuess = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!guess.trim()) return;
    emit(ROOM_EVENT.GUESS, { keyword: guess });
  };

  if (closed) return <RoomNotice title="방이 종료되었습니다" description="방장이 퇴장했거나 모든 참가자가 나갔습니다." />;
  if (!room && error) return <RoomNotice title="방을 찾을 수 없습니다" description={error} />;
  if (!playerId) return <JoinForm nickname={nickname} setNickname={setNickname} isJoining={isJoining} error={error} onSubmit={joinRoom} roomId={roomId} />;

  const game = room?.game;
  const isHost = room?.hostId === playerId;
  const connectedPlayerCount = room?.players.filter((player) => player.connected).length ?? 0;
  const inviteLink = typeof window === 'undefined' ? `/room/${roomId}` : window.location.href;

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100 sm:p-10">
      <section className="mx-auto max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 sm:p-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-sm font-semibold tracking-[0.2em] text-cyan-400">{game ? `GAME · ${game.phase}` : 'WAITING ROOM'}</p><h1 className="mt-2 text-3xl font-bold">{titleFor(game?.phase)}</h1></div>
          <span className={`rounded-full px-3 py-1 text-sm ${isConnected ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-400/15 text-amber-300'}`}>{isConnected ? '연결됨' : '연결 중'}</span>
        </header>

        {roleAssignment && game && <RoleCard assignment={roleAssignment} />}
        {!game && <InviteLink link={inviteLink} />}
        <PlayerList players={room?.players ?? []} playerId={playerId} connectedCount={connectedPlayerCount} />
        {game && <GameControls game={game} players={room?.players ?? []} playerId={playerId} isHost={isHost} role={roleAssignment} votedFor={votedFor} guess={guess} setGuess={setGuess} onStartVoting={() => emit(ROOM_EVENT.BEGIN_VOTING)} onVote={(targetId) => { setVotedFor(targetId); emit(ROOM_EVENT.VOTE, { targetId }); }} onGuess={submitGuess} onRestart={() => emit(ROOM_EVENT.RESTART)} />}

        {!game && isHost && <div className="mt-7 rounded-xl border border-cyan-900 bg-cyan-950/30 p-4"><p className="text-sm text-slate-300">게임 시작에는 접속 중인 플레이어 3명이 필요합니다.</p><button className="mt-3 rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50" disabled={!isConnected || connectedPlayerCount < 3 || connectedPlayerCount !== (room?.players.length ?? 0) || isStarting} onClick={() => { setIsStarting(true); emit(ROOM_EVENT.START); }}>{isStarting ? '시작하는 중…' : '게임 시작'}</button></div>}
        {error && <p className="mt-5 text-sm text-rose-400">{error}</p>}
      </section>
    </main>
  );
}

function GameControls({ game, players, playerId, isHost, role, votedFor, guess, setGuess, onStartVoting, onVote, onGuess, onRestart }: { game: NonNullable<RoomResponse['game']>; players: PlayerResponse[]; playerId: string; isHost: boolean; role: RoleAssignedPayload | null; votedFor: string | null; guess: string; setGuess: (value: string) => void; onStartVoting: () => void; onVote: (targetId: string) => void; onGuess: (event: FormEvent<HTMLFormElement>) => void; onRestart: () => void }) {
  if (game.phase === GAME_PHASE.DISCUSSION) return <div className="mt-7 rounded-xl border border-violet-900 bg-violet-950/30 p-5"><h2 className="text-lg font-semibold">토론 단계</h2><p className="mt-2 text-sm text-slate-300">서로의 설명을 듣고 라이어를 추리하세요.</p>{isHost && <button className="mt-4 rounded-lg bg-violet-300 px-4 py-2 font-semibold text-slate-950" onClick={onStartVoting}>투표 시작</button>}</div>;
  if (game.phase === GAME_PHASE.VOTING) { const voteCountByPlayer = new Map(game.voteCounts?.map(({ playerId, count }) => [playerId, count])); return <div className="mt-7 rounded-xl border border-amber-900 bg-amber-950/30 p-5"><h2 className="text-lg font-semibold">라이어 투표</h2><p className="mt-2 text-sm text-slate-300">{game.voteCount}/{game.playerCount}명이 투표했습니다. 누가 투표했는지는 공개되지 않으며, 후보별 득표수만 실시간 표시됩니다.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{players.map((player) => <button key={player.id} className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left transition ${votedFor === player.id ? 'border-amber-300 bg-amber-300/15' : 'border-slate-600 hover:border-amber-300'}`} onClick={() => onVote(player.id)}><span>{player.nickname}{player.id === playerId && ' (나)'}</span><strong className="text-amber-300">{voteCountByPlayer.get(player.id) ?? 0}표</strong></button>)}</div></div>; }
  if (game.phase === GAME_PHASE.LIAR_GUESSING) return <div className="mt-7 rounded-xl border border-rose-900 bg-rose-950/30 p-5"><h2 className="text-lg font-semibold">라이어의 키워드 추측</h2>{role?.role === 'LIAR' ? <form className="mt-4 flex gap-2" onSubmit={onGuess}><input className="min-w-0 flex-1 rounded-lg border border-rose-800 bg-slate-950 px-3 py-2 outline-none focus:border-rose-300" value={guess} onChange={(event) => setGuess(event.target.value)} placeholder="키워드를 입력하세요" /><button className="rounded-lg bg-rose-300 px-4 py-2 font-semibold text-slate-950" type="submit">정답 제출</button></form> : <p className="mt-2 text-sm text-slate-300">라이어가 키워드를 추측하고 있습니다.</p>}</div>;
  return <div className="mt-7 rounded-xl border border-cyan-900 bg-cyan-950/30 p-5"><h2 className="text-xl font-bold">{game.winner === 'LIAR' ? '라이어 승리' : '시민 승리'}</h2><p className="mt-3 text-slate-300">공개 키워드: <strong className="text-cyan-300">{game.keyword}</strong></p>{isHost && <button className="mt-5 rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950" onClick={onRestart}>같은 멤버로 다시 하기</button>}</div>;
}

function RoleCard({ assignment }: { assignment: RoleAssignedPayload }) {
  const liar = assignment.role === 'LIAR';
  return <div className={`mt-7 rounded-xl border p-5 ${liar ? 'border-rose-900 bg-rose-950/30' : 'border-emerald-900 bg-emerald-950/30'}`}><p className="text-sm font-semibold tracking-[0.16em] text-slate-300">나의 역할</p><h2 className="mt-2 text-2xl font-bold">{liar ? '라이어' : '시민'}</h2><p className="mt-4 text-sm text-slate-300">카테고리: <strong>{assignment.category}</strong></p>{assignment.keyword ? <p className="mt-2 text-lg">키워드: <strong className="text-cyan-300">{assignment.keyword}</strong></p> : <p className="mt-2 text-slate-300">키워드는 시민에게만 공개됩니다.</p>}</div>;
}

function PlayerList({ players, playerId, connectedCount }: { players: PlayerResponse[]; playerId: string; connectedCount: number }) {
  return <div className="mt-7"><h2 className="text-lg font-semibold">참가자 {players.length}명 <span className="text-sm font-normal text-slate-400">(접속 {connectedCount}명)</span></h2><ul className="mt-3 space-y-2">{players.map((player) => <li key={player.id} className="flex items-center justify-between rounded-lg border border-slate-700 px-4 py-3"><span>{player.nickname}{player.id === playerId && <span className="ml-2 text-sm text-cyan-300">나</span>}{player.isHost && <span className="ml-2 text-sm text-amber-300">방장</span>}</span><span className={`text-sm ${player.connected ? 'text-emerald-300' : 'text-slate-500'}`}>{player.connected ? '접속 중' : '재접속 대기'}</span></li>)}</ul></div>;
}

function InviteLink({ link }: { link: string }) { return <div className="mt-7 rounded-xl bg-slate-950 p-4"><p className="text-sm text-slate-400">초대 링크</p><div className="mt-2 flex gap-2"><code className="min-w-0 flex-1 truncate text-sm text-cyan-300">{link}</code><button className="rounded-md border border-slate-600 px-3 py-1 text-sm hover:border-cyan-400" onClick={() => navigator.clipboard.writeText(link)}>복사</button></div></div>; }

function JoinForm({ nickname, setNickname, isJoining, error, onSubmit, roomId }: { nickname: string; setNickname: (value: string) => void; isJoining: boolean; error: string | null; onSubmit: (event: FormEvent<HTMLFormElement>) => void; roomId: string }) { return <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100"><form className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-7" onSubmit={onSubmit}><p className="text-sm font-semibold tracking-[0.2em] text-cyan-400">ROOM {roomId}</p><h1 className="mt-3 text-3xl font-bold">방에 참가하기</h1><p className="mt-3 text-slate-400">닉네임을 입력하면 대기실에 입장합니다.</p><input className="mt-6 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 outline-none focus:border-cyan-400" value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={20} placeholder="내 닉네임" autoFocus /><button className="mt-3 w-full rounded-lg bg-cyan-400 px-4 py-2.5 font-semibold text-slate-950 disabled:opacity-50" disabled={!nickname.trim() || isJoining} type="submit">{isJoining ? '입장 중…' : '입장하기'}</button>{error && <p className="mt-3 text-sm text-rose-400">{error}</p>}</form></main>; }

function RoomNotice({ title, description }: { title: string; description: string }) { return <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100"><section className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-7"><h1 className="text-2xl font-bold">{title}</h1><p className="mt-3 text-slate-400">{description}</p><Link className="mt-6 inline-block rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950" href="/">새 방 만들기</Link></section></main>; }

function titleFor(phase?: string) { if (phase === GAME_PHASE.DISCUSSION) return '게임이 시작되었습니다'; if (phase === GAME_PHASE.VOTING) return '라이어를 투표하세요'; if (phase === GAME_PHASE.LIAR_GUESSING) return '라이어의 마지막 기회'; if (phase === GAME_PHASE.FINISHED) return '게임 결과'; return '참가자를 기다리는 중'; }
