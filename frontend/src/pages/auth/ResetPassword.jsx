import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../lib/axios';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ token: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/auth/reset-password', form);
      navigate('/login', { state: { message: 'Password reset successfully. Please log in.' } });
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white"><span className="text-primary-500">Asset</span>Flow</h1>
      </div>
      <div className="card">
        <h2 className="text-xl font-semibold text-white mb-6">Set new password</h2>
        {error && <div className="mb-4 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Reset Token</label>
            <input id="reset-token" type="text" className="input font-mono text-sm" placeholder="Paste your token here" value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} required />
          </div>
          <div>
            <label className="label">New Password</label>
            <input id="new-password" type="password" className="input" placeholder="Min 8 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>
          <button id="reset-submit" type="submit" disabled={loading} className="w-full btn-primary py-2.5">
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm">
          <Link to="/login" className="text-primary-400 hover:text-primary-300">← Back to login</Link>
        </p>
      </div>
    </div>
  );
}
