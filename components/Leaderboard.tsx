import React from 'react';
import { AnimatePresence } from 'framer-motion';
import LeaderboardItem from './LeaderboardItem';
import { Candidate } from '../types';

interface LeaderboardProps {
  candidates: Candidate[];
  showWinnerEffects?: boolean;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ candidates, showWinnerEffects }) => {
  // Find the highest vote count to calculate relative progress bar width
  const maxVotes = Math.max(...candidates.map(c => c.votes), 1);

  return (
    <div className="w-full max-w-3xl mx-auto">
      <ul className="flex flex-col relative space-y-2">
        <AnimatePresence>
          {candidates.map((candidate) => (
            <LeaderboardItem 
              key={candidate.id} 
              candidate={candidate} 
              maxVotes={maxVotes}
              showWinnerEffects={showWinnerEffects}
            />
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
};

export default Leaderboard;
