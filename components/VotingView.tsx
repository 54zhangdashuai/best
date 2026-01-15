import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Vote, CheckCircle2, Mic2, AlertCircle } from 'lucide-react';
import { Candidate } from '../types';

interface VotingViewProps {
  candidates: Candidate[];
  voteLimit: number;
  votingEnabled: boolean;
  onVote: (ids: string[]) => Promise<void>;
}

const VotingView: React.FC<VotingViewProps> = ({ candidates, voteLimit, votingEnabled, onVote }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSelection = (id: string) => {
    if (!votingEnabled) return; // Prevent selection if voting is disabled

    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(pid => pid !== id));
    } else {
      if (selectedIds.length < voteLimit) {
        setSelectedIds(prev => [...prev, id]);
      } else {
        // Optional: Replace last selection or just ignore?
        // Let's just ignore/shake or show warning if they try to select more than limit
        // But for UX, usually we just don't add it.
      }
    }
  };

  const handleSubmit = async () => {
    if (selectedIds.length !== voteLimit) {
      setError(`请选择 ${voteLimit} 个节目`);
      setTimeout(() => setError(null), 2000);
      return;
    }

    setIsSubmitting(true);
    try {
      await onVote(selectedIds);
      setSuccess(true);
      setSelectedIds([]);
      // Success message stays for a while or redirects?
    } catch (err: any) {
      setError(err.message || '投票失败');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sort candidates by ID for consistent display
  const displayList = [...candidates].sort((a, b) => parseInt(a.id) - parseInt(b.id));

  if (success) {
      return (
          <div className="min-h-screen bg-emerald-50 flex flex-col items-center justify-center p-6 text-center">
              <motion.div 
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center max-w-sm w-full"
              >
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4 text-emerald-600">
                      <CheckCircle2 size={40} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">投票成功!</h2>
                  <p className="text-slate-500 mb-6">感谢您的参与，请关注大屏查看实时结果。</p>
                  <div className="text-sm text-slate-400">只能投一次哦</div>
              </motion.div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-32">
      {/* Mobile Header */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        {!votingEnabled && (
            <div className="bg-red-500 text-white text-center py-2 text-sm font-bold animate-pulse">
                投票通道已暂时关闭
            </div>
        )}
        <div className="px-4 py-4">
            <h1 className="text-xl font-bold text-slate-900 text-center">年会节目投票</h1>
            <p className="text-xs text-slate-500 text-center mt-1">
                请选择 <span className="font-bold text-blue-600">{voteLimit}</span> 个最喜爱的节目
            </p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-md mt-6">
        <div className="grid gap-3">
          {displayList.map((candidate) => {
            const isSelected = selectedIds.includes(candidate.id);
            return (
            <motion.div 
              key={candidate.id}
              whileTap={votingEnabled ? { scale: 0.98 } : {}}
              onClick={() => toggleSelection(candidate.id)}
              className={`
                p-4 rounded-xl border shadow-sm flex items-center justify-between relative overflow-hidden transition-all
                ${!votingEnabled ? 'opacity-60 grayscale cursor-not-allowed bg-slate-100' : 'cursor-pointer'}
                ${isSelected ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-slate-200'}
              `}
            >
              {/* Color Stripe */}
              <div 
                className="absolute left-0 top-0 bottom-0 w-1.5"
                style={{ backgroundColor: candidate.color }}
              />

              <div className="flex-1 min-w-0 pl-3">
                <h3 className={`font-bold text-lg leading-tight mb-1 ${isSelected ? 'text-blue-800' : 'text-slate-900'}`}>
                    {candidate.handle}
                </h3>
                <div className="flex items-center text-slate-500 text-sm">
                   <Mic2 size={12} className="mr-1" />
                   <span className="truncate">{candidate.name}</span>
                </div>
              </div>

              <div className={`
                w-6 h-6 rounded-full border-2 flex items-center justify-center ml-4 transition-colors
                ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}
              `}>
                  {isSelected && <CheckCircle2 size={14} className="text-white" />}
              </div>
            </motion.div>
          )})}
        </div>
      </div>
      
      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-30">
          <div className="max-w-md mx-auto flex items-center gap-4">
            <div className="flex-1 text-sm text-slate-600">
                已选: <span className="font-bold text-slate-900">{selectedIds.length}</span> / {voteLimit}
            </div>
            <button
                disabled={!votingEnabled || selectedIds.length !== voteLimit || isSubmitting}
                onClick={handleSubmit}
                className={`
                    flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all
                    ${votingEnabled && selectedIds.length === voteLimit && !isSubmitting
                        ? 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-blue-200' 
                        : 'bg-slate-300 cursor-not-allowed'}
                `}
            >
                {isSubmitting ? '提交中...' : (votingEnabled ? '确认投票' : '暂停投票')}
                <Vote size={18} />
            </button>
          </div>
      </div>

      {/* Error Toast */}
      <AnimatePresence>
        {error && (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-50 text-sm font-medium"
            >
                <AlertCircle size={16} />
                {error}
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VotingView;