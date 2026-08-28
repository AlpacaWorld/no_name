'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

const SERVER_URL = 'http://localhost:4000';

interface CreateRoomResult {
  room: { id: string };
  playerId: string;
}

export default function Home() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createRoom = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = nickname.trim();
    if (!name) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch(`${SERVER_URL}/rooms`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: name }),
      });
      if (!response.ok) throw new Error('방을 만들지 못했습니다.');

      const { room, playerId } = await response.json() as CreateRoomResult;
      localStorage.setItem(`liar:room:${room.id}:player-id`, playerId);
      router.push(`/room/${room.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
      <section className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-7 shadow-2xl shadow-cyan-950/30">
        <p className="text-sm font-semibold tracking-[0.22em] text-cyan-400">LIAR GAME</p>
        <h1 className="mt-3 text-3xl font-bold">친구들과 라이어 게임</h1>
        <p className="mt-3 leading-6 text-slate-400">방을 만들고 링크를 공유해 바로 시작하세요.</p>
        <form className="mt-8 space-y-3" onSubmit={createRoom}>
          <label className="block text-sm font-medium" htmlFor="nickname">내 닉네임</label>
          <input id="nickname" className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 outline-none transition focus:border-cyan-400" value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={20} placeholder="예: 알파카" autoComplete="nickname" />
          <button className="w-full rounded-lg bg-cyan-400 px-4 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50" disabled={!nickname.trim() || isSubmitting} type="submit">{isSubmitting ? '방 만드는 중…' : '방 만들기'}</button>
          {error && <p className="text-sm text-rose-400">{error}</p>}
        </form>
      </section>
    </main>
  );
}
