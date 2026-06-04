import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Customer from './pages/Customer';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/admin/AdminLayout';
import Configuration from './pages/admin/Configuration';
import DevDashboard from './pages/admin/DevDashboard';
import ValidationScanner from './pages/admin/ValidationScanner';
import ManagementDashboard from './pages/admin/ManagementDashboard';

function RoleGuard({ allowedRoles, fallbackPath }: { allowedRoles: string[]; fallbackPath: string }) {
  const role = localStorage.getItem('userRole');
  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to={fallbackPath} replace />;
  }
  return <Outlet />;
}

export default function App() {
  const userRole = localStorage.getItem('userRole');
  const defaultRedirect = userRole === 'STAFF' ? '/admin/validation' : '/admin/configuration';

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Customer />} />
        <Route path="/login" element={<Login />} />
        
        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to={defaultRedirect} replace />} />
            
            {/* ADMIN and DEV only routes */}
            <Route element={<RoleGuard allowedRoles={['ADMIN', 'DEV']} fallbackPath="/admin/validation" />}>
              <Route path="configuration" element={<Configuration />} />
              <Route path="management" element={<ManagementDashboard />} />
            </Route>

            {/* DEV only routes */}
            <Route element={<RoleGuard allowedRoles={['DEV']} fallbackPath="/admin/configuration" />}>
              <Route path="dev" element={<DevDashboard />} />
            </Route>

            {/* ValidationScanner accessible by DEV, ADMIN, and STAFF */}
            <Route path="validation" element={<ValidationScanner />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}
