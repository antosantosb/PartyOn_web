import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Calendar, 
  ArrowLeft, 
  Loader2, 
  Receipt,
  ChevronRight,
  Plus,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/api-client';
import { format } from 'date-fns';

interface AnalyticsData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  ticketsSold: number;
  totalCapacity: number;
  expenses: any[];
}

export default function ManagementDashboard() {
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      const res = await apiFetch('/admin/events');
      const data = await res.json();
      if (data.events && data.events.length > 0) {
        setAllEvents(data.events);
        const active = data.events.find((e: any) => e.status === 'ACTIVE') || data.events[0];
        setSelectedEventId(active.id);
      }
    } catch (e) {
      console.error(e);
      setError('Error al cargar eventos.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async (id: string) => {
    setAnalyticsLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/admin/management/analytics/${id}`);
      const data = await res.json();
      if (data.success) {
        setAnalytics(data.analytics);
      } else {
        setError(data.error || 'Error al cargar analítica.');
      }
    } catch (e) {
      console.error(e);
      setError('No se pudo conectar con el servidor de análisis.');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchAnalytics(selectedEventId);
    }
  }, [selectedEventId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#00ffcc]" />
      </div>
    );
  }

  const capacityPercentage = analytics 
    ? Math.min(Math.round((analytics.ticketsSold / (analytics.totalCapacity || 1)) * 100), 100)
    : 0;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-10 font-sans selection:bg-[#00ffcc]/30">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight text-white flex items-center gap-4">
              Dashboard de Gestión
              {analyticsLoading && <Loader2 className="w-5 h-5 animate-spin text-white/20" />}
            </h1>
            <p className="text-white/40 text-lg">Operational & Financial Intelligence MVP v1</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 flex items-center gap-3 hover:border-white/20 transition-colors">
              <Calendar className="w-4 h-4 text-[#00ffcc]" />
              <select 
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="bg-transparent border-none focus:outline-none text-sm font-semibold pr-8 cursor-pointer"
              >
                {allEvents.map(e => (
                  <option key={e.id} value={e.id} className="bg-[#121212]">
                    {e.name} ({e.status})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {analytics ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Top Row: Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard 
                title="Ingresos Totales"
                value={formatCurrency(analytics.totalRevenue)}
                icon={<TrendingUp className="w-6 h-6 text-[#00ffcc]" />}
                trend="Ventas acumuladas"
                color="text-[#00ffcc]"
                bg="from-[#00ffcc]/5"
              />
              <StatCard 
                title="Gastos Totales"
                value={formatCurrency(analytics.totalExpenses)}
                icon={<TrendingDown className="w-6 h-6 text-[#ff007f]" />}
                trend={`${analytics.expenses.length} gastos operativos`}
                color="text-[#ff007f]"
                bg="from-[#ff007f]/5"
              />
              <StatCard 
                title="Beneficio Neto"
                value={formatCurrency(analytics.netProfit)}
                icon={<DollarSign className="w-6 h-6 text-blue-400" />}
                trend="Balance de caja"
                color="text-blue-400"
                bg="from-blue-400/5"
              />
            </div>

            {/* Middle Row: Progress & Capacity */}
            <div className="bg-[#121212] border border-white/8 rounded-2xl p-8 relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-3">
                    <Users className="w-5 h-5 text-white/40" /> Capacidad del Evento
                  </h2>
                  <p className="text-white/40 text-sm mt-1">Monitoreo de ocupación en tiempo real.</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-3xl font-bold tracking-tighter">{analytics.ticketsSold} <span className="text-white/20 text-xl font-medium">/ {analytics.totalCapacity}</span></span>
                  <span className="text-[10px] font-mono text-[#00ffcc] uppercase tracking-widest mt-1">Entradas Vendidas</span>
                </div>
              </div>

              <div className="space-y-6">
                <div className="h-6 bg-white/5 rounded-full p-1 border border-white/5">
                  <div 
                    className="h-full bg-gradient-to-r from-[#00ffcc] via-blue-500 to-[#ff007f] rounded-full transition-all duration-1000 relative group"
                    style={{ width: `${capacityPercentage}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full opacity-0 group-hover:opacity-100" />
                  </div>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-white/20 uppercase tracking-widest">
                  <span>Capacidad 0%</span>
                  <span className="text-white/50">{capacityPercentage}% Completado</span>
                  <span>Full 100%</span>
                </div>
              </div>

              {/* Decorative grid background */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            </div>

            {/* Bottom Row: Expenses Table */}
            <div className="bg-[#121212] border border-white/8 rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-white/8 flex items-center justify-between bg-white/[0.02]">
                <h2 className="text-lg font-bold flex items-center gap-3">
                  <Receipt className="w-5 h-5 text-white/40" /> Registro Detallado de Gastos
                </h2>
                <button className="text-[10px] font-mono bg-[#00ffcc]/10 text-[#00ffcc] hover:bg-[#00ffcc]/20 transition-all px-4 py-2 rounded-lg flex items-center gap-2 border border-[#00ffcc]/20 uppercase tracking-widest font-bold">
                  <Plus className="w-3.5 h-3.5" /> Registrar Gasto
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] bg-white/[0.01]">
                      <th className="px-8 py-5 border-b border-white/5">Concepto / Proveedor</th>
                      <th className="px-8 py-5 border-b border-white/5">Categoría</th>
                      <th className="px-8 py-5 border-b border-white/5">Fecha</th>
                      <th className="px-8 py-5 border-b border-white/5 text-right">Importe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {analytics.expenses.length > 0 ? (
                      analytics.expenses.map((exp: any) => (
                        <tr key={exp.id} className="hover:bg-white/[0.03] transition-colors group">
                          <td className="px-8 py-5 font-medium text-white/80 group-hover:text-white">{exp.name}</td>
                          <td className="px-8 py-5">
                            <span className="text-[9px] font-bold bg-white/5 px-2.5 py-1 rounded-md border border-white/10 uppercase tracking-wider text-white/60">
                              {exp.category}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-white/30 text-xs font-mono">
                            {format(new Date(exp.createdAt), 'dd MMM yyyy')}
                          </td>
                          <td className="px-8 py-5 text-right font-mono font-bold text-[#ff007f] text-lg">
                            -{formatCurrency(exp.amount)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-8 py-20 text-center text-white/10 text-sm font-medium tracking-wide">
                          No se han registrado gastos para este evento todavía.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : !analyticsLoading && (
          <div className="h-64 flex flex-col items-center justify-center text-white/20 italic gap-4">
             <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 opacity-20" />
             </div>
             Selecciona un evento para visualizar los datos financieros.
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend, color, bg }: any) {
  return (
    <div className={`bg-[#121212] border border-white/8 rounded-2xl p-7 relative overflow-hidden group hover:border-white/20 transition-all shadow-xl`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${bg} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 group-hover:scale-110 group-hover:border-white/20 transition-all duration-500 shadow-inner">
            {icon}
          </div>
          <div className="text-[9px] font-mono text-white/20 uppercase tracking-[0.25em] font-bold">Live Data</div>
        </div>
        
        <div>
          <p className="text-xs text-white/30 font-bold uppercase tracking-widest mb-1.5">{title}</p>
          <p className={`text-4xl font-black tracking-tighter ${color}`}>{value}</p>
        </div>
        
        <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-between">
          <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">{trend}</span>
          <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-white/40 group-hover:translate-x-1 transition-all" />
        </div>
      </div>
      
      {/* Subtle corner light effect */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.02] blur-3xl rounded-full -mr-12 -mt-12" />
    </div>
  );
}
