import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Candidate, Config } from './types';
import LeaderboardView from './components/LeaderboardView';
import VotingView from './components/VotingView';
import AdminView from './components/AdminView';
import { api } from './client';

// --- Components ---

const CountdownTimer: React.FC<{ remaining: number; fadeOut?: boolean }> = ({ remaining, fadeOut }) => {
  // if (remaining <= 0) return null; // Always show if parent renders it
  const safeRemaining = Math.max(0, remaining);
  const mins = Math.floor(safeRemaining / 60);
  const secs = safeRemaining % 60;
  return (
    <div
      className="fixed top-4 right-4 z-50 bg-black/80 text-white px-4 py-2 rounded-lg font-mono text-xl shadow-lg border border-white/20"
      style={{
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 6s ease'
      }}
    >
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </div>
  );
};

const BreathingBorder: React.FC<{ remaining: number; total: number }> = ({ remaining, total }) => {
  if (total <= 0) return null;

  const lastColorRef = useRef<string>('#22c55e');
  const [fadeOut, setFadeOut] = useState(false);

  const percentage = total > 0 ? remaining / total : 0;
  
  // Color transition logic (using CSS transition for smoothness instead of just state jump)
  let color = '#22c55e'; // Green
  if (percentage < 0.25) color = '#ef4444'; // Red
  else if (percentage < 0.5) color = '#f97316'; // Orange
  else if (percentage < 0.75) color = '#eab308'; // Yellow
  else if (percentage < 0.9) color = '#06b6d4'; // Cyan

  useEffect(() => {
    if (remaining > 0) {
      lastColorRef.current = color;
      setFadeOut(false);
    } else {
      setFadeOut(true);
    }
  }, [remaining, color]);

  // Speed transition logic: 2s -> 0.5s
  const speed = 0.5 + (1.5 * percentage);

  if (remaining <= 0) {
    return (
      <div
        className="fixed inset-0 pointer-events-none z-[100]"
        style={{
          boxShadow: `inset 0 0 100px 40px ${lastColorRef.current}`,
          opacity: fadeOut ? 0 : 0.9,
          transition: 'opacity 6s ease'
        }}
      />
    );
  }

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-[100]"
      style={{
        // Remove hard border, use large inset shadow
        boxShadow: `inset 0 0 75px 25px ${color}`,
        // Add transition to color changes to make them "natural"
        transition: 'box-shadow 1s linear', 
        animation: `breathing ${speed}s ease-in-out infinite alternate`,
      } as React.CSSProperties}
    />
  );
};

