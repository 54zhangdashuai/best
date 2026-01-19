import { Candidate, Config } from './types';

// Use relative path for production (handled by Nginx proxy)
// For local dev with Vite proxy, this also works if configured.
// Or we can check environment.
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const safeLocalStorageGet = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeLocalStorageSet = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

const fetchJson = async (input: RequestInfo | URL, init?: RequestInit) => {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch (err: any) {
    throw new Error(err?.message || 'Failed to fetch');
  }

  const rawText = await response.text();
  const contentType = response.headers.get('content-type') || '';

  let parsed: any = null;
  if (contentType.includes('application/json')) {
    try {
      parsed = rawText ? JSON.parse(rawText) : null;
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const messageFromJson = parsed?.message;
    const message =
      messageFromJson ||
      (rawText ? rawText.slice(0, 200) : '') ||
      `HTTP ${response.status}`;
    throw new Error(message);
  }

  if (contentType.includes('application/json')) {
    if (parsed == null) {
      throw new Error('服务器返回了非 JSON 数据');
    }
    return parsed;
  }

  return rawText;
};

export const api = {
  // Get Programs (Candidates) and Config
  getPrograms: async (): Promise<{ candidates: Candidate[], config: Config }> => {
    const json = await fetchJson(`${API_BASE_URL}/programs`);
    
    // Map backend data to frontend Candidate interface
    const candidates = json.data.programs.map((p: any) => ({
      id: p.id.toString(),
      name: p.performer,
      handle: p.title,
      votes: p.vote_count,
      color: p.color || '#3b82f6',
      previousRank: 0, // Will be calculated in frontend
      currentRank: 0   // Will be calculated in frontend
    }));

    return { candidates, config: json.data.config };
  },

  // Batch Vote
  vote: async (programIds: number[]) => {
    // Generate or retrieve a unique Client ID for this browser
    let clientId: string | null = null;
    try {
      clientId = localStorage.getItem('vote_client_id');
    } catch (e) {
      console.error('Failed to access localStorage:', e);
    }

    if (!clientId) {
      // Use slice instead of deprecated substr, and ensure string concatenation
      clientId = 'client_' + Math.random().toString(36).slice(2) + Date.now().toString();
      try {
        localStorage.setItem('vote_client_id', clientId);
      } catch (e) {
        console.error('Failed to write to localStorage:', e);
      }
    }

    const json = await fetchJson(`${API_BASE_URL}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ programIds, clientId })
    });
    return json;
  },

  // Admin Login
  login: async (password: string) => {
    const json = await fetchJson(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    
    // Store token
    if (json.token) {
        safeLocalStorageSet('admin_token', json.token);
    }
    
    return json;
  },

  // Admin: Update Settings
  updateSettings: async (vote_count_limit: number, voting_enabled?: boolean, countdown_duration_seconds?: number) => {
    const token = safeLocalStorageGet('admin_token');
    const json = await fetchJson(`${API_BASE_URL}/admin/settings`, {
      method: 'POST',
      headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ vote_count_limit, voting_enabled, countdown_duration_seconds })
    });
    return json;
  },

  // Admin: Start Vote (Countdown)
  startVote: async () => {
    const token = safeLocalStorageGet('admin_token');
    const json = await fetchJson(`${API_BASE_URL}/admin/start_vote`, {
      method: 'POST',
      headers: { 
          'Authorization': `Bearer ${token}`
      }
    });
    return json;
  },

  // Admin: Reset Data
  resetData: async () => {
    const token = safeLocalStorageGet('admin_token');
    const json = await fetchJson(`${API_BASE_URL}/admin/reset`, {
      method: 'POST',
      headers: {
          'Authorization': `Bearer ${token}`
      }
    });
    return json;
  },
  
  // Admin: Add Program
  addProgram: async (title: string, performer: string, color: string) => {
      const token = safeLocalStorageGet('admin_token');
      const json = await fetchJson(`${API_BASE_URL}/admin/programs`, {
          method: 'POST',
          headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ title, performer, color })
      });
      return json;
  },

  // Admin: Delete Program
  deleteProgram: async (id: string) => {
      const token = safeLocalStorageGet('admin_token');
      const json = await fetchJson(`${API_BASE_URL}/admin/programs/${id}`, {
          method: 'DELETE',
          headers: {
              'Authorization': `Bearer ${token}`
          }
      });
      return json;
  }
};
