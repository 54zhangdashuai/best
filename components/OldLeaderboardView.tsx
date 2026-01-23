import React from 'react';
import { BarChart3, Zap } from 'lucide-react';
import Leaderboard from './Leaderboard';
import { Candidate } from '../types';

interface OldLeaderboardViewProps {
  candidates: Candidate[];
  totalVotes: number;
  showWinnerEffects?: boolean;
}

const OldLeaderboardView: React.FC<OldLeaderboardViewProps> = ({ candidates, totalVotes, showWinnerEffects }) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
      {/* Decorative background gradients */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-100/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-100/40 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        
        {/* Header Stats Bar */}
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

        {/* Main List */}
        <Leaderboard candidates={candidates} showWinnerEffects={showWinnerEffects} />

        {/* Footer */}
        <div className="mt-12 text-center opacity-60">
            <p className="text-slate-400 text-xs flex items-center justify-center gap-2 font-medium">
              <Zap size={12} />
              是为科技年会最佳节目实时投票系统 (NebulaVote)
            </p>
        </div>
      </div>
    </div>
  );
};

export default OldLeaderboardView;
