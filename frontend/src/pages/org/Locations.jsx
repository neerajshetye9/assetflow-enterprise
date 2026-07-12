import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';

const TYPES = ['OFFICE', 'WAREHOUSE', 'FACTORY', 'BRANCH', 'OTHER'];
const fetchLocs = () => api.get('/org/locations').then((r) => r.data);

export default function Locations() {
  const qc = useQueryClient();
  const { data: locs = [], isLoading } = useQuery({ queryKey: ['locations'], queryFn: fetchLocs });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', locationType: 'OFFICE', address: '', floor: '' });
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: (body) => api.post('/org/locations', body),
    onSuccess: () => { qc.invalidateQueries(['locations']); setShowForm(false); setForm({ name: '', locationType: 'OFFICE', address: '', floor: '' }); },
    onError: (err) => setError(err.response?.data?.error || 'Failed'),
  });

  const typeColors = { OFFICE: 'blue', WAREHOUSE: 'yellow', FACTORY: 'red', BRANCH: 'green', OTHER: 'gray' };
  const typeBadge = (t) => <span className={`badge-${typeColors[t] || 'gray'}`}>{t}</span>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Locations</h1>
          <p className="text-slate-400 text-sm mt-1">Offices, warehouses, and facilities</p>
        </div>
        <button id="add-loc-btn" onClick={() => setShowForm(true)} className="btn-primary">+ Add Location</button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">New Location</h3>
          {error && <div className="mb-3 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Name *</label>
              <input id="loc-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Pune Head Office" />
            </div>
            <div>
              <label className="label">Type</label>
              <select id="loc-type" className="input" value={form.locationType} onChange={(e) => setForm({ ...form, locationType: e.target.value })}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Address</label>
              <textarea id="loc-address" className="input" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Full address" />
            </div>
            <div>
              <label className="label">Floor / Wing</label>
              <input id="loc-floor" className="input" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} placeholder="2nd Floor" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button id="loc-save" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : locs.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No locations yet.</div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-surface-border">
              <tr>
                <th className="table-header">Name</th>
                <th className="table-header">Type</th>
                <th className="table-header">Address</th>
                <th className="table-header">Floor</th>
                <th className="table-header">Status</th>
              </tr>
            </thead>
            <tbody>
              {locs.map((l) => (
                <tr key={l.id} className="table-row">
                  <td className="table-cell font-medium">{l.name}</td>
                  <td className="table-cell">{typeBadge(l.location_type)}</td>
                  <td className="table-cell text-slate-400 max-w-xs truncate">{l.address || '—'}</td>
                  <td className="table-cell text-slate-400">{l.floor || '—'}</td>
                  <td className="table-cell">{l.status === 'ACTIVE' ? <span className="badge-green">ACTIVE</span> : <span className="badge-gray">INACTIVE</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
