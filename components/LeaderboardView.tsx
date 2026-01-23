import React from 'react';
import { BarChart3, Zap } from 'lucide-react';
import Leaderboard from './Leaderboard';
import { Candidate } from '../types';
import voteQr from '../photo/vote.png';

interface LeaderboardViewProps {
  candidates: Candidate[];
  totalVotes: number;
  showWinnerEffects?: boolean;
  countdownEndAt: number;
  remainingSeconds: number;
  voteUrl: string;
}

const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  candidates,
  totalVotes,
  showWinnerEffects,
  countdownEndAt,
  remainingSeconds,
  voteUrl
}) => {
  const safeRemaining = Math.max(0, remainingSeconds);
  const mins = Math.floor(safeRemaining / 60);
  const secs = safeRemaining % 60;
  const hasStarted = countdownEndAt > 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-100/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-100/40 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto w-full px-6 py-8 max-w-[1400px]">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          <div className="w-full">
            <div className="flex items-center justify-between mb-8 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-xl text-blue-600 border border-blue-100">
                  <BarChart3 size={24} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">总票数统计</span>
                  <span className="text-3xl font-mono font-bold text-slate-900 tabular-nums leading-none mt-1">
                    {totalVotes.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-sm font-bold tracking-wide">是为科技年会最佳节目实时投票系统</span>
              </div>
            </div>

            <Leaderboard candidates={candidates} showWinnerEffects={showWinnerEffects} />

            <div className="mt-12 text-center opacity-60">
              <p className="text-slate-400 text-xs flex items-center justify-center gap-2 font-medium">
                <Zap size={12} />
                是为科技年会最佳节目实时投票系统 (NebulaVote)
              </p>
            </div>
          </div>

          <div className="w-full lg:sticky lg:top-6">
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-baseline justify-between">
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">投票倒计时</div>
                {hasStarted && safeRemaining === 0 && (
                  <div className="text-xs font-bold text-rose-600">投票已结束</div>
                )}
                {!hasStarted && <div className="text-xs font-bold text-slate-400">未开始</div>}
              </div>

              <div className="mt-3 font-mono font-bold text-slate-900 tabular-nums text-5xl leading-none">
                {hasStarted ? `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}` : '--:--'}
              </div>

              <div className="mt-6 border-t border-slate-100 pt-6">
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">扫码投票</div>
                <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <img src={voteQr} alt="投票二维码" className="w-full h-auto rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardView;
