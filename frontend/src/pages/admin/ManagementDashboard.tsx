import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Calendar, 
  Loader2, 
  Receipt,
  ChevronRight,
  Plus,
  AlertCircle,
  Edit,
  Trash2,
  Download,
  X
} from 'lucide-react';
import { apiFetch } from '../../lib/api-client';
import { format } from 'date-fns';

interface Expense {
  id: string;
  name: string;
  amount: number;
  category: string;
  createdAt: string;
}

interface SalesByDay {
  date: string;
  count: number;
  revenue: number;
}

interface SalesByHour {
  hour: string;
  count: number;
}

interface TicketTypeSales {
  id: string;
  name: string;
  sold: number;
  revenue: number;
  maxStock: number;
}

interface AnalyticsData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  ticketsSold: number;
  totalCapacity: number;
  expenses: Expense[];
  salesByDay: SalesByDay[];
  salesByHour: SalesByHour[];
  salesByTicketType: TicketTypeSales[];
}

const EXPENSE_CATEGORIES = [
  { value: 'GENERAL', label: 'General / Otros' },
  { value: 'BAR', label: 'Bar y Consumibles' },
  { value: 'VENUE', label: 'Alquiler Recinto & Sonido' },
  { value: 'DJ', label: 'Caché DJs / Artistas' },
  { value: 'MARKETING', label: 'Marketing / RRPP' },
  { value: 'STAFF', label: 'Seguridad / Personal' },
];

