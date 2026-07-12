import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';

const fetchTransfers = () => api.get('/transfers/requests').then((r) => r.data);
const fetchAssets = () => api.get('/assets', { params: { status: 'ALLOCATED' } }).then((r) => r.data);
const fetchEmps = () => api.get('/org/employees').then((r) => r.data);
const fetchDepts = () => api.get('/org/departments').then((r) => r.data);

const statusColor = { REQUESTED: 'yellow', COMPLETED: 'green', REJECTED: 'red', CANCELLED: 'gray' };

export default function Transfers() {
  const qc = useQueryClient();
  const { data: requests = [], isLoading } = useQuery({ queryKey: ['transfers'], queryFn: fetchTransfers });
  const { data: allocatedAssets = [] } = useQuery({ queryKey: ['assets-allocated'], queryFn: fetchAssets });
  const { data: emps = [] } = useQuery({ queryKey: ['employees'], queryFn: fetchEmps });
  const { data: depts = [] } = useQuery({ queryKey: ['departments'], queryFn: fetchDepts });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ assetId: '', targetEmployeeId: '', targetDepartmentId: '', reason: '' });
  const [error, setError] = useState('');

  const createMut = useMutation({
    mutationFn: (body) => api.post('/transfers/requests', body),
    onSuccess: () => { qc.invalidateQueries(['transfers']); setShowForm(false); setError(''); setForm({ assetId: '', targetEmployeeId: '', targetDepartmentId: '', reason: '' }); },
    onError: (err) => setError(err.response?.data?.error || 'Failed to submit transfer request'),
  });

  const approveMut = useMutation({
    mutationFn: (id) => api.put(`/transfers/requests/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries(['transfers']); qc.invalidateQueries(['assets']); },
    onError: (err) => alert(err.response?.data?.error || 'Failed to approve'),
  });

  const rejectMut = useMutation({
    mutationFn: (id) => api.put(`/transfers/requests/${id}/reject`),
    onSuccess: () => qc.invalidateQueries(['transfers']),
  });

  const pending = requests.filter((r) => r.status === 'REQUESTED');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Asset Transfers</h1>
          <p className="text-slate-400 text-sm mt-1">
            Reassign allocated assets to a different employee or department
            {pending.length > 0 && <span className="ml-2 badge-yellow">{pending.length} pending</span>}
          </p>
        </div>
        <button id="new-transfer-btn" onClick={() => setShowForm(true)} className="btn-primary">
          + Request Transfer
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">New Transfer Request</h3>
          {error && <div className="mb-3 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Asset to Transfer *</label>
              <select id="transfer-asset" className="input" value={form.assetId} onChange={(e) => setForm({ ...form, assetId: e.target.value })}>
                <option value="">Select an allocated asset…</option>
                {allocatedAssets.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.asset_tag})</option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">Only currently allocated assets can be transferred</p>
            </div>
            <div>
              <label className="label">Transfer To — Employee</label>
              <select id="transfer-emp" className="input" value={form.targetEmployeeId} onChange={(e) => setForm({ ...form, targetEmployeeId: e.target.value })}>
                <option value="">No specific employee</option>
                {emps.map((e) => <option key={e.membership_id} value={e.membership_id}>{e.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Transfer To — Department</label>
              <select id="transfer-dept" className="input" value={form.targetDepartmentId} onChange={(e) => setForm({ ...form, targetDepartmentId: e.target.value })}>
                <option value="">No specific department</option>
                {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Reason</label>
              <textarea id="transfer-reason" className="input" rows={2} value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Why is this transfer needed?" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              id="transfer-submit"
              onClick={() => createMut.mutate(form)}
              disabled={createMut.isPending || !form.assetId}
              className="btn-primary"
            >
              {createMut.isPending ? 'Submitting…' : 'Submit Request'}
            </button>
            <button onClick={() => { setShowForm(false); setError(''); }} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Requests list */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="card text-center text-slate-400">Loading…</div>
        ) : requests.length === 0 ? (
          <div className="card text-center text-slate-400">
            <p>No transfer requests yet.</p>
            <p className="text-sm mt-1">Use the button above to request an asset transfer between employees or departments.</p>
          </div>
        ) : (
          requests.map((r) => (
            <div key={r.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="font-semibold text-white">{r.asset_name}</span>
                    <code className="text-xs bg-slate-700 px-1.5 py-0.5 rounded">{r.asset_tag}</code>
                    <span className={`badge-${statusColor[r.status] || 'gray'}`}>{r.status}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    <div><span className="text-slate-500">To Employee:</span> <span className="text-slate-300">{r.target_employee_name || '—'}</span></div>
                    <div><span className="text-slate-500">To Department:</span> <span className="text-slate-300">{r.target_department_name || '—'}</span></div>
                    <div><span className="text-slate-500">Requested by:</span> <span className="text-slate-300">{r.requested_by_name}</span></div>
                    <div><span className="text-slate-500">Date:</span> <span className="text-slate-300">{new Date(r.created_at).toLocaleDateString()}</span></div>
                  </div>
                  {r.reason && <p className="text-sm text-slate-400 mt-2 italic">"{r.reason}"</p>}
                </div>
                {r.status === 'REQUESTED' && (
                  <div className="flex flex-col gap-2 min-w-max">
                    <button
                      id={`approve-transfer-${r.id}`}
                      onClick={() => approveMut.mutate(r.id)}
                      disabled={approveMut.isPending}
                      className="btn-primary text-xs px-4 py-1.5"
                    >
                      Approve
                    </button>
                    <button
                      id={`reject-transfer-${r.id}`}
                      onClick={() => rejectMut.mutate(r.id)}
                      disabled={rejectMut.isPending}
                      className="btn-danger text-xs px-4 py-1.5"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
