import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';

const fetchMaint = () => api.get('/maintenance').then((r) => r.data);
const fetchAssets = () => api.get('/assets').then((r) => r.data);
const PRIORITIES = ['LOW','MEDIUM','HIGH','CRITICAL'];
const statusColor = { PENDING:'gray', APPROVED:'blue', REJECTED:'red', TECHNICIAN_ASSIGNED:'yellow', IN_PROGRESS:'yellow', RESOLVED:'green', CLOSED:'gray' };

export default function Maintenance() {
  const qc = useQueryClient();
  const { data: requests = [], isLoading } = useQuery({ queryKey: ['maintenance'], queryFn: fetchMaint });
  const { data: assets = [] } = useQuery({ queryKey: ['assets'], queryFn: fetchAssets });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ assetId: '', issueDescription: '', priority: 'MEDIUM' });
  const [error, setError] = useState('');
  const [resolvingId, setResolvingId] = useState(null);
  const [resolveNotes, setResolveNotes] = useState('');

  const createMutation = useMutation({
    mutationFn: (body) => api.post('/maintenance', body),
    onSuccess: () => { qc.invalidateQueries(['maintenance']); setShowForm(false); },
    onError: (err) => setError(err.response?.data?.error || 'Failed'),
  });
  const actionMutation = useMutation({
    mutationFn: ({ id, action, body }) => api.put(`/maintenance/${id}/${action}`, body || {}),
    onSuccess: () => qc.invalidateQueries(['maintenance']),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Maintenance</h1>
          <p className="text-slate-400 text-sm mt-1">Track asset issues and repairs</p>
        </div>
        <button id="new-maint-btn" onClick={() => setShowForm(true)} className="btn-primary">+ Report Issue</button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Report Maintenance Issue</h3>
          {error && <div className="mb-3 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Asset *</label>
              <select id="maint-asset" className="input" value={form.assetId} onChange={(e) => setForm({ ...form, assetId: e.target.value })}>
                <option value="">Select asset…</option>
                {assets.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.asset_tag})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select id="maint-priority" className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Issue Description *</label>
              <textarea id="maint-desc" className="input" rows={3} value={form.issueDescription} onChange={(e) => setForm({ ...form, issueDescription: e.target.value })} placeholder="Describe the issue in detail…" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button id="maint-submit" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.assetId || !form.issueDescription} className="btn-primary">
              {createMutation.isPending ? 'Submitting…' : 'Submit Request'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {resolvingId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Resolve Maintenance Request</h3>
            <label className="label">Resolution Notes</label>
            <textarea className="input mb-4" rows={3} value={resolveNotes} onChange={(e) => setResolveNotes(e.target.value)} placeholder="What was done to fix the issue?" />
            <div className="flex gap-3">
              <button onClick={() => { actionMutation.mutate({ id: resolvingId, action: 'resolve', body: { resolutionNotes: resolveNotes } }); setResolvingId(null); }} className="btn-primary flex-1">Mark Resolved</button>
              <button onClick={() => setResolvingId(null)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {isLoading ? <div className="card text-center text-slate-400">Loading…</div> : requests.length === 0 ? (
          <div className="card text-center text-slate-400">No maintenance requests yet.</div>
        ) : requests.map((r) => (
          <div key={r.id} className="card">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <span className="font-medium text-white">{r.asset_name}</span>
                  <code className="text-xs bg-slate-700 px-1.5 py-0.5 rounded">{r.asset_tag}</code>
                  <span className={`badge-${statusColor[r.status] || 'gray'}`}>{r.status}</span>
                  {r.priority === 'CRITICAL' && <span className="badge-red">CRITICAL</span>}
                  {r.priority === 'HIGH' && <span className="badge-yellow">HIGH</span>}
                </div>
                <p className="text-sm text-slate-300 mb-1">{r.issue_description}</p>
                <p className="text-xs text-slate-500">By: {r.requested_by_name} · {new Date(r.created_at).toLocaleDateString()}</p>
                {r.resolution_notes && <p className="text-sm text-green-400 mt-1">✓ {r.resolution_notes}</p>}
              </div>
              <div className="flex flex-col gap-2 min-w-max">
                {r.status === 'PENDING' && (
                  <button id={`approve-maint-${r.id}`} onClick={() => actionMutation.mutate({ id: r.id, action: 'approve' })} className="btn-primary text-xs px-3 py-1">Approve</button>
                )}
                {r.status === 'APPROVED' && (
                  <button onClick={() => actionMutation.mutate({ id: r.id, action: 'start' })} className="btn-secondary text-xs px-3 py-1">Start Work</button>
                )}
                {(r.status === 'IN_PROGRESS' || r.status === 'TECHNICIAN_ASSIGNED') && (
                  <button id={`resolve-maint-${r.id}`} onClick={() => setResolvingId(r.id)} className="btn-primary text-xs px-3 py-1">Resolve</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
