import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axios';

const fetchCats = () => api.get('/org/categories').then((r) => r.data);

export default function Categories() {
  const qc = useQueryClient();
  const { data: cats = [], isLoading } = useQuery({ queryKey: ['categories'], queryFn: fetchCats });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', description: '' });
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: (body) => api.post('/org/categories', body),
    onSuccess: () => { qc.invalidateQueries(['categories']); setShowForm(false); setForm({ name: '', code: '', description: '' }); },
    onError: (err) => setError(err.response?.data?.error || 'Failed'),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Asset Categories</h1>
          <p className="text-slate-400 text-sm mt-1">Electronics, Furniture, Vehicles and more</p>
        </div>
        <button id="add-cat-btn" onClick={() => setShowForm(true)} className="btn-primary">+ Add Category</button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">New Category</h3>
          {error && <div className="mb-3 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Name *</label>
              <input id="cat-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Electronics" />
            </div>
            <div>
              <label className="label">Code *</label>
              <input id="cat-code" className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="ELEC" />
            </div>
            <div className="col-span-2">
              <label className="label">Description</label>
              <input id="cat-desc" className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Laptops, monitors, accessories…" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button id="cat-save" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-3 p-8 text-center text-slate-400">Loading...</div>
        ) : cats.length === 0 ? (
          <div className="col-span-3 card text-center text-slate-400">No categories yet.</div>
        ) : cats.map((c) => (
          <div key={c.id} className="card hover:border-primary-500 transition-colors cursor-default">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-white">{c.name}</h3>
              <code className="text-xs bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">{c.code}</code>
            </div>
            <p className="text-slate-400 text-sm mb-3">{c.description || 'No description'}</p>
            <p className="text-xs text-slate-500">{c.asset_count || 0} assets</p>
          </div>
        ))}
      </div>
    </div>
  );
}
