import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Customer from './pages/Customer';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/admin/AdminLayout';
import Configuration from './pages/admin/Configuration';
import DevDashboard from './pages/admin/DevDashboard';
import ValidationScanner from './pages/admin/ValidationScanner';
import ManagementDashboard from './pages/admin/ManagementDashboard';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Customer />} />
        <Route path="/login" element={<Login />} />
        
        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/configuration" replace />} />
            <Route path="configuration" element={<Configuration />} />
            <Route path="dev" element={<DevDashboard />} />
            <Route path="validation" element={<ValidationScanner />} />
            <Route path="management" element={<ManagementDashboard />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}