export default function ManagementDashboard() {
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States for Expense Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('GENERAL');
  const [modalLoading, setModalLoading] = useState(false);

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

  const handleExportCSV = async () => {
    if (!selectedEventId) return;
    try {
      const activeEvent = allEvents.find(e => e.id === selectedEventId);
      const eventName = activeEvent ? activeEvent.name.toLowerCase().replace(/\s+/g, '-') : 'ventas';
      const res = await apiFetch(`/admin/management/export-csv/${selectedEventId}`);
      if (!res.ok) throw new Error("Error generating CSV");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `entradas-${eventName}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("No se pudo exportar el listado de ventas.");
    }
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setEditingExpense(null);
    setExpenseName('');
    setExpenseAmount('');
    setExpenseCategory('GENERAL');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (exp: Expense) => {
    setModalMode('edit');
    setEditingExpense(exp);
    setExpenseName(exp.name);
    setExpenseAmount(String(exp.amount));
    setExpenseCategory(exp.category);
    setIsModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseName.trim() || !expenseAmount || !selectedEventId) return;

    setModalLoading(true);
    try {
      const url = modalMode === 'create' 
        ? '/admin/management/expenses' 
        : `/admin/management/expenses/${editingExpense?.id}`;
      const method = modalMode === 'create' ? 'POST' : 'PUT';

      const response = await apiFetch(url, {
        method,
        body: JSON.stringify({
          name: expenseName,
          amount: parseFloat(expenseAmount),
          category: expenseCategory,
          eventId: selectedEventId
        })
      });

      const result = await response.json();
      if (result.success) {
        setIsModalOpen(false);
        fetchAnalytics(selectedEventId);
      } else {
        alert(result.error || 'Error al guardar el gasto');
      }
    } catch (err) {
      console.error(err);
      alert('Error en el servidor al intentar guardar el gasto');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar este gasto?")) return;

    try {
      const response = await apiFetch(`/admin/management/expenses/${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      if (result.success) {
        fetchAnalytics(selectedEventId);
      } else {
        alert(result.error || 'Error al eliminar el gasto');
      }
    } catch (err) {
      console.error(err);
      alert('Error al conectar con el servidor.');
    }
  };

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

  // Lógica de cálculo de coordenadas para el gráfico de línea SVG
  const renderLineChart = () => {
    if (!analytics || !analytics.salesByDay || analytics.salesByDay.length === 0) {
      return (
        <div className="h-48 flex items-center justify-center text-white/20 italic text-sm border border-white/5 rounded-xl bg-white/[0.01]">
          No hay suficientes ventas registradas para generar el gráfico.
        </div>
      );
    }

    let runningTotal = 0;
    const points = analytics.salesByDay.map((d) => {
      runningTotal += d.count;
      return { date: d.date, value: runningTotal };
    });

    const maxValue = Math.max(...points.map(p => p.value), 5);
    const width = 500;
    const height = 180;
    const padding = 30;

    const xCoords = points.map((_, i) => 
      padding + (i / (points.length - 1 || 1)) * (width - 2 * padding)
    );
    const yCoords = points.map(p => 
      height - padding - (p.value / maxValue) * (height - 2 * padding)
    );

    let pathD = "";
    let areaD = "";

    if (points.length > 0) {
      pathD = `M ${xCoords[0]} ${yCoords[0]}`;
      areaD = `M ${xCoords[0]} ${height - padding}`;

      for (let i = 0; i < points.length; i++) {
        pathD += ` L ${xCoords[i]} ${yCoords[i]}`;
        areaD += ` L ${xCoords[i]} ${yCoords[i]}`;
      }

      areaD += ` L ${xCoords[xCoords.length - 1]} ${height - padding} Z`;
    }

    return (
      <div className="relative group">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00ffcc" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#00ffcc" stopOpacity="0.00" />
            </linearGradient>
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grid lines horizontal */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.08)" />

          {/* Area under curve */}
          {areaD && <path d={areaD} fill="url(#chartGrad)" />}

          {/* Line path */}
          {pathD && (
            <path 
              d={pathD} 
              fill="none" 
              stroke="#00ffcc" 
              strokeWidth="2.5" 
              filter="url(#neonGlow)"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Circles at nodes */}
          {points.map((p, i) => (
            <g key={i} className="group/node cursor-pointer">
              <circle 
                cx={xCoords[i]} 
                cy={yCoords[i]} 
                r="4" 
                fill="#121212" 
                stroke="#00ffcc" 
                strokeWidth="2" 
                className="transition-all duration-300 hover:r-6 hover:fill-[#00ffcc]"
              />
              <title>{`${p.date}: ${p.value} entradas acumuladas`}</title>
            </g>
          ))}
        </svg>
        <div className="flex justify-between text-[8px] font-mono text-white/30 uppercase mt-2 px-6">
          <span>{points[0]?.date}</span>
          <span>Curva de Ventas (Acumulada)</span>
          <span>{points[points.length - 1]?.date}</span>
        </div>
      </div>
    );
  };

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
            <p className="text-white/40 text-lg">Inteligencia Operacional y Financiera</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Event Selector */}
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

            {/* CSV Export Button */}
            <button 
              onClick={handleExportCSV}
              disabled={!selectedEventId}
              className="text-xs font-mono bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-all px-4 py-2.5 rounded-xl flex items-center gap-2 border border-white/10 uppercase tracking-widest font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </button>
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
                value={formatCurrency(Math.round((analytics.totalRevenue - analytics.totalExpenses) * 100) / 100)}
                icon={<DollarSign className="w-6 h-6 text-blue-400" />}
                trend="Balance de caja (con decimales)"
                color="text-blue-400"
                bg="from-blue-400/5"
              />
            </div>

            {/* Middle Row: Charts & Capacity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Chart Sales Curve */}
              <div className="lg:col-span-2 bg-[#121212] border border-white/8 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-md font-bold text-white/90">Curva de Ventas</h3>
                  <p className="text-white/40 text-xs mt-0.5">Evolución de venta de entradas acumuladas por fecha.</p>
                </div>
                <div className="mt-4">
                  {renderLineChart()}
                </div>
              </div>

              {/* Ticket Type Distribution Bar Chart */}
              <div className="bg-[#121212] border border-white/8 rounded-2xl p-6 flex flex-col justify-between space-y-6">
                <div>
                  <h3 className="text-md font-bold text-white/90">Ventas por Tipo de Entrada</h3>
                  <p className="text-white/40 text-xs mt-0.5">Ingresos y stock consumido por cada categoría.</p>
                </div>
                <div className="space-y-4 overflow-y-auto max-h-60 pr-2">
                  {analytics.salesByTicketType && analytics.salesByTicketType.length > 0 ? (
                    analytics.salesByTicketType.map(type => {
                      const pct = type.maxStock ? Math.min(Math.round((type.sold / type.maxStock) * 100), 100) : 0;
                      return (
                        <div key={type.id} className="space-y-2">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="font-bold text-white/80">{type.name}</span>
                            <span className="text-white/40">{type.sold} vendidos ({formatCurrency(type.revenue)})</span>
                          </div>
                          <div className="h-2.5 bg-white/5 border border-white/5 rounded-md overflow-hidden relative">
                            <div 
                              className="h-full bg-gradient-to-r from-[#ff007f] to-[#00ffcc] transition-all duration-500 rounded-md" 
                              style={{ width: `${type.maxStock ? pct : (type.sold ? 100 : 0)}%` }} 
                            />
                          </div>
                          <div className="flex justify-between text-[9px] font-mono text-white/30 uppercase">
                            <span>Stock: {type.maxStock || 'Ilimitado'}</span>
                            <span>{type.maxStock ? `${pct}%` : 'N/A'}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-white/20 italic text-xs py-8 text-center">No hay categorías registradas.</div>
                  )}
                </div>
              </div>

            </div>

            {/* Capacity Progress Bar */}
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

              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            </div>

            {/* Bottom Row: Expenses Table */}
            <div className="bg-[#121212] border border-white/8 rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-white/8 flex items-center justify-between bg-white/[0.02]">
                <h2 className="text-lg font-bold flex items-center gap-3">
                  <Receipt className="w-5 h-5 text-white/40" /> Registro Detallado de Gastos
                </h2>
                <button 
                  onClick={handleOpenCreateModal}
                  className="text-[10px] font-mono bg-[#00ffcc]/10 text-[#00ffcc] hover:bg-[#00ffcc]/20 transition-all px-4 py-2 rounded-lg flex items-center gap-2 border border-[#00ffcc]/20 uppercase tracking-widest font-bold"
                >
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
                      <th className="px-8 py-5 border-b border-white/5 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {analytics.expenses.length > 0 ? (
                      analytics.expenses.map((exp: Expense) => (
                        <tr key={exp.id} className="hover:bg-white/[0.03] transition-colors group">
                          <td className="px-8 py-5 font-medium text-white/80 group-hover:text-white">{exp.name}</td>
                          <td className="px-8 py-5">
                            <span className="text-[9px] font-bold bg-white/5 px-2.5 py-1 rounded-md border border-white/10 uppercase tracking-wider text-white/60">
                              {EXPENSE_CATEGORIES.find(c => c.value === exp.category)?.label || exp.category}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-white/30 text-xs font-mono">
                            {format(new Date(exp.createdAt), 'dd MMM yyyy')}
                          </td>
                          <td className="px-8 py-5 text-right font-mono font-bold text-[#ff007f] text-lg">
                            -{formatCurrency(exp.amount)}
                          </td>
                          <td className="px-8 py-5 text-center">
                            <div className="flex items-center justify-center gap-3">
                              <button 
                                onClick={() => handleOpenEditModal(exp)}
                                className="text-white/40 hover:text-[#00ffcc] transition-colors p-1"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteExpense(exp.id)}
                                className="text-white/40 hover:text-[#ff007f] transition-colors p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-8 py-20 text-center text-white/10 text-sm font-medium tracking-wide">
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

      {/* Expense Creator/Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#00ffcc]" />
                {modalMode === 'create' ? 'Registrar Gasto' : 'Editar Gasto'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveExpense} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase text-white/40 tracking-wider">Concepto o Proveedor</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej. Compra de Hielo, DJ Cache, Seguridad"
                  value={expenseName}
                  onChange={(e) => setExpenseName(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00ffcc] transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase text-white/40 tracking-wider">Importe (€)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00ffcc] transition-colors font-mono"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase text-white/40 tracking-wider">Categoría</label>
                  <select 
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00ffcc] transition-colors"
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value} className="bg-[#121212]">
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-white/10 text-xs font-mono uppercase tracking-widest text-white/60 hover:bg-white/5 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2.5 rounded-xl bg-[#00ffcc] text-black text-xs font-mono uppercase tracking-widest font-black hover:bg-[#00ffcc]/80 transition-all shadow-[0_0_15px_rgba(0,255,204,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {modalLoading ? 'Guardando...' : 'Guardar Gasto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
          <div className="text-[9px] font-mono text-white/20 uppercase tracking-[0.25em] font-bold">Datos en Vivo</div>
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
      
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.02] blur-3xl rounded-full -mr-12 -mt-12" />
    </div>
  );
}
