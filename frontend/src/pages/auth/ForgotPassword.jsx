import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/axios';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Request failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white"><span className="text-primary-500">Asset</span>Flow</h1>
      </div>
      <div className="card">
        <h2 className="text-xl font-semibold text-white mb-2">Reset your password</h2>
        <p className="text-slate-400 text-sm mb-6">Enter your email and we'll generate a reset token.</p>
        {result ? (
          <div className="space-y-3">
            <div className="p-3 bg-green-900/40 border border-green-700 rounded-lg text-green-300 text-sm">{result.message}</div>
            {result.resetToken && (
              <div className="p-3 bg-slate-700 rounded-lg">
                <p className="text-xs text-slate-400 mb-1">Dev mode — Reset Token:</p>
                <code className="text-xs text-yellow-300 break-all">{result.resetToken}</code>
              </div>
            )}
            <Link to="/reset-password" className="block text-center text-primary-400 hover:text-primary-300 text-sm">Use this token to reset password →</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>}
            <div>
              <label className="label">Email address</label>
              <input id="forgot-email" type="email" className="input" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <button id="forgot-submit" type="submit" disabled={loading} className="w-full btn-primary py-2.5">
              {loading ? 'Sending...' : 'Generate Reset Token'}
            </button>
          </form>
        )}
        <p className="mt-4 text-center text-sm text-slate-400">
          <Link to="/login" className="text-primary-400 hover:text-primary-300">← Back to login</Link>
        </p>
      </div>
    </div>
  );
}
