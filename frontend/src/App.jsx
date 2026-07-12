import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import AppLayout, { GuestLayout } from './components/layout/AppLayout';

// Auth pages
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Org pages
import Departments from './pages/org/Departments';
import Locations from './pages/org/Locations';
import Categories from './pages/org/Categories';
import Employees from './pages/org/Employees';

// Audit pages
import AuditCycles from './pages/audit/AuditCycles';
import AuditCycleDetail from './pages/audit/AuditCycleDetail';

// Atharva's pages
import AssetDirectory from './pages/assets/AssetDirectory';
import AssetDetail from './pages/assets/AssetDetail';
import RegisterAsset from './pages/assets/RegisterAsset';
import Allocations from './pages/allocations/Allocations';
import Maintenance from './pages/maintenance/Maintenance';

// Vignesh's pages
import Dashboard from './pages/dashboard/Dashboard';
import Resources from './pages/resources/Resources';
import Notifications from './pages/notifications/Notifications';
import ActivityLogs from './pages/activitylogs/ActivityLogs';
import Reports from './pages/reports/Reports';

const Placeholder = ({ title }) => (
  <div className="card">
    <h2 className="text-xl font-semibold text-slate-100">{title}</h2>
    <p className="text-slate-400 mt-2">This module is being implemented in its feature branch.</p>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60, retry: 1 } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Guest routes */}
          <Route element={<GuestLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Route>

          {/* Protected routes */}
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />


            {/* Org */}
            <Route path="/org/departments" element={<Departments />} />
            <Route path="/org/locations" element={<Locations />} />
            <Route path="/org/categories" element={<Categories />} />
            <Route path="/org/employees" element={<Employees />} />

            {/* Audit */}
            <Route path="/audit/cycles" element={<AuditCycles />} />
            <Route path="/audit/cycles/:id" element={<AuditCycleDetail />} />

            {/* Atharva's routes */}
            <Route path="/assets" element={<AssetDirectory />} />
            <Route path="/assets/new" element={<RegisterAsset />} />
            <Route path="/assets/:id" element={<AssetDetail />} />
            <Route path="/allocations" element={<Allocations />} />
            <Route path="/allocations/request" element={<Allocations />} />
            <Route path="/allocations/active" element={<Allocations />} />
            <Route path="/transfers" element={<Placeholder title="Transfers" />} />
            <Route path="/returns" element={<Placeholder title="Returns" />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/maintenance/new" element={<Maintenance />} />


            {/* Vignesh's routes */}
            <Route path="/resources" element={<Resources />} />
            <Route path="/bookings" element={<Resources />} />
            <Route path="/bookings/calendar" element={<Resources />} />
            <Route path="/bookings/my" element={<Resources />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/activity-logs" element={<ActivityLogs />} />
            <Route path="/reports" element={<Reports />} />

          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
