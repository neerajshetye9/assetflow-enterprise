import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';

const fetchReturnRequests = () => api.get('/returns/requests').then((r) => r.data);
const fetchActiveAllocs = () => api.get('/allocations/active').then((r) => r.data);

const statusColor = { PENDING: 'yellow', COMPLETED: 'green', REJECTED: 'red', CANCELLED: 'gray' };
const CONDITIONS = ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'];

export default function Returns() {
  const qc = useQueryClient();
  const { data: requests = [], isLoading } = useQuery({ queryKey: ['returns'], queryFn: fetchReturnRequests });
  const { data: activeAllocs = [] } = useQuery({ queryKey: ['alloc-active'], queryFn: fetchActiveAllocs });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ allocationId: '', requestNotes: '', conditionAtRequest: '' });
  const [error, setError] = useState('');
  const [approvingId, setApprovingId] = useState(null);
  const [approveForm, setApproveForm] = useState({ checkinCondition: 'GOOD', checkinNotes: '' });

  const createMut = useMutation({
    mutationFn: (body) => api.post('/returns/requests', body),
    onSuccess: () => { qc.invalidateQueries(['returns']); setShowForm(false); setError(''); setForm({ allocationId: '', requestNotes: '', conditionAtRequest: '' }); },
    onError: (err) => setError(err.response?.data?.error || 'Failed to submit return request'),
  });

  const approveMut = useMutation({
    mutationFn: ({ id, body }) => api.put(`/returns/requests/${id}/approve`, body),
    onSuccess: () => { qc.invalidateQueries(['returns']); qc.invalidateQueries(['alloc-active']); qc.invalidateQueries(['assets']); setApprovingId(null); },
    onError: (err) => alert(err.response?.data?.error || 'Failed to approve return'),
  });

  const pending = requests.filter((r) => r.status === 'PENDING');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Asset Returns</h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage asset check-ins and return requests
            {pending.length > 0 && <span className="ml-2 badge-yellow">{pending.length} pending</span>}
          </p>
        </div>
        <button id="new-return-btn" onClick={() => setShowForm(true)} className="btn-primary">
          + Request Return
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">New Return Request</h3>
          {error && <div className="mb-3 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Active Allocation *</label>
              <select id="return-alloc" className="input" value={form.allocationId} onChange={(e) => setForm({ ...form, allocationId: e.target.value })}>
                <option value="">Select allocation to return…</option>
                {activeAllocs.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.asset_name} ({a.asset_tag}) — {a.employee_name || a.department_name || 'Unassigned'}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">Only currently active allocations can be returned</p>
            </div>
            <div>
              <label className="label">Current Condition</label>
              <select id="return-condition" className="input" value={form.conditionAtRequest} onChange={(e) => setForm({ ...form, conditionAtRequest: e.target.value })}>
                <option value="">Select condition…</option>
                {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Notes</label>
              <input id="return-notes" className="input" value={form.requestNotes}
                onChange={(e) => setForm({ ...form, requestNotes: e.target.value })}
                placeholder="Any notes about the asset condition?" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              id="return-submit"
              onClick={() => createMut.mutate(form)}
              disabled={createMut.isPending || !form.allocationId}
              className="btn-primary"
            >
              {createMut.isPending ? 'Submitting…' : 'Submit Return Request'}
            </button>
            <button onClick={() => { setShowForm(false); setError(''); }} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Check-in approval modal */}
      {approvingId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Approve Return & Check-in Asset</h3>
            <div className="space-y-3">
              <div>
                <label className="label">Asset Condition at Check-in</label>
                <select id="checkin-condition" className="input" value={approveForm.checkinCondition}
                  onChange={(e) => setApproveForm({ ...approveForm, checkinCondition: e.target.value })}>
                  {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Check-in Notes</label>
                <textarea className="input" rows={3} value={approveForm.checkinNotes}
                  onChange={(e) => setApproveForm({ ...approveForm, checkinNotes: e.target.value })}
                  placeholder="Any observations during check-in…" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => approveMut.mutate({ id: approvingId, body: approveForm })}
                disabled={approveMut.isPending}
                className="btn-primary flex-1"
              >
                {approveMut.isPending ? 'Processing…' : '✓ Confirm Check-in'}
              </button>
              <button onClick={() => setApprovingId(null)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Requests list */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="card text-center text-slate-400">Loading…</div>
        ) : requests.length === 0 ? (
          <div className="card text-center text-slate-400">
            <p>No return requests yet.</p>
            <p className="text-sm mt-1">Submit a return request when an employee needs to hand back an asset.</p>
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
                    <div><span className="text-slate-500">Requested by:</span> <span className="text-slate-300">{r.requested_by_name}</span></div>
                    <div><span className="text-slate-500">Date:</span> <span className="text-slate-300">{new Date(r.created_at).toLocaleDateString()}</span></div>
                    {r.condition_at_request && <div><span className="text-slate-500">Reported condition:</span> <span className="text-slate-300">{r.condition_at_request}</span></div>}
                    {r.checkin_condition && <div><span className="text-slate-500">Check-in condition:</span> <span className="text-slate-300">{r.checkin_condition}</span></div>}
                  </div>
                  {r.request_notes && <p className="text-sm text-slate-400 mt-2 italic">"{r.request_notes}"</p>}
                  {r.checkin_notes && <p className="text-sm text-green-400 mt-1">✓ {r.checkin_notes}</p>}
                  {r.status === 'COMPLETED' && (
                    <p className="text-xs text-green-500 mt-1">Asset returned to inventory and marked AVAILABLE</p>
                  )}
                </div>
                {r.status === 'PENDING' && (
                  <button
                    id={`approve-return-${r.id}`}
                    onClick={() => { setApprovingId(r.id); setApproveForm({ checkinCondition: r.condition_at_request || 'GOOD', checkinNotes: '' }); }}
                    className="btn-primary text-xs px-4 py-1.5 min-w-max"
                  >
                    Check-in Asset
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
