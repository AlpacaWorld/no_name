'use client';

import { GAME_PHASE, ROOM_EVENT, type PlayerResponse, type RoleAssignedPayload, type RoomResponse } from '@repo/contract';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';
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
    nextSocket.on('connect', () => { setIsConnected(true); nextSocket.emit(ROOM_EVENT.JOIN, { roomId, playerId: id }); });
    nextSocket.on('disconnect', () => setIsConnected(false));
    nextSocket.on(ROOM_EVENT.STATE, ({ room: nextRoom }: { room: RoomResponse }) => {
      setRoom(nextRoom); setClosed(false); setIsStarting(false);
      if (!nextRoom.game) { setRoleAssignment(null); setVotedFor(null); setGuess(''); }
    });
    nextSocket.on(ROOM_EVENT.CLOSED, () => { setClosed(true); setRoom(null); localStorage.removeItem(storageKey); });
    nextSocket.on(ROOM_EVENT.ROLE_ASSIGNED, (assignment: RoleAssignedPayload) => setRoleAssignment(assignment));
    nextSocket.connect();
  }, [roomId, storageKey]);

  useEffect(() => {
    const savedPlayerId = localStorage.getItem(storageKey);
    queueMicrotask(() => setPlayerId(savedPlayerId));
    fetch(`${SERVER_URL}/rooms/${roomId}`).then(async (response) => {
      if (!response.ok) throw new Error('방을 찾을 수 없습니다.');
      return response.json() as Promise<RoomResponse>;
    }).then(setRoom).catch((cause) => setError(cause instanceof Error ? cause.message : '방 정보를 불러오지 못했습니다.'));
    if (savedPlayerId) connect(savedPlayerId);
    return () => { socket.current?.disconnect(); };
  }, [connect, roomId, storageKey]);

  const joinRoom = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const name = nickname.trim(); if (!name) return;
    setIsJoining(true); setError(null);
    try {
      const response = await fetch(`${SERVER_URL}/rooms/${roomId}/players`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nickname: name }) });
      if (!response.ok) throw new Error('이 방에는 입장할 수 없습니다.');
      const { player } = await response.json() as JoinRoomResult;
      localStorage.setItem(storageKey, player.id); setPlayerId(player.id); connect(player.id);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '입장 중 오류가 발생했습니다.'); } finally { setIsJoining(false); }
  };
  const emit = (event: string, payload?: unknown) => { if (socket.current) socket.current.emit(event, payload); };
  const submitGuess = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (guess.trim()) emit(ROOM_EVENT.GUESS, { keyword: guess }); };

  if (closed) return <RoomNotice title="작전실이 폐기되었습니다" description="방장이 퇴장했거나 모든 참가자가 나갔습니다." />;
  if (!room && error) return <RoomNotice title="작전실을 찾을 수 없습니다" description={error} />;
  if (!playerId) return <JoinForm nickname={nickname} setNickname={setNickname} isJoining={isJoining} error={error} onSubmit={joinRoom} roomId={roomId} />;

  const game = room?.game;
  const isHost = room?.hostId === playerId;
  const connectedPlayerCount = room?.players.filter((player) => player.connected).length ?? 0;
  const inviteLink = typeof window === 'undefined' ? `/room/${roomId}` : window.location.href;

  return <main className="case-shell min-h-screen px-4 py-5 sm:px-7 sm:py-8"><div className="relative z-10 mx-auto max-w-6xl">
    <header className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-white/15 pb-5"><div><p className="eyebrow">Case file · room {roomId}</p><h1 className="mt-1 text-4xl font-black tracking-[-.07em] text-[#f1eadc] sm:text-5xl">{titleFor(game?.phase)}</h1></div><span className={`status-light ${isConnected ? 'online' : ''}`}>{isConnected ? '보안 연결됨' : '연결 복구 중'}</span></header>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]"><section className="paper-card min-h-[35rem] p-5 sm:p-8"><div className="relative z-10"><p className="eyebrow">Live operation {game && `· ${game.phase}`}</p>{roleAssignment && game && <RoleCard assignment={roleAssignment} />}{game && <GameControls game={game} players={room?.players ?? []} playerId={playerId} isHost={isHost} role={roleAssignment} votedFor={votedFor} guess={guess} setGuess={setGuess} onStartVoting={() => emit(ROOM_EVENT.BEGIN_VOTING)} onVote={(targetId) => { setVotedFor(targetId); emit(ROOM_EVENT.VOTE, { targetId }); }} onGuess={submitGuess} onRestart={() => emit(ROOM_EVENT.RESTART)} />}{!game && <WaitingRoom inviteLink={inviteLink} isHost={isHost} isStarting={isStarting} connectedPlayerCount={connectedPlayerCount} onStart={() => { setIsStarting(true); emit(ROOM_EVENT.START); }} />}{error && <p className="mt-5 border-l-2 border-[#e74330] pl-3 text-sm text-[#ff998c]">{error}</p>}</div></section>
    <aside className="paper-card h-fit p-5 sm:p-6"><div className="relative z-10"><p className="eyebrow">Suspect dossier</p><h2 className="mt-1 text-2xl font-black tracking-[-.05em] text-[#f1eadc]">참가 요원</h2><PlayerList players={room?.players ?? []} playerId={playerId} connectedCount={connectedPlayerCount} />{!game && <InviteLink link={inviteLink} />}</div></aside></div>
  </div></main>;
}

