'use client';

import {
  ROOM_EVENT,
  type PlayerResponse,
  type RoomResponse,
} from '@repo/contract';
import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

const SERVER_URL = 'http://localhost:4000';
type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

interface TestUser {
  id: string;
  nickname: string;
  playerId: string;
  status: ConnectionStatus;
}

interface EventLog {
  id: string;
  at: string;
  observer: string;
  event: string;
  payload: string;
}

interface CreateRoomResult {
  room: RoomResponse;
  playerId: string;
}

interface JoinRoomResult {
  player: PlayerResponse;
}

export default function SocketTestPage() {
  const sockets = useRef(new Map<string, Socket>());
  const [room, setRoom] = useState<RoomResponse | null>(null);
  const [users, setUsers] = useState<TestUser[]>([]);
  const [logs, setLogs] = useState<EventLog[]>([]);
  const [nickname, setNickname] = useState('host');
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    sockets.current.forEach((socket) => socket.disconnect());
  }, []);

  const addLog = (observer: string, event: string, payload: unknown) => {
    setLogs((current) => [...current, {
      id: crypto.randomUUID(),
      at: new Date().toLocaleTimeString(),
      observer,
      event,
      payload: JSON.stringify(payload),
    }]);
  };

  const setUserStatus = (id: string, status: ConnectionStatus) => {
    setUsers((current) => current.map((user) => (
      user.id === id ? { ...user, status } : user
    )));
  };

  const connectUser = (user: TestUser, roomId: string) => {
    const socket = io(SERVER_URL, { autoConnect: false });
    sockets.current.set(user.id, socket);

    socket.on('connect', () => {
      setUserStatus(user.id, 'connected');
      addLog(user.nickname, 'socket:connect', { socketId: socket.id });
      socket.emit(ROOM_EVENT.JOIN, { roomId, playerId: user.playerId });
    });
    socket.on('disconnect', (reason) => {
      setUserStatus(user.id, 'disconnected');
      addLog(user.nickname, 'socket:disconnect', { reason });
    });
    [
      ROOM_EVENT.PLAYER_JOINED,
      ROOM_EVENT.PLAYER_RECONNECTED,
      ROOM_EVENT.PLAYER_DISCONNECTED,
      ROOM_EVENT.PLAYER_LEFT,
      ROOM_EVENT.CLOSED,
      ROOM_EVENT.STATE,
    ].forEach((event) => {
      socket.on(event, (payload) => addLog(user.nickname, event, payload));
    });
    socket.connect();
  };

  const startRoom = async () => {
    const trimmedNickname = nickname.trim();
    if (!trimmedNickname) return;
    setIsPreparing(true);
    setError(null);
    try {
      const response = await fetch(`${SERVER_URL}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: trimmedNickname }),
      });
      if (!response.ok) throw new Error('테스트 방을 만들 수 없습니다.');

      const result = await response.json() as CreateRoomResult;
      const host: TestUser = {
        id: crypto.randomUUID(), nickname: trimmedNickname,
        playerId: result.playerId, status: 'connecting',
      };
      setRoom(result.room);
      setUsers([host]);
      setLogs([]);
      connectUser(host, result.room.id);
      setNickname('guest');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '알 수 없는 오류');
    } finally {
      setIsPreparing(false);
    }
  };

  const addUser = async () => {
    const trimmedNickname = nickname.trim();
    if (!room || !trimmedNickname) return;
    setIsPreparing(true);
    setError(null);
    try {
      const response = await fetch(`${SERVER_URL}/rooms/${room.id}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: trimmedNickname }),
      });
      if (!response.ok) throw new Error('테스트 참가자를 추가할 수 없습니다.');

      const result = await response.json() as JoinRoomResult;
      const user: TestUser = {
        id: crypto.randomUUID(), nickname: result.player.nickname,
        playerId: result.player.id, status: 'connecting',
      };
      setUsers((current) => [...current, user]);
      connectUser(user, room.id);
      setNickname(`guest-${users.length + 1}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '알 수 없는 오류');
    } finally {
      setIsPreparing(false);
    }
  };

  const disconnectUser = (user: TestUser) => sockets.current.get(user.id)?.disconnect();
  const reconnectUser = (user: TestUser) => sockets.current.get(user.id)?.connect();

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100 sm:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <p className="text-sm font-medium text-cyan-400">LOCAL SOCKET.IO TEST</p>
          <h1 className="mt-1 text-3xl font-bold">Room 이벤트 검사기</h1>
          <p className="mt-2 text-slate-400">참가자는 각각 독립된 소켓으로 접속하며, 모든 수신 이벤트를 아래에 기록합니다.</p>
        </header>

        <section className="rounded-xl border border-slate-700 bg-slate-900 p-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 outline-none focus:border-cyan-400" value={nickname} onChange={(event) => setNickname(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && (room ? addUser() : startRoom())} placeholder="참가자 이름" />
            <button className="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50" disabled={isPreparing || !nickname.trim()} onClick={room ? addUser : startRoom}>
              {room ? '참가자 추가 후 연결' : '테스트 방 생성 후 연결'}
            </button>
          </div>
          {room && <p className="mt-3 text-sm text-slate-400">방 ID: <strong className="text-slate-100">{room.id}</strong> · 서버: {SERVER_URL}</p>}
          {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {users.map((user) => (
            <article key={user.id} className="rounded-xl border border-slate-700 bg-slate-900 p-5">
              <div className="flex items-center justify-between gap-3">
                <div><h2 className="font-semibold">{user.nickname}</h2><p className="mt-1 break-all text-xs text-slate-500">{user.playerId}</p></div>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${user.status === 'connected' ? 'bg-emerald-400/15 text-emerald-300' : user.status === 'connecting' ? 'bg-amber-400/15 text-amber-300' : 'bg-slate-700 text-slate-300'}`}>{user.status}</span>
              </div>
              <div className="mt-4 flex gap-2">
                <button className="rounded-md border border-slate-600 px-3 py-1.5 text-sm disabled:opacity-40" disabled={user.status !== 'connected'} onClick={() => disconnectUser(user)}>연결 해제</button>
                <button className="rounded-md border border-cyan-500 px-3 py-1.5 text-sm text-cyan-300 disabled:opacity-40" disabled={user.status !== 'disconnected'} onClick={() => reconnectUser(user)}>재접속</button>
              </div>
            </article>
          ))}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4"><h2 className="font-semibold">수신 이벤트 로그</h2><button className="text-sm text-slate-400 hover:text-white" onClick={() => setLogs([])}>로그 비우기</button></div>
          <div className="max-h-[28rem] overflow-auto">
            {logs.length === 0 ? <p className="p-5 text-sm text-slate-500">아직 수신한 이벤트가 없습니다.</p> : logs.map((log) => (
              <div key={log.id} className="border-b border-slate-800 px-5 py-3 font-mono text-xs"><span className="text-slate-500">{log.at}</span>{' '}<span className="text-cyan-300">[{log.observer}]</span>{' '}<span className="text-amber-300">{log.event}</span>{' '}<span className="break-all text-slate-300">{log.payload}</span></div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
