import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/axios';

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      setAuth(data.user, data.membership, data.accessToken, data.refreshToken);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white">
          <span className="text-primary-500">Asset</span>Flow
        </h1>
        <p className="text-slate-400 mt-2">Enterprise Asset Management</p>
      </div>
      <div className="card">
        <h2 className="text-xl font-semibold text-white mb-6">Sign in to your account</h2>
        {error && <div className="mb-4 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email address</label>
            <input id="email" type="email" className="input" placeholder="you@company.com"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input id="password" type="password" className="input" placeholder="••••••••"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>
          <div className="flex items-center justify-end">
            <Link to="/forgot-password" className="text-sm text-primary-400 hover:text-primary-300">Forgot password?</Link>
          </div>
          <button id="login-submit" type="submit" disabled={loading} className="w-full btn-primary py-2.5">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-400">
          New organization?{' '}
          <Link to="/signup" className="text-primary-400 hover:text-primary-300 font-medium">Create account</Link>
        </p>
      </div>
    </div>
  );
}