function WaitingRoom({ inviteLink: _inviteLink, isHost, isStarting, connectedPlayerCount, onStart }: { inviteLink: string; isHost: boolean; isStarting: boolean; connectedPlayerCount: number; onStart: () => void }) {
  void _inviteLink;
  return <section className="mt-10"><p className="eyebrow">Before the briefing</p><h2 className="mt-2 max-w-xl text-3xl font-black tracking-[-.06em] text-[#f1eadc] sm:text-4xl">용의자를 초대하고, 모두의 표정을 확인하세요.</h2><p className="mt-4 max-w-xl text-sm leading-6 text-[#c8bfad]">최소 3명의 연결된 요원이 있어야 조사를 시작할 수 있습니다. 시작 후에는 새 참가자가 입장할 수 없습니다.</p><div className="mt-8 flex flex-wrap items-center gap-4"><div className="border border-white/15 bg-black/20 px-4 py-3"><p className="font-mono text-xs font-bold tracking-wider text-[#f5b540]">CONNECTED AGENTS</p><p className="mt-1 text-3xl font-black text-[#f1eadc]">{connectedPlayerCount}<span className="ml-1 text-base text-[#c8bfad]">/ 3명 이상</span></p></div>{isHost ? <button className="case-button px-6 py-4" disabled={connectedPlayerCount < 3 || isStarting} onClick={onStart}>{isStarting ? '작전 개시 중…' : '심문을 시작한다 →'}</button> : <p className="border-l-2 border-[#f5b540] pl-3 text-sm text-[#c8bfad]">방장이 작전을 개시할 때까지 대기하세요.</p>}</div></section>;
}

