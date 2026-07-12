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

// Placeholder for other branches (will be added when branches merge)
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
            <Route path="/dashboard" element={<Placeholder title="Dashboard" />} />

            {/* Org */}
            <Route path="/org/departments" element={<Departments />} />
            <Route path="/org/locations" element={<Locations />} />
            <Route path="/org/categories" element={<Categories />} />
            <Route path="/org/employees" element={<Employees />} />

            {/* Audit */}
            <Route path="/audit/cycles" element={<AuditCycles />} />
            <Route path="/audit/cycles/:id" element={<AuditCycleDetail />} />

            {/* Atharva's routes — placeholders */}
            <Route path="/assets/*" element={<Placeholder title="Asset Management" />} />
            <Route path="/allocations/*" element={<Placeholder title="Allocations" />} />
            <Route path="/transfers" element={<Placeholder title="Transfers" />} />
            <Route path="/returns" element={<Placeholder title="Returns" />} />
            <Route path="/maintenance/*" element={<Placeholder title="Maintenance" />} />

            {/* Vignesh's routes — placeholders */}
            <Route path="/resources" element={<Placeholder title="Resources" />} />
            <Route path="/bookings/*" element={<Placeholder title="Bookings" />} />
            <Route path="/notifications" element={<Placeholder title="Notifications" />} />
            <Route path="/activity-logs" element={<Placeholder title="Activity Logs" />} />
            <Route path="/reports/*" element={<Placeholder title="Reports" />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
