import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, Minus, Trophy } from 'lucide-react';
import { Candidate } from '../types';

interface LeaderboardItemProps {
  candidate: Candidate;
  maxVotes: number;
}

const LeaderboardItem: React.FC<LeaderboardItemProps> = ({ candidate, maxVotes }) => {
  const { name, handle, votes, color, previousRank, currentRank } = candidate;

  // Calculate rank change
  const rankChange = previousRank - currentRank; // Positive means moved up (e.g. 5 -> 3)
  
  // Progress bar percentage
  const percentage = maxVotes > 0 ? (votes / maxVotes) * 100 : 0;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 30,
        mass: 1
      }}
      className="relative group"
    >
      {/* Background Card - White, clean shadow, border */}
      <div className="relative flex items-center p-4 mb-3 overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md hover:border-blue-200">
        
        {/* Progress Bar Background (Subtle) */}
        <div 
          className="absolute left-0 top-0 bottom-0 opacity-[0.07] transition-all duration-700 ease-out"
          style={{ 
            width: `${percentage}%`,
            background: `linear-gradient(90deg, ${color}, ${color})`
          }} 
        />
        
        {/* Rank Indicator Section */}
        <div className="flex flex-col items-center justify-center w-14 mr-2 shrink-0 gap-1">
          {currentRank <= 3 ? (
            <div className={`relative flex items-center justify-center w-10 h-10 rounded-full shadow-sm ${
              currentRank === 1 ? 'bg-yellow-50 text-yellow-600 ring-1 ring-yellow-200' :
              currentRank === 2 ? 'bg-slate-50 text-slate-600 ring-1 ring-slate-200' :
              'bg-orange-50 text-orange-600 ring-1 ring-orange-200'
            }`}>
              <Trophy size={18} fill="currentColor" className="opacity-90" />
            </div>
          ) : (
            <span className="text-xl font-bold text-slate-400 font-mono">#{currentRank}</span>
          )}
          
          {/* Rank Change Indicator (Moved here from Avatar) */}
          <div className="flex items-center justify-center h-4">
             {rankChange > 0 ? (
               <div className="flex items-center text-emerald-500 text-[10px] font-bold">
                 <ArrowUp size={10} strokeWidth={3} />
                 <span>{rankChange}</span>
               </div>
             ) : rankChange < 0 ? (
               <div className="flex items-center text-rose-500 text-[10px] font-bold">
                 <ArrowDown size={10} strokeWidth={3} />
                 <span>{Math.abs(rankChange)}</span>
               </div>
             ) : (
               <Minus size={10} className="text-slate-300" />
             )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 z-10 pl-2 border-l border-slate-100">
          <div className="flex flex-col justify-center">
            <h3 className="text-lg font-bold text-slate-900 truncate tracking-tight">{handle}</h3>
            <span className="text-sm font-medium text-slate-500 truncate mt-0.5">{name}</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 mt-2 rounded-full overflow-hidden">
             <motion.div 
               className="h-full rounded-full"
               style={{ backgroundColor: color }}
               initial={{ width: 0 }}
               animate={{ width: `${percentage}%` }}
               transition={{ duration: 1, ease: "easeOut" }}
             />
          </div>
        </div>

        {/* Vote Count */}
        <div className="ml-4 flex flex-col items-end shrink-0 z-10">
            <motion.span 
              key={votes} // Trigger animation on number change
              initial={{ scale: 1.2, color: '#3b82f6' }}
              animate={{ scale: 1, color: '#1e293b' }}
              className="text-2xl font-bold font-mono tracking-tighter"
            >
              {votes.toLocaleString()}
            </motion.span>
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">票数</span>
        </div>
      </div>
    </motion.li>
  );
};

export default LeaderboardItem;