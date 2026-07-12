import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/axios';

export default function Signup() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', organizationCode: '',
    employeeCode: '', jobTitle: '', departmentId: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [fetchingDepts, setFetchingDepts] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    const fetchDepts = async () => {
      if (form.organizationCode.length >= 2) {
        setFetchingDepts(true);
        try {
          const { data } = await api.get(`/org/departments/public/${form.organizationCode}`);
          setDepartments(data);
        } catch (err) {
          setDepartments([]);
        } finally {
          setFetchingDepts(false);
        }
      } else {
        setDepartments([]);
      }
    };
    const timer = setTimeout(fetchDepts, 500);
    return () => clearTimeout(timer);
  }, [form.organizationCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/signup', form);
      setAuth(data.user, data.membership, data.accessToken, data.refreshToken);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.details?.[0]?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white"><span className="text-primary-500">Asset</span>Flow</h1>
        <p className="text-slate-400 mt-2">Employee Signup</p>
      </div>
      <div className="card">
        <h2 className="text-xl font-semibold text-white mb-6">Join your organization</h2>
        {error && <div className="mb-4 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Organization Code *</label>
            <input id="org-code" type="text" className="input" placeholder="e.g. TECH" value={form.organizationCode} onChange={(e) => setForm({ ...form, organizationCode: e.target.value.toUpperCase() })} required />
            <p className="text-xs text-slate-500 mt-1">Ask your administrator for your organization code.</p>
          </div>
          <hr className="border-surface-border my-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name *</label>
              <input id="full-name" type="text" className="input" placeholder="Rahul Patil" value={form.fullName} onChange={set('fullName')} required />
            </div>
            <div>
              <label className="label">Email Address *</label>
              <input id="email" type="email" className="input" placeholder="you@company.com" value={form.email} onChange={set('email')} required />
            </div>
            <div>
              <label className="label">Password *</label>
              <input id="password" type="password" className="input" placeholder="Min 8 characters" value={form.password} onChange={set('password')} required />
            </div>
            <div>
              <label className="label">Employee Code</label>
              <input id="emp-code" type="text" className="input" placeholder="TN-102" value={form.employeeCode} onChange={set('employeeCode')} />
            </div>
            <div>
              <label className="label">Job Title</label>
              <input id="job-title" type="text" className="input" placeholder="Software Engineer" value={form.jobTitle} onChange={set('jobTitle')} />
            </div>
            <div>
              <label className="label">Department</label>
              <select id="department" className="input" value={form.departmentId} onChange={set('departmentId')} disabled={fetchingDepts || departments.length === 0}>
                <option value="">No department</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {fetchingDepts && <p className="text-xs text-slate-500 mt-1">Loading departments...</p>}
            </div>
          </div>
          <button id="signup-submit" type="submit" disabled={loading} className="w-full btn-primary py-2.5 mt-6">
            {loading ? 'Joining...' : 'Create Account'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">Login</Link>
        </p>
      </div>
    </div>
  );
}
