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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: name }),
      });
      if (!response.ok) throw new Error('작전실을 열지 못했습니다.');

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
    <main className="case-shell flex items-center justify-center p-5 sm:p-8">
      <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-sm border border-white/10 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative min-h-[31rem] overflow-hidden bg-[#d9412e] p-7 sm:p-11">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full border-[34px] border-[#f5b540] opacity-95" />
          <div className="absolute -bottom-40 -left-28 h-64 w-64 rounded-full border-[28px] border-[#17171a] opacity-90" />
          <div className="relative z-10 flex h-full flex-col justify-between">
            <p className="font-mono text-xs font-bold tracking-[0.22em] text-[#17171a]">CASE FILE · 01</p>
            <div>
              <p className="font-mono text-xs font-bold tracking-[0.2em] text-[#17171a]">WHO IS LYING?</p>
              <h1 className="mt-4 max-w-lg text-5xl font-black leading-[0.9] tracking-[-0.07em] text-[#f6efdf] sm:text-7xl">LIAR<br />GAME</h1>
              <p className="mt-7 max-w-sm text-base font-medium leading-7 text-[#2d1815]">모두가 같은 단서를 알고 있습니다.<br />단 한 명을 제외하고.</p>
            </div>
            <div className="flex items-center gap-3 font-mono text-[0.68rem] font-bold tracking-[0.12em] text-[#17171a]"><span className="h-px w-9 bg-[#17171a]" /> LIVE DEDUCTION ROOM</div>
          </div>
        </section>

        <section className="paper-card flex items-center p-7 sm:p-11">
          <div className="relative z-10 w-full">
            <p className="eyebrow">Create a private room</p>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.045em] text-[#f1eadc]">작전실 개설</h2>
            <p className="mt-3 text-sm leading-6 text-[#c8bfad]">닉네임을 정하고, 초대 링크를 팀원들에게 전달하세요.</p>
            <hr className="torn-rule mt-8" />

            <form className="mt-7 space-y-4" onSubmit={createRoom}>
              <label className="block text-sm font-bold text-[#f1eadc]" htmlFor="nickname">요원 코드명</label>
              <input id="nickname" className="case-input" value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={20} placeholder="예: 알파카" autoComplete="nickname" />
              <button className="case-button mt-2 w-full px-4 py-3" disabled={!nickname.trim() || isSubmitting} type="submit">{isSubmitting ? '작전실 여는 중…' : '새 작전실 열기 →'}</button>
              {error && <p className="text-sm font-medium text-[#ff8b7e]">{error}</p>}
            </form>

            <p className="mt-8 font-mono text-[0.65rem] leading-5 tracking-[0.08em] text-[#8f8779]">3명 이상 모이면 방장이 게임을 시작할 수 있습니다.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
