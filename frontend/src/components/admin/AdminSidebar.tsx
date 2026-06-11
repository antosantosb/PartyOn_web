import { NavLink, Link } from 'react-router-dom';
import { Settings, Terminal, ScanLine, BarChart3, ArrowLeft, Users, Tag } from 'lucide-react';
import { useStore } from '../../lib/store';

export default function AdminSidebar() {
  const store = useStore();
  const primaryColor = store.theme?.primaryColor || '#00ffcc';
  const role = localStorage.getItem('userRole') || 'STAFF';
  const logoUrl = store.eventData?.logoText1;

  const navItems = [];
  if (role === 'STAFF') {
    navItems.push({ name: 'Validación', path: '/admin/validation', icon: ScanLine });
  } else {
    navItems.push({ name: 'Configuración', path: '/admin/configuration', icon: Settings });
    navItems.push({ name: 'Equipo', path: '/admin/users', icon: Users });
    navItems.push({ name: 'Promotores', path: '/admin/promotores', icon: Tag });
    if (role === 'DEV') {
      navItems.push({ name: 'Dev & Logs', path: '/admin/dev', icon: Terminal });
    }
    navItems.push({ name: 'Validación', path: '/admin/validation', icon: ScanLine });
    navItems.push({ name: 'Gestión', path: '/admin/management', icon: BarChart3 });
  }

  return (
    <div className="hidden md:flex w-64 h-screen bg-[#0c0c0c] border-r border-white/8 flex-col fixed left-0 top-0">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
            <img
              src={(logoUrl && (logoUrl.startsWith('http') || logoUrl.startsWith('/'))) ? logoUrl : "/logo.PNG"}
              alt="PartyOn"
              style={{ height: '72px', width: 'auto', objectFit: 'contain' }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </Link>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${isActive
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
                }`
              }
              style={({ isActive }) => isActive ? { borderLeft: `3px solid ${primaryColor}` } : {}}
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-6">
        <NavLink
          to="/"
          className="flex items-center gap-2 text-xs font-mono text-white/30 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-3 h-3" /> Volver a Tienda
        </NavLink>

        <button
          onClick={() => {
            localStorage.removeItem('adminToken');
            window.location.href = '/login';
          }}
          className="flex items-center gap-2 text-xs font-mono text-red-500/50 hover:text-red-400 transition-colors w-full"
        >
          <ScanLine className="w-3 h-3 rotate-45" /> Cerrar Sesión
        </button>

      </div>
    </div>
  );
}
