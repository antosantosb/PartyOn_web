import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout() {
  useEffect(() => {
    document.body.classList.add('no-grain');
    return () => {
      document.body.classList.remove('no-grain');
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-white flex" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      <AdminSidebar />
      <div className="flex-1 min-w-0 bg-[#050505] md:ml-64">
        <Outlet />
      </div>
    </div>
  );
}
