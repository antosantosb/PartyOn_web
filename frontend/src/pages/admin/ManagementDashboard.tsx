import { useState, useEffect } from 'react';
import { Loader2, Calendar, AlertCircle } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';

// Imported modular components and definitions
import type { AnalyticsData, Expense, TabType } from '../../components/admin/management/types';
import ExpenseModal from '../../components/admin/management/ExpenseModal';
import TabResumen from '../../components/admin/management/TabResumen';
import TabGastos from '../../components/admin/management/TabGastos';
import TabVentas from '../../components/admin/management/TabVentas';
import TabAnalisis from '../../components/admin/management/TabAnalisis';

export default function ManagementDashboard() {
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>('resumen');

  // States for Expense Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

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
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (exp: Expense) => {
    setModalMode('edit');
    setEditingExpense(exp);
    setIsModalOpen(true);
  };

  const handleSaveExpense = async (name: string, amount: number, category: string) => {
    if (!selectedEventId) return;
    const url = modalMode === 'create' 
      ? '/admin/management/expenses' 
      : `/admin/management/expenses/${editingExpense?.id}`;
    const method = modalMode === 'create' ? 'POST' : 'PUT';

    const response = await apiFetch(url, {
      method,
      body: JSON.stringify({
        name,
        amount,
        category,
        eventId: selectedEventId
      })
    });

    const result = await response.json();
    if (result.success) {
      fetchAnalytics(selectedEventId);
    } else {
      throw new Error(result.error || 'Error al guardar el gasto');
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
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#e63329]" />
      </div>
    );
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);

  const primaryColor = allEvents.find(e => e.id === selectedEventId)?.theme?.primaryColor ?? '#e63329';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f0ede8] p-4 md:p-8 font-sans selection:bg-[#e63329]/30">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Global Header */}
        <div className="border-4 border-black bg-[#111111] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-none">
          <div className="space-y-1">
            <h1 className="text-4xl font-display font-black tracking-tight text-white uppercase flex items-center gap-4">
              DASHBOARD DE GESTIÓN
              {analyticsLoading && <Loader2 className="w-6 h-6 animate-spin" style={{ color: primaryColor }} />}
            </h1>
            <p className="text-[#7a7269] text-xs font-mono uppercase tracking-widest">Inteligencia Operacional y Financiera</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-[#0a0a0a] border-2 border-black rounded-none px-4 py-2 flex items-center gap-3">
              <Calendar className="w-4 h-4" style={{ color: primaryColor }} />
              <select 
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="bg-transparent border-none focus:outline-none text-xs font-mono font-bold pr-8 cursor-pointer uppercase text-white"
              >
                {allEvents.map(e => (
                  <option key={e.id} value={e.id} className="bg-[#111111] text-white">
                    {e.name} ({e.status})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-[#e63329]/10 border-4 border-black text-[#e63329] p-4 rounded-none flex items-center gap-3 font-mono text-xs">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="font-bold uppercase">{error}</span>
          </div>
        )}

        {analytics ? (
          <div className="space-y-8">
            
            {/* Tab Navigation Menu */}
            <div className="flex border-b-4 border-black overflow-x-auto">
              {(['resumen', 'gastos', 'ventas', 'analisis'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 font-display font-black text-lg tracking-wider uppercase rounded-none border-t-4 border-x-4 border-transparent transition-all -mb-[4px] relative shrink-0 ${
                    activeTab === tab 
                      ? 'bg-[#111111] text-white border-black border-b-[#111111] z-10' 
                      : 'text-[#7a7269] hover:text-white'
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: primaryColor }} />
                  )}
                </button>
              ))}
            </div>

            {/* Render subcomponents based on activeTab */}
            {activeTab === 'resumen' && (
              <TabResumen 
                analytics={analytics} 
                formatCurrency={formatCurrency} 
                setActiveTab={setActiveTab} 
                primaryColor={primaryColor}
              />
            )}

            {activeTab === 'gastos' && (
              <TabGastos 
                expenses={analytics.expenses} 
                formatCurrency={formatCurrency} 
                onOpenCreate={handleOpenCreateModal} 
                onOpenEdit={handleOpenEditModal} 
                onDelete={handleDeleteExpense} 
                primaryColor={primaryColor}
              />
            )}

            {activeTab === 'ventas' && (
              <TabVentas 
                analytics={analytics} 
                formatCurrency={formatCurrency} 
                onExportCSV={handleExportCSV} 
                selectedEventId={selectedEventId} 
                primaryColor={primaryColor}
              />
            )}

            {activeTab === 'analisis' && (
              <TabAnalisis 
                analytics={analytics} 
                formatCurrency={formatCurrency} 
                onExportCSV={handleExportCSV} 
                selectedEventId={selectedEventId} 
                primaryColor={primaryColor}
              />
            )}

          </div>
        ) : !analyticsLoading && (
          <div className="border-4 border-black h-64 bg-[#111111] flex flex-col items-center justify-center text-[#7a7269] italic gap-4 font-mono text-sm uppercase">
             Selecciona un evento para visualizar los datos financieros.
          </div>
        )}
      </div>

      {/* Expense Modal (Creator/Editor) */}
      <ExpenseModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        mode={modalMode} 
        editingExpense={editingExpense} 
        onSave={handleSaveExpense} 
        primaryColor={primaryColor}
      />
    </div>
  );
}
