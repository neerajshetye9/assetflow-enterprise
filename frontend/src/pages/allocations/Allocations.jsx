import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';

const fetchRequests = () => api.get('/allocations/requests').then((r) => r.data);
const fetchActive = () => api.get('/allocations/active').then((r) => r.data);
const fetchAssets = () => api.get('/assets', { params: { status: 'AVAILABLE' } }).then((r) => r.data);
const fetchEmps = () => api.get('/org/employees').then((r) => r.data);
const fetchDepts = () => api.get('/org/departments').then((r) => r.data);

const statusColor = { PENDING:'yellow', APPROVED:'green', REJECTED:'red' };

export default function Allocations() {
  const qc = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const [tab, setTab] = useState('active');
  const [showForm, setShowForm] = useState(!!params.get('assetId'));
  const [form, setForm] = useState({ assetId: params.get('assetId') || '', targetEmployeeId: '', targetDepartmentId: '', expectedReturnAt: '', reason: '' });
  const [error, setError] = useState('');

  const { data: requests = [] } = useQuery({ queryKey: ['alloc-requests'], queryFn: fetchRequests });
  const { data: active = [] } = useQuery({ queryKey: ['alloc-active'], queryFn: fetchActive });
  const { data: availAssets = [] } = useQuery({ queryKey: ['assets-available'], queryFn: fetchAssets });
  const { data: emps = [] } = useQuery({ queryKey: ['employees'], queryFn: fetchEmps });
  const { data: depts = [] } = useQuery({ queryKey: ['departments'], queryFn: fetchDepts });

  const createMutation = useMutation({
    mutationFn: (body) => api.post('/allocations/requests', body),
    onSuccess: () => { qc.invalidateQueries(['alloc-requests']); setShowForm(false); setTab('requests'); },
    onError: (err) => setError(err.response?.data?.error || 'Failed'),
  });
  const approveMutation = useMutation({
    mutationFn: (id) => api.put(`/allocations/requests/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries(['alloc-requests']); qc.invalidateQueries(['alloc-active']); },
  });
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => api.put(`/allocations/requests/${id}/reject`, { rejectionReason: reason }),
    onSuccess: () => qc.invalidateQueries(['alloc-requests']),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Asset Allocations</h1>
          <p className="text-slate-400 text-sm mt-1">Manage asset assignment requests</p>
        </div>
        <button id="new-alloc-btn" onClick={() => setShowForm(true)} className="btn-primary">+ New Request</button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">New Allocation Request</h3>
          {error && <div className="mb-3 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Asset *</label>
              <select id="alloc-asset" className="input" value={form.assetId} onChange={(e) => setForm({ ...form, assetId: e.target.value })}>
                <option value="">Select available asset…</option>
                {availAssets.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.asset_tag})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Target Employee</label>
              <select id="alloc-emp" className="input" value={form.targetEmployeeId} onChange={(e) => setForm({ ...form, targetEmployeeId: e.target.value })}>
                <option value="">No specific employee</option>
                {emps.map((e) => <option key={e.membership_id} value={e.membership_id}>{e.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Target Department</label>
              <select id="alloc-dept" className="input" value={form.targetDepartmentId} onChange={(e) => setForm({ ...form, targetDepartmentId: e.target.value })}>
                <option value="">No specific department</option>
                {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Expected Return Date</label>
              <input id="alloc-return" type="date" className="input" value={form.expectedReturnAt} onChange={(e) => setForm({ ...form, expectedReturnAt: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="label">Reason</label>
              <textarea id="alloc-reason" className="input" rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Why is this asset needed?" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button id="alloc-submit" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.assetId} className="btn-primary">
              {createMutation.isPending ? 'Submitting…' : 'Submit Request'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {['active','requests'].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={tab === t ? 'btn-primary' : 'btn-secondary'}>
            {t === 'active' ? 'Active Allocations' : `Requests (${requests.filter(r => r.status === 'PENDING').length})`}
          </button>
        ))}
      </div>

      {tab === 'active' && (
        <div className="card p-0 overflow-hidden">
          {active.length === 0 ? <div className="p-8 text-center text-slate-400">No active allocations</div> : (
            <table className="w-full">
              <thead className="border-b border-surface-border">
                <tr>
                  <th className="table-header">Asset</th>
                  <th className="table-header">Employee</th>
                  <th className="table-header">Department</th>
                  <th className="table-header">Allocated At</th>
                  <th className="table-header">Expected Return</th>
                </tr>
              </thead>
              <tbody>
                {active.map((a) => (
                  <tr key={a.id} className="table-row">
                    <td className="table-cell font-medium">{a.asset_name} <code className="text-xs bg-slate-700 px-1 py-0.5 rounded ml-1">{a.asset_tag}</code></td>
                    <td className="table-cell">{a.employee_name || '—'}</td>
                    <td className="table-cell text-slate-400">{a.department_name || '—'}</td>
                    <td className="table-cell text-slate-400">{new Date(a.allocated_at).toLocaleDateString()}</td>
                    <td className="table-cell text-slate-400">{a.expected_return_at ? new Date(a.expected_return_at).toLocaleDateString() : 'No deadline'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'requests' && (
        <div className="space-y-3">
          {requests.length === 0 ? <div className="card text-center text-slate-400">No requests yet</div> : requests.map((r) => (
            <div key={r.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-medium text-white">{r.asset_name}</span>
                    <code className="text-xs bg-slate-700 px-1.5 py-0.5 rounded">{r.asset_tag}</code>
                    <span className={`badge-${statusColor[r.status] || 'gray'}`}>{r.status}</span>
                  </div>
                  <p className="text-sm text-slate-400">For: {r.target_employee_name || r.target_department_name || 'General'} · By: {r.requested_by_name}</p>
                  {r.reason && <p className="text-sm text-slate-500 mt-1">"{r.reason}"</p>}
                  {r.rejection_reason && <p className="text-sm text-red-400 mt-1">Rejected: {r.rejection_reason}</p>}
                </div>
                {r.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <button id={`approve-alloc-${r.id}`} onClick={() => approveMutation.mutate(r.id)} disabled={approveMutation.isPending} className="btn-primary text-xs px-3 py-1">Approve</button>
                    <button id={`reject-alloc-${r.id}`} onClick={() => { const reason = prompt('Rejection reason?'); if (reason) rejectMutation.mutate({ id: r.id, reason }); }} className="btn-danger text-xs px-3 py-1">Reject</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
