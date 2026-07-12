import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/axios';

const fetchAsset = (id) => api.get(`/assets/${id}`).then((r) => r.data);
const statusColor = { AVAILABLE:'green', ALLOCATED:'blue', UNDER_MAINTENANCE:'yellow', LOST:'red', RETIRED:'gray', DISPOSED:'gray' };

export default function AssetDetail() {
  const { id } = useParams();
  const { data: asset, isLoading } = useQuery({ queryKey: ['asset', id], queryFn: () => fetchAsset(id) });

  if (isLoading) return <div className="p-8 text-center text-slate-400">Loading…</div>;
  if (!asset) return <div className="p-8 text-center text-red-400">Asset not found</div>;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{asset.name}</h1>
          <p className="text-slate-400 text-sm mt-1">Tag: <code className="text-xs bg-slate-700 px-1.5 py-0.5 rounded">{asset.asset_tag}</code></p>
        </div>
        <span className={`badge-${statusColor[asset.status] || 'gray'} text-sm px-3 py-1`}>{asset.status}</span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Category</p>
          <p className="font-semibold text-white">{asset.category_name}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Location</p>
          <p className="font-semibold text-white">{asset.location_name || '—'}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Condition</p>
          <p className="font-semibold text-white">{asset.condition}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Serial Number</p>
          <p className="font-semibold text-white font-mono">{asset.serial_number || '—'}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Acquisition Date</p>
          <p className="font-semibold text-white">{asset.acquisition_date ? new Date(asset.acquisition_date).toLocaleDateString() : '—'}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Cost</p>
          <p className="font-semibold text-white">{asset.acquisition_cost ? `₹${Number(asset.acquisition_cost).toLocaleString()}` : '—'}</p>
        </div>
      </div>

      {asset.currentAllocation && (
        <div className="card">
          <h3 className="font-semibold text-white mb-3">Current Allocation</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><p className="text-slate-400">Allocated to</p><p className="text-white font-medium">{asset.currentAllocation.employee_name || '—'}</p></div>
            <div><p className="text-slate-400">Department</p><p className="text-white">{asset.currentAllocation.department_name || '—'}</p></div>
            <div><p className="text-slate-400">Expected return</p><p className="text-white">{asset.currentAllocation.expected_return_at ? new Date(asset.currentAllocation.expected_return_at).toLocaleDateString() : 'No deadline'}</p></div>
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="font-semibold text-white mb-3">Status History</h3>
        {!asset.statusHistory?.length ? (
          <p className="text-slate-400 text-sm">No history available</p>
        ) : (
          <div className="space-y-2">
            {asset.statusHistory.map((h, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="text-slate-500 text-xs w-36">{new Date(h.created_at).toLocaleString()}</span>
                <span className="badge-gray">{h.old_status || '—'}</span>
                <span className="text-slate-400">→</span>
                <span className="badge-blue">{h.new_status}</span>
                <span className="text-slate-400">{h.reason || ''}</span>
                <span className="text-slate-500 text-xs ml-auto">{h.changed_by_name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {asset.status === 'AVAILABLE' && (
          <Link to={`/allocations/request?assetId=${asset.id}`} className="btn-primary">Request Allocation</Link>
        )}
        {asset.status !== 'RETIRED' && asset.status !== 'DISPOSED' && (
          <Link to={`/maintenance/new?assetId=${asset.id}`} className="btn-secondary">Report Issue</Link>
        )}
        <Link to="/assets" className="btn-secondary">← Back</Link>
      </div>
    </div>
  );
}