function GameControls({ game, players, playerId, isHost, role, votedFor, guess, setGuess, onStartVoting, onVote, onGuess, onRestart }: { game: NonNullable<RoomResponse['game']>; players: PlayerResponse[]; playerId: string; isHost: boolean; role: RoleAssignedPayload | null; votedFor: string | null; guess: string; setGuess: (value: string) => void; onStartVoting: () => void; onVote: (targetId: string) => void; onGuess: (event: FormEvent<HTMLFormElement>) => void; onRestart: () => void }) {
  if (game.phase === GAME_PHASE.DISCUSSION) return <section className="mt-10"><p className="eyebrow">Phase 01 · statements</p><h2 className="mt-2 text-3xl font-black tracking-[-.06em] text-[#f1eadc] sm:text-4xl">서로의 말 속에서 어긋남을 찾으세요.</h2><p className="mt-4 max-w-xl text-sm leading-6 text-[#c8bfad]">키워드를 직접 말하지 말고 자연스러운 진술로 서로를 떠보세요. 라이어는 단서를 모른 채 대화에 섞여 있습니다.</p>{isHost ? <button className="case-button mt-8 px-6 py-4" onClick={onStartVoting}>익명 지목 투표를 개시한다 →</button> : <p className="mt-8 border-l-2 border-[#f5b540] pl-3 text-sm text-[#c8bfad]">방장이 진술 시간을 종료하면 투표가 시작됩니다.</p>}</section>;
  if (game.phase === GAME_PHASE.VOTING) { const voteCountByPlayer = new Map(game.voteCounts?.map(({ playerId, count }) => [playerId, count])); return <section className="mt-10"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">Phase 02 · anonymous ballot</p><h2 className="mt-2 text-3xl font-black tracking-[-.06em] text-[#f1eadc] sm:text-4xl">누가 가장 수상했습니까?</h2></div><div className="border border-[#f5b540]/40 px-3 py-2 font-mono text-sm font-bold text-[#ffd36f]">투표 {game.voteCount} / {game.playerCount}</div></div><p className="mt-4 text-sm leading-6 text-[#c8bfad]">누가 누구에게 표를 던졌는지는 공개되지 않습니다. 의심받는 정도만 실시간으로 드러납니다.</p><div className="mt-7 grid gap-3 sm:grid-cols-2">{players.map((player) => { const count = voteCountByPlayer.get(player.id) ?? 0; const selected = votedFor === player.id; return <button key={player.id} className={`flex items-center gap-4 border p-4 text-left transition ${selected ? 'border-[#e74330] bg-[#e74330]/15' : 'border-white/15 bg-black/15 hover:border-[#f5b540]/70'}`} onClick={() => onVote(player.id)}><span className={`flex h-11 w-11 items-center justify-center rounded-full font-mono text-lg font-black ${count ? 'bg-[#e74330] text-white' : 'bg-white/10 text-[#c8bfad]'}`}>{count}</span><span><b className="block text-[#f1eadc]">{player.nickname}{player.id === playerId && ' (나)'}</b><small className="mt-1 block font-mono text-[10px] tracking-wider text-[#a89f91]">{selected ? '내 표가 제출됨' : '의심 대상'}</small></span></button>; })}</div>{votedFor && <p className="mt-5 border-l-2 border-[#65d992] pl-3 text-sm text-[#aaf1c8]">당신의 표는 봉인되었습니다. 다른 요원의 선택을 기다립니다.</p>}</section>; }
  if (game.phase === GAME_PHASE.LIAR_GUESSING) return <section className="mt-10 border border-[#e74330]/50 bg-[#e74330]/10 p-5 sm:p-7"><p className="eyebrow text-[#ff998c]">Phase 03 · final statement</p><h2 className="mt-2 text-3xl font-black tracking-[-.06em] text-[#f1eadc] sm:text-4xl">라이어가 지목되었습니다.</h2>{role?.role === 'LIAR' ? <form className="mt-6 max-w-lg space-y-4" onSubmit={onGuess}><p className="text-sm leading-6 text-[#f4c4bd]">마지막 기회입니다. 시민들이 공유한 키워드를 추리해 입력하세요.</p><input className="case-input" value={guess} onChange={(event) => setGuess(event.target.value)} placeholder="키워드를 입력하세요" /><button className="case-button px-6 py-3" type="submit">최후의 답변 제출 →</button></form> : <p className="mt-5 text-sm leading-6 text-[#f4c4bd]">라이어가 키워드를 추측하고 있습니다. 상대의 마지막 답변을 지켜보세요.</p>}</section>;
  return <section className="mt-10 border border-[#f5b540]/40 bg-[#f5b540]/10 p-5 sm:p-7"><p className="eyebrow">Case closed</p><h2 className="mt-2 text-4xl font-black tracking-[-.07em] text-[#f1eadc]">{game.winner === 'LIAR' ? '라이어의 승리' : '시민의 승리'}</h2><p className="mt-5 text-sm font-bold text-[#c8bfad]">공개된 키워드</p><p className="mt-1 text-3xl font-black text-[#ffd36f]">{game.keyword}</p>{isHost ? <button className="case-button mt-8 px-6 py-4" onClick={onRestart}>같은 요원으로 재조사 →</button> : <p className="mt-8 border-l-2 border-[#f5b540] pl-3 text-sm text-[#c8bfad]">방장이 재조사를 시작하면 새 게임을 진행할 수 있습니다.</p>}</section>;
}

function RoleCard({ assignment }: { assignment: RoleAssignedPayload }) { const liar = assignment.role === 'LIAR'; return <section className={`mt-7 overflow-hidden border p-5 sm:p-7 ${liar ? 'border-[#e74330]/70 bg-[#5d1715]/35' : 'border-[#f5b540]/60 bg-[#554018]/22'}`}><p className="eyebrow">Private briefing · do not disclose</p><div className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold text-[#c8bfad]">당신의 역할</p><h2 className={`mt-1 text-5xl font-black tracking-[-.08em] ${liar ? 'text-[#ff7968]' : 'text-[#ffd36f]'}`}>{liar ? '라이어' : '시민'}</h2></div><div className="grid gap-3 border-l border-white/20 pl-4"><div><p className="font-mono text-xs font-bold text-[#c8bfad]">TOPIC</p><p className="mt-1 text-lg font-bold text-[#f1eadc]">{assignment.category}</p></div><div><p className="font-mono text-xs font-bold text-[#c8bfad]">KEYWORD</p><p className="mt-1 text-lg font-bold text-[#f1eadc]">{assignment.keyword ?? '당신만 모르는 단서입니다.'}</p></div></div></div></section>; }
function PlayerList({ players, playerId, connectedCount }: { players: PlayerResponse[]; playerId: string; connectedCount: number }) { return <div className="mt-6"><p className="text-sm text-[#c8bfad]">총 {players.length}명 · 접속 {connectedCount}명</p><ol className="mt-3 space-y-2">{players.map((player, index) => <li key={player.id} className="flex items-center gap-3 border border-white/10 bg-black/15 px-3 py-3"><span className="font-mono text-xs text-[#a89f91]">{String(index + 1).padStart(2, '0')}</span><span className={`h-2 w-2 rounded-full ${player.connected ? 'bg-[#65d992]' : 'bg-[#706b64]'}`} /><span className="min-w-0 flex-1 truncate text-sm font-bold text-[#f1eadc]">{player.nickname}{player.id === playerId && <small className="ml-2 text-[#f5b540]">나</small>}</span>{player.isHost && <span className="font-mono text-[10px] font-bold tracking-wider text-[#f5b540]">HOST</span>}</li>)}</ol></div>; }
function InviteLink({ link, className = '' }: { link: string; className?: string }) { return <section className={`mt-8 ${className}`}><hr className="torn-rule" /><p className="mt-5 font-mono text-xs font-bold tracking-wider text-[#f5b540]">ENCRYPTED INVITATION LINK</p><div className="mt-2 flex gap-2 border border-white/15 bg-black/25 p-3"><code className="min-w-0 flex-1 truncate text-xs text-[#d8cfbd]">{link}</code><button className="ghost-button px-2 text-xs" onClick={() => navigator.clipboard.writeText(link)}>복사</button></div></section>; }
function JoinForm({ nickname, setNickname, isJoining, error, onSubmit, roomId }: { nickname: string; setNickname: (value: string) => void; isJoining: boolean; error: string | null; onSubmit: (event: FormEvent<HTMLFormElement>) => void; roomId: string }) { return <main className="case-shell flex min-h-screen items-center justify-center p-5"><form className="paper-card relative z-10 w-full max-w-md p-7 sm:p-10" onSubmit={onSubmit}><p className="eyebrow">Secure entry · {roomId}</p><h1 className="mt-3 text-4xl font-black tracking-[-.06em] text-[#f1eadc]">작전실 입장</h1><p className="mt-3 text-sm text-[#c8bfad]">참가자에게 보여질 코드명을 등록하세요.</p><input className="case-input mt-7" value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={20} placeholder="요원 코드명" autoFocus /><button className="case-button mt-3 w-full px-4 py-3" disabled={!nickname.trim() || isJoining} type="submit">{isJoining ? '신원 확인 중…' : '작전실에 합류하기 →'}</button>{error && <p className="mt-3 text-sm text-[#ff998c]">{error}</p>}</form></main>; }
function RoomNotice({ title, description }: { title: string; description: string }) { return <main className="case-shell flex min-h-screen items-center justify-center p-5"><section className="paper-card relative z-10 w-full max-w-md p-8"><p className="eyebrow">Connection report</p><h1 className="mt-3 text-3xl font-black tracking-[-.06em] text-[#f1eadc]">{title}</h1><p className="mt-4 text-sm text-[#c8bfad]">{description}</p><Link className="case-button mt-7 inline-block px-5 py-3" href="/">새 작전실 열기</Link></section></main>; }
function titleFor(phase?: string) { if (phase === GAME_PHASE.DISCUSSION) return '진술 분석 중'; if (phase === GAME_PHASE.VOTING) return '익명 지목 투표'; if (phase === GAME_PHASE.LIAR_GUESSING) return '최후의 진술'; if (phase === GAME_PHASE.FINISHED) return '사건 종결'; return '비공개 작전 대기실'; }
