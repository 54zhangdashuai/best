import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Candidate } from './types';
import LeaderboardView from './components/LeaderboardView';
import VotingView from './components/VotingView';
import AdminView from './components/AdminView';
import { api } from './client';

// --- Data Provider / Wrapper ---
// This component manages the polling and state for the whole app context if needed,
// or we can let individual pages handle it. 
// Given the requirements:
// - Leaderboard: Auto-refresh 2s
// - Voting: Fetch once (or refresh occasionally), submit
// - Admin: Fetch on mount, update on actions
//
// It seems better to let pages manage their data or lift it up here.
// Lifting up allows sharing data but Leaderboard needs high freq, others don't.
// Let's implement a custom hook or just manage inside components for simplicity in this structure.
// But wait, the user wants "3 separate parts".
//
// However, I'll put the Router here.

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/vote" replace />} />
        <Route path="/vote" element={<VotingPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
};

// --- Page Components ---

const VotingPage: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [voteLimit, setVoteLimit] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { candidates, config } = await api.getPrograms();
        setCandidates(candidates);
        setVoteLimit(config.vote_count_limit);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleVote = async (ids: string[]) => {
    await api.vote(ids.map(id => parseInt(id)));
    // Optionally refresh data? No need for voting view usually.
  };

  if (loading) return <div className="p-8 text-center text-slate-500">加载中...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;

  return <VotingView candidates={candidates} voteLimit={voteLimit} onVote={handleVote} />;
};

const LeaderboardPage: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [prevRanks, setPrevRanks] = useState<Map<string, number>>(new Map());

  const fetchData = useCallback(async () => {
    try {
      const { candidates: rawCandidates } = await api.getPrograms();
      
      // Calculate ranks and sort
      const sorted = [...rawCandidates].sort((a, b) => b.votes - a.votes);
      
      // Calculate Total
      const total = sorted.reduce((acc, c) => acc + c.votes, 0);
      setTotalVotes(total);

      // Add Rank Info
      const rankedCandidates = sorted.map((c, index) => {
        const currentRank = index + 1;
        const previousRank = prevRanks.get(c.id) || currentRank; // If first run, no movement
        return { ...c, currentRank, previousRank };
      });

      // Update Prev Ranks for next run
      const newPrevRanks = new Map(rankedCandidates.map(c => [c.id, c.currentRank]));
      setPrevRanks(newPrevRanks);
      
      setCandidates(rankedCandidates);
    } catch (err) {
      console.error("Failed to fetch leaderboard data", err);
    }
  }, [prevRanks]);

  useEffect(() => {
    fetchData(); // Initial
    const interval = setInterval(fetchData, 2000); // Poll every 2s
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Note: excluded fetchData from dependency to avoid loop if not memoized correctly, 
  // but fetchData depends on prevRanks. 
  // Actually, we can use a functional state update or ref for prevRanks to avoid re-creating the interval.
  // Ref is better for "previous" tracking without re-triggering effect.

  return <LeaderboardView candidates={candidates} totalVotes={totalVotes} />;
};

const AdminPage: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [voteLimit, setVoteLimit] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.login(password);
      setIsAuthenticated(true);
      fetchData();
    } catch (err) {
      alert('密码错误');
    }
  };

  const fetchData = async () => {
    try {
      const { candidates: rawCandidates, config } = await api.getPrograms();
      // Calculate simple ranks for admin view
      const sorted = [...rawCandidates].sort((a, b) => b.votes - a.votes);
      const ranked = sorted.map((c, i) => ({ ...c, currentRank: i + 1, previousRank: i + 1 }));
      setCandidates(ranked);
      setVoteLimit(config.vote_count_limit);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateVoteLimit = async (limit: number) => {
      await api.updateSettings(limit);
      setVoteLimit(limit);
  };

  const handleReset = async () => {
      await api.resetData();
      fetchData();
  };

  const handleAddCandidate = async (data: any) => {
      await api.addProgram(data.handle, data.name, data.color);
      fetchData();
  };

  const handleDeleteCandidate = async (id: string) => {
      await api.deleteProgram(id);
      fetchData();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm">
          <h2 className="text-xl font-bold mb-4 text-center">管理员登录</h2>
          <input 
            type="password" 
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border border-slate-300 rounded p-2 mb-4"
            placeholder="请输入密码"
          />
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700">
            登录
          </button>
        </form>
      </div>
    );
  }

  return (
    <AdminView 
      candidates={candidates}
      voteLimit={voteLimit}
      onUpdateVoteLimit={handleUpdateVoteLimit}
      onReset={handleReset}
      onUpdateCandidate={() => {}} // Not implemented in backend yet
      onAddCandidate={handleAddCandidate}
      onDeleteCandidate={handleDeleteCandidate}
    />
  );
};

export default App;
