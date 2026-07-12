import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';

const fetchCycles = () => api.get('/audit/cycles').then((r) => r.data);
const fetchDepts = () => api.get('/org/departments').then((r) => r.data);
const fetchLocs = () => api.get('/org/locations').then((r) => r.data);

const statusColor = { DRAFT: 'gray', SCHEDULED: 'blue', IN_PROGRESS: 'yellow', COMPLETED: 'green', CLOSED: 'red' };

export default function AuditCycles() {
  const qc = useQueryClient();
  const { data: cycles = [], isLoading } = useQuery({ queryKey: ['audit-cycles'], queryFn: fetchCycles });
  const { data: depts = [] } = useQuery({ queryKey: ['departments'], queryFn: fetchDepts });
  const { data: locs = [] } = useQuery({ queryKey: ['locations'], queryFn: fetchLocs });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', startDate: '', endDate: '', departmentIds: [], locationIds: [] });
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: (body) => api.post('/audit/cycles', body),
    onSuccess: () => { qc.invalidateQueries(['audit-cycles']); setShowForm(false); },
    onError: (err) => setError(err.response?.data?.error || 'Failed'),
  });

  const toggleArr = (arr, id) => arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Cycles</h1>
          <p className="text-slate-400 text-sm mt-1">Track and manage physical asset audits</p>
        </div>
        <button id="create-cycle-btn" onClick={() => setShowForm(true)} className="btn-primary">+ New Audit Cycle</button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">New Audit Cycle</h3>
          {error && <div className="mb-3 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="label">Cycle Name *</label><input id="cycle-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Q3 2026 Physical Audit" /></div>
            <div><label className="label">Start Date</label><input id="cycle-start" type="date" className="input" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
            <div><label className="label">End Date</label><input id="cycle-end" type="date" className="input" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
            <div>
              <label className="label">Scope Departments</label>
              <div className="space-y-1 max-h-32 overflow-y-auto border border-surface-border rounded-lg p-2">
                {depts.map((d) => (
                  <label key={d.id} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={form.departmentIds.includes(d.id)} onChange={() => setForm({ ...form, departmentIds: toggleArr(form.departmentIds, d.id) })} className="accent-primary-500" />
                    {d.name}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Scope Locations</label>
              <div className="space-y-1 max-h-32 overflow-y-auto border border-surface-border rounded-lg p-2">
                {locs.map((l) => (
                  <label key={l.id} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={form.locationIds.includes(l.id)} onChange={() => setForm({ ...form, locationIds: toggleArr(form.locationIds, l.id) })} className="accent-primary-500" />
                    {l.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button id="cycle-save" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? 'Creating...' : 'Create Cycle'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {isLoading ? (
          <div className="card text-center text-slate-400">Loading audit cycles...</div>
        ) : cycles.length === 0 ? (
          <div className="card text-center text-slate-400">No audit cycles yet. Create your first one above.</div>
        ) : cycles.map((c) => (
          <div key={c.id} className="card hover:border-primary-500 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-white">{c.name}</h3>
                  <span className={`badge-${statusColor[c.status] || 'gray'}`}>{c.status}</span>
                </div>
                <p className="text-slate-400 text-sm">{c.start_date} → {c.end_date}</p>
                <p className="text-slate-400 text-xs mt-1">Created by {c.created_by_name}</p>
              </div>
              <div className="text-right">
                <div className="flex gap-4 text-sm mb-2">
                  <div><p className="text-slate-400 text-xs">Total</p><p className="font-semibold text-white">{c.total_items}</p></div>
                  <div><p className="text-slate-400 text-xs">Verified</p><p className="font-semibold text-green-400">{c.verified_items}</p></div>
                  <div><p className="text-slate-400 text-xs">Pending</p><p className="font-semibold text-yellow-400">{c.pending_items}</p></div>
                </div>
                <Link to={`/audit/cycles/${c.id}`} className="text-sm text-primary-400 hover:text-primary-300">View Details →</Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
