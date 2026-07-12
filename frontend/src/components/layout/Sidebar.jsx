import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/axios';

const navGroups = [
  {
    label: 'Organization',
    items: [
      { to: '/org/departments', label: 'Departments', icon: '🏢' },
      { to: '/org/locations', label: 'Locations', icon: '📍' },
      { to: '/org/categories', label: 'Asset Categories', icon: '🏷️' },
      { to: '/org/employees', label: 'Employees', icon: '👥' },
    ],
  },
  {
    label: 'Assets',
    items: [
      { to: '/assets', label: 'Asset Directory', icon: '📦' },
      { to: '/assets/new', label: 'Register Asset', icon: '➕' },
      { to: '/allocations/active', label: 'Allocations', icon: '🔗' },
      { to: '/transfers', label: 'Transfers', icon: '↔️' },
      { to: '/returns', label: 'Returns', icon: '↩️' },
      { to: '/maintenance', label: 'Maintenance', icon: '🔧' },
    ],
  },
  {
    label: 'Resources & Bookings',
    items: [
      { to: '/resources', label: 'Resources', icon: '🏠' },
      { to: '/bookings/calendar', label: 'Booking Calendar', icon: '📅' },
      { to: '/bookings/my', label: 'My Bookings', icon: '📋' },
    ],
  },
  {
    label: 'Audit',
    items: [
      { to: '/audit/cycles', label: 'Audit Cycles', icon: '🔍' },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: '📊' },
      { to: '/reports', label: 'Reports', icon: '📈' },
      { to: '/notifications', label: 'Notifications', icon: '🔔' },
      { to: '/activity-logs', label: 'Activity Logs', icon: '📝' },
    ],
  },
];

export default function Sidebar() {
  const { user, membership, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await api.post('/auth/logout', { refreshToken: useAuthStore.getState().refreshToken }); } catch {}
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 min-h-screen bg-surface-card border-r border-surface-border flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-surface-border">
        <h1 className="text-lg font-bold text-white tracking-tight">
          <span className="text-primary-500">Asset</span>Flow
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">{membership?.organization?.name || 'Enterprise'}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">{group.label}</p>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive ? 'bg-primary-600 text-white font-medium' : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'
                  }`
                }
              >
                <span>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-surface-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-bold">
            {user?.fullName?.[0] || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.fullName}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="w-full btn-secondary text-sm py-1.5">Sign out</button>
      </div>
    </aside>
  );
}
