import React, { useState } from 'react';
import NexusSearch from './components/NexusSearch';
import NexusEditor from './components/NexusEditor';
import { useAuthStore } from './store';
import { LogOut, User, FileText, Settings, Sparkles } from 'lucide-react';
import api from './api';

export default function App() {
  const { user, token, setAuth, logout } = useAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const { data } = await api.post(endpoint, formData);
      setAuth(data.user, data.token);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed');
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-stone-100 overflow-hidden">
          <div className="p-8 bg-stone-900 text-white text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <Sparkles className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
            <h1 className="text-3xl font-serif italic mb-2">NEXUSPDF</h1>
            <p className="text-stone-400 text-sm font-mono uppercase tracking-widest">AI Research & PDF Builder</p>
          </div>
          
          <form onSubmit={handleAuth} className="p-8 space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-400 outline-none transition-all"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-400 mb-1">Email Address</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-400 outline-none transition-all"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-400 mb-1">Password</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-400 outline-none transition-all"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            
            {error && <p className="text-red-500 text-xs italic">{error}</p>}

            <button className="w-full py-4 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-all shadow-lg shadow-stone-200">
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>

            <p className="text-center text-sm text-stone-500 mt-6">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
              <button 
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-stone-900 font-semibold hover:underline"
              >
                {isLogin ? 'Register' : 'Login'}
              </button>
            </p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-stone-100 overflow-hidden">
      {/* Global Nav */}
      <nav className="h-14 bg-stone-900 text-white flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <span className="font-serif italic text-xl tracking-tight">NEXUSPDF</span>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-stone-400 hover:text-white transition-colors cursor-pointer">
            <FileText className="w-4 h-4" />
            <span className="text-xs font-mono uppercase tracking-wider">My Documents</span>
          </div>
          <div className="h-4 w-px bg-stone-700" />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-stone-900 font-bold text-xs">
                {user?.name[0]}
              </div>
              <span className="text-sm font-medium">{user?.name}</span>
            </div>
            <button onClick={logout} className="p-2 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-white transition-all">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex relative overflow-hidden">
        <div className="w-[40%] min-w-[300px] h-full">
          <NexusSearch />
        </div>
        <div className="w-[60%] flex-1 h-full">
          <NexusEditor />
        </div>
      </div>
    </div>
  );
}
