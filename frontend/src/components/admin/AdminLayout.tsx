import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-[#0c0c0c] text-white flex" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      <AdminSidebar />
      <div className="flex-1 md:ml-64 bg-[#050505]">
        <Outlet />
      </div>
    </div>
  );
}
