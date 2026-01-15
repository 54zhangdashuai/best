import React, { useState } from 'react';
import { RefreshCw, Settings, Trash2, Plus, Pencil, X, RotateCcw, Save, AlertCircle } from 'lucide-react';
import { Candidate } from '../types';

interface AdminViewProps {
  candidates: Candidate[];
  voteLimit: number;
  votingEnabled: boolean;
  onUpdateVoteLimit: (limit: number) => Promise<void>;
  onToggleVoting: (enabled: boolean) => Promise<void>;
  onReset: () => void;
  onUpdateCandidate: (id: string, updates: Partial<Candidate>) => void;
  onAddCandidate: (data: Omit<Candidate, 'id' | 'votes' | 'currentRank' | 'previousRank'>) => void;
  onDeleteCandidate: (id: string) => void;
}

const AdminView: React.FC<AdminViewProps> = ({ 
  candidates, 
  voteLimit,
  votingEnabled,
  onUpdateVoteLimit,
  onToggleVoting,
  onReset,
  onUpdateCandidate,
  onAddCandidate,
  onDeleteCandidate
}) => {
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Settings State
  const [newLimit, setNewLimit] = useState(voteLimit);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    handle: '',
    color: '#3b82f6',
  });

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      name: '',
      handle: '',
      color: '#3b82f6',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (candidate: Candidate) => {
    setEditingId(candidate.id);
    setFormData({
      name: candidate.name,
      handle: candidate.handle,
      color: candidate.color,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      // Update existing
      onUpdateCandidate(editingId, formData);
    } else {
      // Add new
      onAddCandidate(formData);
    }
    setIsModalOpen(false);
  };

  const handleSaveSettings = async () => {
      setIsSavingSettings(true);
      try {
          await onUpdateVoteLimit(newLimit);
          alert('设置已保存');
      } catch (error) {
          alert('保存失败');
      } finally {
          setIsSavingSettings(false);
      }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 p-6 pb-24">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Area */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="text-slate-400" />
              后台管理控制台
            </h1>
            <p className="text-slate-500 mt-1">管理节目内容及系统状态</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-all active:scale-95"
            >
              <Plus size={18} /> 添加节目
            </button>
            
            <div className="h-8 w-px bg-slate-300 mx-2 hidden md:block"></div>

            <button 
              onClick={() => {
                  if(confirm('确定要重置所有投票数据吗？此操作不可恢复！')) {
                      onReset();
                  }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-white text-red-600 border border-slate-200 hover:bg-red-50 hover:border-red-200 transition-all shadow-sm active:scale-95"
            >
              <RotateCcw size={16} /> 重置数据
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Settings */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Settings size={20} className="text-slate-400" />
                        系统设置
                    </h2>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                投票开关
                            </label>
                            <button
                                onClick={() => onToggleVoting(!votingEnabled)}
                                className={`w-full py-2 px-4 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 ${
                                    votingEnabled 
                                    ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200' 
                                    : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
                                }`}
                            >
                                {votingEnabled ? '⏹ 停止投票' : '▶ 开始投票'}
                            </button>
                            <p className="text-xs text-slate-500 mt-1">
                                {votingEnabled ? '当前允许用户投票' : '当前已暂停投票，用户无法提交'}
                            </p>
                        </div>

                        <div className="border-t border-slate-100 pt-4">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                每人投票数限制
                            </label>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="number" 
                                    min="1"
                                    value={newLimit}
                                    onChange={(e) => setNewLimit(parseInt(e.target.value) || 1)}
                                    className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                />
                                <button
                                    onClick={handleSaveSettings}
                                    disabled={isSavingSettings}
                                    className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                                >
                                    <Save size={20} />
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                用户必须选择正好 {newLimit} 个节目才能提交。
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Program List */}
            <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                                <th className="p-4 w-16 text-center">排名</th>
                                <th className="p-4">节目信息</th>
                                <th className="p-4 text-right">票数</th>
                                <th className="p-4 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {candidates.map((candidate) => (
                                <tr key={candidate.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="p-4 text-center font-mono text-slate-400 font-bold">
                                        #{candidate.currentRank}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1 h-8 rounded-full" style={{ backgroundColor: candidate.color }}></div>
                                            <div>
                                                <div className="font-bold text-slate-900">{candidate.handle}</div>
                                                <div className="text-sm text-slate-500">{candidate.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right font-mono font-bold text-slate-700">
                                        {candidate.votes.toLocaleString()}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {/* Edit not fully implemented in backend yet, so maybe hide or implement partial update? 
                                                Actually API supports Delete, Add. Edit is tricky without route. 
                                                Let's keep Delete only for now to match API capabilities or I'd need to add Update API.
                                            */}
                                            <button 
                                                onClick={() => onDeleteCandidate(candidate.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="删除"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    {candidates.length === 0 && (
                        <div className="p-12 text-center text-slate-400">
                            暂无节目数据
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Modal - Simplified for Add Only */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-lg font-bold">添加新节目</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">节目名称</label>
                  <input
                    required
                    type="text"
                    value={formData.handle}
                    onChange={e => setFormData({...formData, handle: e.target.value})}
                    className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="例如：歌曲《星辰大海》"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">表演者/部门</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="例如：张伟 & 李娜"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">代表色</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={e => setFormData({...formData, color: e.target.value})}
                      className="h-10 w-20 rounded cursor-pointer"
                    />
                    <span className="text-sm text-slate-500 font-mono">{formData.color}</span>
                  </div>
                </div>
                
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 rounded-lg font-semibold text-slate-600 hover:bg-slate-50 border border-slate-200"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-md"
                  >
                    确认添加
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminView;