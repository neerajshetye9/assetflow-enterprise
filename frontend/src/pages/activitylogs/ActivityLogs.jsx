import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/axios';

const fetchLogs = (params) => api.get('/activity-logs', { params }).then((r) => r.data);
const actionColor = (a) => a.includes('CREATED') ? 'blue' : a.includes('APPROVED') || a.includes('RESOLVED') ? 'green' : a.includes('REJECTED') || a.includes('LOST') ? 'red' : 'gray';

export default function ActivityLogs() {
  const [filters, setFilters] = useState({ entityType: '', action: '', page: 1 });
  const { data, isLoading } = useQuery({ queryKey: ['activity-logs', filters], queryFn: () => fetchLogs(filters), keepPreviousData: true });
  const logs = data?.logs || [];
  const total = data?.total || 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Activity Logs</h1>
        <p className="text-slate-400 text-sm mt-1">{total} total audit trail entries</p>
      </div>

      <div className="card mb-4 p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Filter by Entity</label>
            <select id="log-entity-filter" className="input" value={filters.entityType} onChange={(e) => setFilters({ ...filters, entityType: e.target.value, page: 1 })}>
              <option value="">All Entities</option>
              {['asset','membership','asset_allocation','maintenance_request','resource_booking','audit_cycle'].map((e) => <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Search Action</label>
            <input id="log-action-filter" className="input" placeholder="e.g. ASSET_REGISTERED" value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value, page: 1 })} />
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-slate-400">Loading…</div> :
         logs.length === 0 ? <div className="p-8 text-center text-slate-400">No logs found.</div> : (
          <table className="w-full">
            <thead className="border-b border-surface-border">
              <tr>
                <th className="table-header">Time</th>
                <th className="table-header">Actor</th>
                <th className="table-header">Action</th>
                <th className="table-header">Entity</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="table-row">
                  <td className="table-cell text-slate-400 text-xs">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="table-cell">{l.actor_name}</td>
                  <td className="table-cell"><span className={`badge-${actionColor(l.action)}`}>{l.action.replace(/_/g, ' ')}</span></td>
                  <td className="table-cell text-slate-400 text-xs font-mono">{l.entity_type} · {l.entity_id?.slice(0, 8)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > 50 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-400">Page {filters.page} · {total} total</p>
          <div className="flex gap-2">
            <button onClick={() => setFilters(f => ({ ...f, page: Math.max(1, f.page - 1) }))} disabled={filters.page <= 1} className="btn-secondary text-sm py-1">← Prev</button>
            <button onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))} disabled={logs.length < 50} className="btn-secondary text-sm py-1">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