// --- Global Layout with Countdown ---
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<Config | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [dismissedCountdownEndAt, setDismissedCountdownEndAt] = useState<number | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const finishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishingEndAtRef = useRef<number | null>(null);
  const location = useLocation();
  const isLeaderboard = location.pathname === '/leaderboard' || location.pathname === '/screen';

  useEffect(() => {
    let cancelled = false;
    let failures = 0;
    let delayMs = 1000;

    const tick = async () => {
      if (cancelled) return;
      try {
        const { config: newConfig } = await api.getConfig();
        setConfig(newConfig);
        failures = 0;
        delayMs = 1000;
      } catch (e) {
        failures += 1;
        delayMs = Math.min(8000, 1000 * Math.pow(2, Math.min(3, failures)));
      } finally {
        if (!cancelled) setTimeout(tick, delayMs);
      }
    };

    tick();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(interval);
  }, []);

  const derivedRemainingSeconds = (() => {
    if (!config) return 0;
    if (config.countdown_end_at <= 0) return 0;
    const diffMs = config.countdown_end_at - nowMs;
    return Math.max(0, Math.ceil(diffMs / 1000));
  })();

  useEffect(() => {
    if (!config) return;

    if (config.countdown_end_at <= 0) {
      if (finishTimeoutRef.current) {
        clearTimeout(finishTimeoutRef.current);
        finishTimeoutRef.current = null;
      }
      finishingEndAtRef.current = null;
      setIsFinishing(false);
      setDismissedCountdownEndAt(null);
      return;
    }

    if (derivedRemainingSeconds > 0) {
      if (finishTimeoutRef.current) {
        clearTimeout(finishTimeoutRef.current);
        finishTimeoutRef.current = null;
      }
      finishingEndAtRef.current = null;
      setIsFinishing(false);
      if (dismissedCountdownEndAt === config.countdown_end_at) {
        setDismissedCountdownEndAt(null);
      }
      return;
    }

    if (finishingEndAtRef.current === config.countdown_end_at) return;

    if (finishTimeoutRef.current) {
      clearTimeout(finishTimeoutRef.current);
      finishTimeoutRef.current = null;
    }

    finishingEndAtRef.current = config.countdown_end_at;
    setIsFinishing(true);
    const endedAt = config.countdown_end_at;
    finishTimeoutRef.current = setTimeout(() => {
      setDismissedCountdownEndAt(endedAt);
      setIsFinishing(false);
      finishTimeoutRef.current = null;
    }, 6500);
  }, [config, dismissedCountdownEndAt, derivedRemainingSeconds]);

  const shouldShowCountdownUi =
    !!config && config.countdown_end_at > 0 && config.countdown_end_at !== dismissedCountdownEndAt;

  return (
    <>
      <style>{`
        @keyframes breathing {
          from { opacity: 0.5; transform: scale(1); }
          to { opacity: 0.9; transform: scale(1); }
        }
        @keyframes goldShimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        .gold-shimmer-border {
          background: linear-gradient(90deg, rgba(250, 204, 21, 0.25), rgba(245, 158, 11, 0.9), rgba(250, 204, 21, 0.25));
          background-size: 200% 100%;
          animation: goldShimmer 2.8s linear infinite;
        }
        @keyframes confettiFly {
          0% { opacity: 0; transform: translate3d(0, 0, 0) rotate(0deg); }
          15% { opacity: 0.9; }
          100% { opacity: 0; transform: translate3d(24px, 18px, 0) rotate(140deg); }
        }
        .first-confetti {
          position: absolute;
          width: 18px;
          height: 3px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(253, 230, 138, 1), rgba(245, 158, 11, 1));
          opacity: 0;
          animation: confettiFly 1.9s ease-in-out infinite;
          filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.35));
        }
      `}</style>
      
      {shouldShowCountdownUi && (
        <>
          {isLeaderboard && (
            <BreathingBorder 
              remaining={derivedRemainingSeconds} 
              total={config.countdown_duration_seconds || 120} 
            />
          )}
          {!isLeaderboard && <CountdownTimer remaining={derivedRemainingSeconds} fadeOut={isFinishing} />}
        </>
      )}
      
      {children}
    </>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/vote" replace />} />
          <Route path="/vote" element={<VotingPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/screen" element={<LeaderboardPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
};

// --- Page Components ---

const VotingPage: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [voteLimit, setVoteLimit] = useState(1);
  const [votingEnabled, setVotingEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { candidates, config } = await api.getPrograms();
        setCandidates(candidates);
        setVoteLimit(config.vote_count_limit);
        setVotingEnabled(config.voting_enabled);
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
  if (error) return (
      <div className="p-8 text-center text-red-500 flex flex-col gap-2">
          <p className="font-bold">无法加载节目数据</p>
          <p className="text-sm">错误详情: {error}</p>
          <p className="text-xs text-slate-400">请检查网络连接或联系管理员</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-blue-100 text-blue-600 rounded">
              重试
          </button>
      </div>
  );

  return <VotingView candidates={candidates} voteLimit={voteLimit} votingEnabled={votingEnabled} onVote={handleVote} />;
};

const LeaderboardPage: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const prevRanksRef = useRef<Map<string, number>>(new Map());
  const [showWinnerEffects, setShowWinnerEffects] = useState(false);
  const [countdownEndAt, setCountdownEndAt] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(interval);
  }, []);

  const remainingSeconds =
    countdownEndAt > 0 ? Math.max(0, Math.ceil((countdownEndAt - nowMs) / 1000)) : 0;

  useEffect(() => {
    let cancelled = false;
    let failures = 0;
    let delayMs = 2000;

    const tick = async () => {
      if (cancelled) return;
      try {
        const { candidates: rawCandidates, config } = await api.getPrograms();
        setCountdownEndAt(config.countdown_end_at);
        const sorted = [...rawCandidates].sort((a, b) => b.votes - a.votes);
        const total = sorted.reduce((acc, c) => acc + c.votes, 0);
        setTotalVotes(total);

        const previous = prevRanksRef.current;
        const rankedCandidates = sorted.map((c, index) => {
          const currentRank = index + 1;
          const previousRank = previous.get(c.id) || currentRank;
          return { ...c, currentRank, previousRank };
        });
        prevRanksRef.current = new Map(rankedCandidates.map((c) => [c.id, c.currentRank]));

        setCandidates(rankedCandidates);
        setShowWinnerEffects(config.countdown_end_at > 0 && config.countdown_end_at <= Date.now());
        failures = 0;
        delayMs = 2000;
      } catch (e) {
        failures += 1;
        delayMs = Math.min(8000, 2000 * Math.pow(2, Math.min(3, failures)));
      } finally {
        if (!cancelled) setTimeout(tick, delayMs);
      }
    };

    tick();
    return () => {
      cancelled = true;
    };
  }, []);

  const voteUrl = typeof window !== 'undefined' ? `${window.location.origin}/vote` : '/vote';
  return (
    <LeaderboardView
      candidates={candidates}
      totalVotes={totalVotes}
      showWinnerEffects={showWinnerEffects}
      countdownEndAt={countdownEndAt}
      remainingSeconds={remainingSeconds}
      voteUrl={voteUrl}
    />
  );
};

