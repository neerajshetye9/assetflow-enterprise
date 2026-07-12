import { useQuery } from '@tanstack/react-query';
import api from '../../lib/axios';

const fetchReport = (type) => api.get(`/reports/${type}`).then((r) => r.data);
const downloadCSV = async (type) => {
  try {
    const res = await api.get(`/reports/${type}?format=csv`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${type}_report.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch(e) { console.error('Export failed', e); }
};

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export default function Reports() {
  // Org Reports (may fail 403 if not admin, handled by boundary/ignore)
  const { data: assetReport, isLoading: loadingAssets } = useQuery({ queryKey: ['report-assets'], queryFn: () => fetchReport('assets'), retry: false });
  const { data: maintReport } = useQuery({ queryKey: ['report-maintenance'], queryFn: () => fetchReport('maintenance'), retry: false });
  const { data: allocReport } = useQuery({ queryKey: ['report-allocations'], queryFn: () => fetchReport('allocations'), retry: false });

  // Employee Reports (available to everyone)
  const { data: myAlloc } = useQuery({ queryKey: ['my-allocations'], queryFn: () => fetchReport('me/allocations') });
  const { data: myMaint } = useQuery({ queryKey: ['my-maintenance'], queryFn: () => fetchReport('me/maintenance') });
  const { data: myBookings } = useQuery({ queryKey: ['my-bookings'], queryFn: () => fetchReport('me/bookings') });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <p className="text-slate-400 text-sm mt-1">Organization-wide asset intelligence</p>
      </div>

      {/* Asset Summary */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-white">Asset Summary Report</h3>
          <button onClick={() => downloadCSV('assets')} className="btn-secondary text-xs px-3 py-1">Export CSV</button>
        </div>
        {loadingAssets ? <p className="text-slate-400 text-sm">Loading…</p> : assetReport ? (
          <>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="card py-3 text-center"><p className="text-2xl font-bold text-white">{assetReport.summary?.totalAssets || 0}</p><p className="text-xs text-slate-400">Total Assets</p></div>
              <div className="card py-3 text-center"><p className="text-2xl font-bold text-primary-400">{fmt(assetReport.summary?.totalValue || 0)}</p><p className="text-xs text-slate-400">Total Value</p></div>
              {Object.entries(assetReport.summary?.byStatus || {}).slice(0, 2).map(([s, c]) => (
                <div key={s} className="card py-3 text-center"><p className="text-2xl font-bold text-white">{c}</p><p className="text-xs text-slate-400">{s}</p></div>
              ))}
            </div>
            {/* Asset table */}
            <div className="overflow-auto max-h-64">
              <table className="w-full text-sm">
                <thead className="border-b border-surface-border">
                  <tr><th className="table-header">Asset</th><th className="table-header">Category</th><th className="table-header">Status</th><th className="table-header">Location</th><th className="table-header">Allocated To</th><th className="table-header">Cost</th></tr>
                </thead>
                <tbody>
                  {(assetReport.assets || []).map((a, i) => (
                    <tr key={i} className="table-row">
                      <td className="table-cell font-medium">{a.name}<div className="text-xs font-mono text-slate-400">{a.asset_tag}</div></td>
                      <td className="table-cell text-slate-400">{a.category}</td>
                      <td className="table-cell"><span className={`badge-${a.status === 'AVAILABLE' ? 'green' : a.status === 'ALLOCATED' ? 'blue' : 'gray'}`}>{a.status}</span></td>
                      <td className="table-cell text-slate-400">{a.location || '—'}</td>
                      <td className="table-cell text-slate-400">{a.allocated_to || '—'}</td>
                      <td className="table-cell text-slate-400">{a.acquisition_cost ? fmt(a.acquisition_cost) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>

      {/* Maintenance Report */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-white">Maintenance Report (Last 90 days)</h3>
          <button onClick={() => downloadCSV('maintenance')} className="btn-secondary text-xs px-3 py-1">Export CSV</button>
        </div>
        {maintReport && (
          <div className="grid grid-cols-4 gap-4">
            <div className="card py-3 text-center"><p className="text-2xl font-bold text-white">{maintReport.summary?.total || 0}</p><p className="text-xs text-slate-400">Total Requests</p></div>
            <div className="card py-3 text-center"><p className="text-2xl font-bold text-green-400">{maintReport.summary?.resolved || 0}</p><p className="text-xs text-slate-400">Resolved</p></div>
            <div className="card py-3 text-center"><p className="text-2xl font-bold text-yellow-400">{maintReport.summary?.avgResolutionHours || '—'}</p><p className="text-xs text-slate-400">Avg Hours to Resolve</p></div>
            {Object.entries(maintReport.summary?.byPriority || {}).slice(0,1).map(([p, c]) => (
              <div key={p} className="card py-3 text-center"><p className="text-2xl font-bold text-white">{c}</p><p className="text-xs text-slate-400">{p} Priority</p></div>
            ))}
          </div>
        )}
      </div>

      {/* Allocation Report */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-white">Allocation Report</h3>
          <button onClick={() => downloadCSV('allocations')} className="btn-secondary text-xs px-3 py-1">Export CSV</button>
        </div>
        {allocReport && (
          <div className="overflow-auto max-h-48">
            <table className="w-full text-sm">
              <thead className="border-b border-surface-border">
                <tr><th className="table-header">Asset</th><th className="table-header">Employee</th><th className="table-header">Department</th><th className="table-header">Since</th><th className="table-header">Return By</th></tr>
              </thead>
              <tbody>
                {(allocReport.allocations || []).filter(a => a.status === 'ACTIVE').map((a, i) => (
                  <tr key={i} className="table-row">
                    <td className="table-cell font-medium">{a.asset_name}</td>
                    <td className="table-cell">{a.employee || '—'}</td>
                    <td className="table-cell text-slate-400">{a.department || '—'}</td>
                    <td className="table-cell text-slate-400">{new Date(a.allocated_at).toLocaleDateString()}</td>
                    <td className="table-cell text-slate-400">{a.expected_return_at ? new Date(a.expected_return_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MY HISTORY SECTION */}
      <div className="mt-12 pt-8 border-t border-surface-border">
        <h2 className="text-xl font-bold text-white mb-6">My History</h2>
        <div className="grid grid-cols-3 gap-6">
          <div className="card text-center">
            <h3 className="font-semibold text-white mb-2">My Allocations</h3>
            <p className="text-2xl font-bold text-primary-400 mb-4">{myAlloc?.allocations?.length || 0}</p>
            <button onClick={() => downloadCSV('me/allocations')} className="btn-secondary w-full">Export Allocations CSV</button>
          </div>
          <div className="card text-center">
            <h3 className="font-semibold text-white mb-2">My Maintenance Requests</h3>
            <p className="text-2xl font-bold text-primary-400 mb-4">{myMaint?.maintenance?.length || 0}</p>
            <button onClick={() => downloadCSV('me/maintenance')} className="btn-secondary w-full">Export Maintenance CSV</button>
          </div>
          <div className="card text-center">
            <h3 className="font-semibold text-white mb-2">My Bookings</h3>
            <p className="text-2xl font-bold text-primary-400 mb-4">{myBookings?.bookings?.length || 0}</p>
            <button onClick={() => downloadCSV('me/bookings')} className="btn-secondary w-full">Export Bookings CSV</button>
          </div>
        </div>
      </div>

    </div>
  );
}
