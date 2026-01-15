import { Candidate } from './types';

// Use relative path for production (handled by Nginx proxy)
// For local dev with Vite proxy, this also works if configured.
// Or we can check environment.
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = {
  // Get Programs (Candidates) and Config
  getPrograms: async (): Promise<{ candidates: Candidate[], config: { vote_count_limit: number } }> => {
    const response = await fetch(`${API_BASE_URL}/programs`);
    if (!response.ok) throw new Error('Failed to fetch programs');
    const json = await response.json();
    
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

    const response = await fetch(`${API_BASE_URL}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ programIds, clientId })
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.message || 'Voting failed');
    return json;
  },

  // Admin Login
  login: async (password: string) => {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.message || 'Login failed');
    
    // Store token
    if (json.token) {
        localStorage.setItem('admin_token', json.token);
    }
    
    return json;
  },

  // Admin: Update Settings
  updateSettings: async (vote_count_limit: number) => {
    const token = localStorage.getItem('admin_token');
    const response = await fetch(`${API_BASE_URL}/admin/settings`, {
      method: 'POST',
      headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ vote_count_limit })
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.message || 'Update failed');
    return json;
  },

  // Admin: Reset Data
  resetData: async () => {
    const token = localStorage.getItem('admin_token');
    const response = await fetch(`${API_BASE_URL}/admin/reset`, {
      method: 'POST',
      headers: {
          'Authorization': `Bearer ${token}`
      }
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.message || 'Reset failed');
    return json;
  },
  
  // Admin: Add Program
  addProgram: async (title: string, performer: string, color: string) => {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${API_BASE_URL}/admin/programs`, {
          method: 'POST',
          headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ title, performer, color })
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || 'Add failed');
      return json;
  },

  // Admin: Delete Program
  deleteProgram: async (id: string) => {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${API_BASE_URL}/admin/programs/${id}`, {
          method: 'DELETE',
          headers: {
              'Authorization': `Bearer ${token}`
          }
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || 'Delete failed');
      return json;
  }
};
