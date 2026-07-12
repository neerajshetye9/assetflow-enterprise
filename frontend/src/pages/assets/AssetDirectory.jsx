import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/axios';

const statusColor = { AVAILABLE:'green', ALLOCATED:'blue', UNDER_MAINTENANCE:'yellow', LOST:'red', RETIRED:'gray', DISPOSED:'gray' };
const conditionColor = { NEW:'green', GOOD:'green', FAIR:'yellow', POOR:'red', DAMAGED:'red' };

const fetchAssets = (params) => api.get('/assets', { params }).then((r) => r.data);
const fetchCats = () => api.get('/org/categories').then((r) => r.data);

export default function AssetDirectory() {
  const [filters, setFilters] = useState({ status: '', categoryId: '', search: '' });
  const { data: assets = [], isLoading } = useQuery({ queryKey: ['assets', filters], queryFn: () => fetchAssets(filters) });
  const { data: cats = [] } = useQuery({ queryKey: ['categories'], queryFn: fetchCats });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Asset Directory</h1>
          <p className="text-slate-400 text-sm mt-1">{assets.length} assets in your organization</p>
        </div>
        <Link to="/assets/new" className="btn-primary">+ Register Asset</Link>
      </div>

      {/* Filters */}
      <div className="card mb-6 p-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Search</label>
            <input id="asset-search" className="input" placeholder="Name, tag, serial…" value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          </div>
          <div>
            <label className="label">Status</label>
            <select id="asset-status-filter" className="input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">All Statuses</option>
              {['AVAILABLE','ALLOCATED','UNDER_MAINTENANCE','LOST','RETIRED','DISPOSED'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Category</label>
            <select id="asset-cat-filter" className="input" value={filters.categoryId} onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}>
              <option value="">All Categories</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Loading assets…</div>
        ) : assets.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No assets found. <Link to="/assets/new" className="text-primary-400 hover:text-primary-300">Register your first asset →</Link></div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-surface-border">
              <tr>
                <th className="table-header">Asset</th>
                <th className="table-header">Tag</th>
                <th className="table-header">Category</th>
                <th className="table-header">Location</th>
                <th className="table-header">Condition</th>
                <th className="table-header">Status</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id} className="table-row">
                  <td className="table-cell">
                    <div className="font-medium">{a.name}</div>
                    {a.serial_number && <div className="text-xs text-slate-400">S/N: {a.serial_number}</div>}
                  </td>
                  <td className="table-cell"><code className="text-xs bg-slate-700 px-1.5 py-0.5 rounded">{a.asset_tag}</code></td>
                  <td className="table-cell text-slate-400">{a.category_name}</td>
                  <td className="table-cell text-slate-400">{a.location_name || '—'}</td>
                  <td className="table-cell"><span className={`badge-${conditionColor[a.condition] || 'gray'}`}>{a.condition}</span></td>
                  <td className="table-cell"><span className={`badge-${statusColor[a.status] || 'gray'}`}>{a.status}</span></td>
                  <td className="table-cell">
                    <Link to={`/assets/${a.id}`} className="text-xs text-primary-400 hover:text-primary-300">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