const AdminPage: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [voteLimit, setVoteLimit] = useState(1);
  const [votingEnabled, setVotingEnabled] = useState(true);
  const [countdownDuration, setCountdownDuration] = useState(120);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.login(password);
      setIsAuthenticated(true);
      fetchData();
    } catch (err: any) {
      console.error('Login Error:', err);
      // Distinguish between network errors and actual auth failure
      if (err.message === 'Login failed' || err.message === '密码错误') {
          alert('密码错误，请重试');
      } else {
          alert(`连接服务器失败: ${err.message || '未知错误'}`);
      }
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
      setVotingEnabled(config.voting_enabled);
      setCountdownDuration(config.countdown_duration_seconds);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateVoteLimit = async (limit: number) => {
      await api.updateSettings(limit, votingEnabled, countdownDuration);
      setVoteLimit(limit);
  };

  const handleToggleVoting = async (enabled: boolean) => {
      await api.updateSettings(voteLimit, enabled, countdownDuration);
      setVotingEnabled(enabled);
  };
  
  const handleUpdateCountdown = async (duration: number) => {
      await api.updateSettings(voteLimit, votingEnabled, duration);
      setCountdownDuration(duration);
  };
  
  const handleStartVote = async () => {
      await api.startVote();
      fetchData();
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
      votingEnabled={votingEnabled}
      countdownDuration={countdownDuration}
      onUpdateVoteLimit={handleUpdateVoteLimit}
      onToggleVoting={handleToggleVoting}
      onUpdateCountdown={handleUpdateCountdown}
      onStartVote={handleStartVote}
      onReset={handleReset}
      onUpdateCandidate={() => {}} // Not implemented in backend yet
      onAddCandidate={handleAddCandidate}
      onDeleteCandidate={handleDeleteCandidate}
    />
  );
};

export default App;
