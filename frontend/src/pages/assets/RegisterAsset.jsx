import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../lib/axios';

const CONDITIONS = ['NEW','GOOD','FAIR','POOR','DAMAGED'];
const fetchCats = () => api.get('/org/categories').then((r) => r.data);
const fetchLocs = () => api.get('/org/locations').then((r) => r.data);

export default function RegisterAsset() {
  const navigate = useNavigate();
  const { data: cats = [] } = useQuery({ queryKey: ['categories'], queryFn: fetchCats });
  const { data: locs = [] } = useQuery({ queryKey: ['locations'], queryFn: fetchLocs });
  const [form, setForm] = useState({
    assetTag: '', name: '', serialNumber: '', categoryId: '', locationId: '',
    description: '', acquisitionDate: '', acquisitionCost: '', condition: 'GOOD',
    isShared: false, isBookable: false,
  });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const mutation = useMutation({
    mutationFn: (body) => api.post('/assets', body),
    onSuccess: (res) => navigate(`/assets/${res.data.id}`),
    onError: (err) => setError(err.response?.data?.error || err.response?.data?.details?.[0]?.message || 'Failed to register asset'),
  });

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Register New Asset</h1>
        <p className="text-slate-400 text-sm mt-1">Add a new asset to your organization's inventory</p>
      </div>
      <div className="card">
        {error && <div className="mb-4 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Asset Tag *</label>
            <input id="asset-tag" className="input font-mono" value={form.assetTag} onChange={set('assetTag')} placeholder="AF-2026-001" />
          </div>
          <div>
            <label className="label">Asset Name *</label>
            <input id="asset-name" className="input" value={form.name} onChange={set('name')} placeholder="Dell Latitude 5540" />
          </div>
          <div>
            <label className="label">Category *</label>
            <select id="asset-category" className="input" value={form.categoryId} onChange={set('categoryId')} required>
              <option value="">Select category…</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Location</label>
            <select id="asset-location" className="input" value={form.locationId} onChange={set('locationId')}>
              <option value="">No location</option>
              {locs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Serial Number</label>
            <input id="asset-serial" className="input font-mono" value={form.serialNumber} onChange={set('serialNumber')} placeholder="SN123456789" />
          </div>
          <div>
            <label className="label">Condition</label>
            <select id="asset-condition" className="input" value={form.condition} onChange={set('condition')}>
              {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Acquisition Date</label>
            <input id="asset-acq-date" type="date" className="input" value={form.acquisitionDate} onChange={set('acquisitionDate')} />
          </div>
          <div>
            <label className="label">Acquisition Cost (₹)</label>
            <input id="asset-cost" type="number" className="input" value={form.acquisitionCost} onChange={set('acquisitionCost')} placeholder="75000" />
          </div>
          <div className="col-span-2">
            <label className="label">Description</label>
            <textarea id="asset-desc" className="input" rows={2} value={form.description} onChange={set('description')} placeholder="Optional notes about this asset" />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
              <input id="is-shared" type="checkbox" checked={form.isShared} onChange={set('isShared')} className="accent-primary-500 w-4 h-4" />
              Shared Asset
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
              <input id="is-bookable" type="checkbox" checked={form.isBookable} onChange={set('isBookable')} className="accent-primary-500 w-4 h-4" />
              Bookable
            </label>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button id="register-asset-btn" onClick={() => mutation.mutate(form)} disabled={mutation.isPending || !form.assetTag || !form.name || !form.categoryId} className="btn-primary">
            {mutation.isPending ? 'Registering…' : 'Register Asset'}
          </button>
          <button onClick={() => navigate('/assets')} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  );
}
