import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/axios';

const fetchDash = () => api.get('/dashboard').then((r) => r.data);

const KpiCard = ({ label, value, sub, color = 'blue' }) => {
  const colors = { blue: 'text-primary-400', green: 'text-green-400', yellow: 'text-yellow-400', red: 'text-red-400', gray: 'text-slate-400' };
  return (
    <div className="card">
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold ${colors[color]}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
};

const actionColors = {
  ASSET_REGISTERED: 'blue', ALLOCATION_APPROVED: 'green', RETURN_APPROVED: 'green',
  MAINTENANCE_REQUESTED: 'yellow', MAINTENANCE_RESOLVED: 'green', AUDIT_CYCLE_CREATED: 'blue',
  EMPLOYEE_CREATED: 'blue', BOOKING_CREATED: 'green', DISCREPANCY_LOGGED: 'red',
};

export default function Dashboard() {
  const { data: dash, isLoading, error } = useQuery({ queryKey: ['dashboard'], queryFn: fetchDash });

  if (isLoading) return <div className="p-8 text-center text-slate-400">Loading dashboard…</div>;
  if (error) return <div className="p-8 text-center text-red-400">Failed to load dashboard. Are you signed in to an organization?</div>;

  const assets = dash?.assets || {};
  const totalValue = parseFloat(assets.total_value || 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Your organization's asset overview</p>
      </div>

      {/* KPI Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Assets" value={assets.total || 0} sub={`₹${(totalValue/100000).toFixed(1)}L total value`} color="blue" />
        <KpiCard label="Available" value={assets.available || 0} color="green" />
        <KpiCard label="Allocated" value={assets.allocated || 0} color="blue" />
        <KpiCard label="Under Maintenance" value={assets.under_maintenance || 0} color="yellow" />
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Pending Allocations" value={dash?.pendingAllocations || 0} sub="Awaiting approval" color={dash?.pendingAllocations > 0 ? 'yellow' : 'gray'} />
        <KpiCard label="Today's Bookings" value={dash?.todayBookings || 0} color="blue" />
        <KpiCard label="Maintenance Open" value={(dash?.maintenance?.pending || 0) + (dash?.maintenance?.in_progress || 0)} sub={`${dash?.maintenance?.resolved_last_30d || 0} resolved (30d)`} color="yellow" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Active Audit */}
        <div className="col-span-1">
          {dash?.activeAudit ? (
            <div className="card h-full">
              <h3 className="font-semibold text-white mb-3">Active Audit</h3>
              <p className="text-sm text-slate-300 mb-2">{dash.activeAudit.name}</p>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 bg-slate-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-primary-500 transition-all"
                    style={{ width: `${dash.activeAudit.total_items ? (dash.activeAudit.verified_items / dash.activeAudit.total_items) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400">{dash.activeAudit.verified_items}/{dash.activeAudit.total_items}</span>
              </div>
              <Link to={`/audit/cycles/${dash.activeAudit.id}`} className="text-xs text-primary-400 hover:text-primary-300">View Audit →</Link>
            </div>
          ) : (
            <div className="card h-full flex items-center justify-center">
              <div className="text-center">
                <p className="text-slate-400 text-sm mb-2">No active audit</p>
                <Link to="/audit/cycles" className="text-xs text-primary-400 hover:text-primary-300">Start one →</Link>
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="col-span-2">
          <div className="card">
            <h3 className="font-semibold text-white mb-3">Recent Activity</h3>
            {!dash?.recentActivity?.length ? (
              <p className="text-slate-400 text-sm">No recent activity.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {dash.recentActivity.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 py-1.5 border-b border-surface-border last:border-0">
                    <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 bg-${actionColors[a.action] || 'slate'}-400`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 truncate">{a.action.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-slate-500">{a.actor_name} · {new Date(a.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Register Asset', to: '/assets/new', icon: '📦' },
            { label: 'New Booking', to: '/bookings', icon: '📅' },
            { label: 'Report Maintenance', to: '/maintenance', icon: '🔧' },
            { label: 'Start Audit', to: '/audit/cycles', icon: '🔍' },
          ].map((a) => (
            <Link key={a.to} to={a.to} className="card text-center hover:border-primary-500 transition-colors cursor-pointer py-4">
              <div className="text-2xl mb-2">{a.icon}</div>
              <p className="text-sm text-slate-300">{a.label}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
