import { useState, useEffect } from 'react';
import { Loader2, Plus, Edit2, Trash2, X, Calendar, AlertCircle, Tag, Users, DollarSign, Activity } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';

interface DiscountCode {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED' | 'FREE';
  value: number;
  usedCount: number;
  maxUses: number | null;
  isActive: boolean;
  validUntil: string | null;
}

interface PromoterAnalytics {
  id: string;
  name: string;
  email: string | null;
  isActive: boolean;
  totalOrders: number;
  totalTickets: number;
  grossRevenue: number;
  netRevenue: number;
  totalDiscount: number;
  codes: DiscountCode[];
}

export default function Promotores() {
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [promoters, setPromoters] = useState<PromoterAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals / Editors State
  const [promoterModalOpen, setPromoterModalOpen] = useState(false);
  const [editingPromoter, setEditingPromoter] = useState<PromoterAnalytics | null>(null);
  const [codeModalPromoter, setCodeModalPromoter] = useState<PromoterAnalytics | null>(null);

  // Form states
  const [promoterForm, setPromoterForm] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  });

  const [codeForm, setCodeForm] = useState({
    code: '',
    type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED' | 'FREE',
    value: 0,
    maxUses: '' as string | number,
    validUntil: ''
  });

  // Focused state for styling inputs
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

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

  const fetchPromoters = async (eventId: string) => {
    if (!eventId) return;
    setDataLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/admin/events/${eventId}/promoters/analytics`);
      const data = await res.json();
      if (res.ok) {
        setPromoters(data.promoters || []);
      } else {
        setError(data.error || 'Error al obtener promotores');
      }
    } catch (e) {
      console.error(e);
      setError('Error de conexión al cargar datos.');
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchPromoters(selectedEventId);
    }
  }, [selectedEventId]);

  // Promoter CRUD actions
  const handleOpenCreatePromoter = () => {
    setEditingPromoter(null);
    setPromoterForm({ name: '', email: '', phone: '', notes: '' });
    setPromoterModalOpen(true);
  };

  const handleOpenEditPromoter = (p: PromoterAnalytics) => {
    setEditingPromoter(p);
    setPromoterForm({
      name: p.name,
      email: p.email || '',
      phone: '', // phone not returned in analytics but editable if needed
      notes: ''
    });
    setPromoterModalOpen(true);
  };

  const handlePromoterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!promoterForm.name) {
      setError('El nombre es obligatorio');
      return;
    }

    try {
      const url = editingPromoter
        ? `/admin/promoters/${editingPromoter.id}`
        : `/admin/events/${selectedEventId}/promoters`;
      const method = editingPromoter ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(promoterForm)
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMsg(editingPromoter ? 'Promotor actualizado correctamente' : 'Promotor creado correctamente');
        setPromoterModalOpen(false);
        fetchPromoters(selectedEventId);
      } else {
        setError(data.error || 'Error al guardar el promotor');
      }
    } catch (err) {
      setError('Error de red al guardar el promotor');
    }
  };

  const handleDeletePromoter = async (id: string, name: string) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar al promotor "${name}"? Esto también eliminará todos sus códigos de descuento de forma permanente.`)) {
      return;
    }
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await apiFetch(`/admin/promoters/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSuccessMsg('Promotor eliminado correctamente');
        fetchPromoters(selectedEventId);
      } else {
        const data = await res.json();
        setError(data.error || 'Error al eliminar el promotor');
      }
    } catch (err) {
      setError('Error de red al eliminar el promotor');
    }
  };

  // Discount Code actions
  const handleOpenAddCode = (p: PromoterAnalytics) => {
    setCodeModalPromoter(p);
    setCodeForm({
      code: '',
      type: 'PERCENTAGE',
      value: 0,
      maxUses: '',
      validUntil: ''
    });
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!codeModalPromoter) return;
    if (!codeForm.code) {
      setError('El código es obligatorio');
      return;
    }

    try {
      const maxUsesVal = codeForm.maxUses === '' ? null : Number(codeForm.maxUses);
      const res = await apiFetch(`/admin/promoters/${codeModalPromoter.id}/codes`, {
        method: 'POST',
        body: JSON.stringify({
          code: codeForm.code,
          type: codeForm.type,
          value: Number(codeForm.value),
          maxUses: maxUsesVal,
          validUntil: codeForm.validUntil ? new Date(codeForm.validUntil).toISOString() : null
        })
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMsg('Código de descuento añadido correctamente');
        setCodeModalPromoter(null);
        fetchPromoters(selectedEventId);
      } else {
        setError(data.error || 'Error al crear el código');
      }
    } catch (err) {
      setError('Error de red al crear el código');
    }
  };

  const handleToggleCode = async (codeId: string, currentStatus: boolean) => {
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await apiFetch(`/admin/discount-codes/${codeId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !currentStatus })
      });
      if (res.ok) {
        fetchPromoters(selectedEventId);
      } else {
        const data = await res.json();
        setError(data.error || 'Error al cambiar estado del código');
      }
    } catch (err) {
      setError('Error de red al cambiar estado del código');
    }
  };

  const handleDeleteCode = async (codeId: string, codeText: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el código "${codeText}"?`)) {
      return;
    }
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await apiFetch(`/admin/discount-codes/${codeId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSuccessMsg('Código eliminado correctamente');
        fetchPromoters(selectedEventId);
      } else {
        const data = await res.json();
        setError(data.error || 'Error al eliminar el código');
      }
    } catch (err) {
      setError('Error de red al eliminar el código');
    }
  };

  // Helper formatting functions
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);

  const activeEvent = allEvents.find(e => e.id === selectedEventId);
  const primaryColor = activeEvent?.theme?.primaryColor ?? '#e63329';

  // Global promoter metrics calculations
  const globalOrders = promoters.reduce((sum, p) => sum + p.totalOrders, 0);
  const globalTickets = promoters.reduce((sum, p) => sum + p.totalTickets, 0);
  const globalNetRevenue = promoters.reduce((sum, p) => sum + p.netRevenue, 0);
  const globalDiscounts = promoters.reduce((sum, p) => sum + p.totalDiscount, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#e63329]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f0ede8] p-4 md:p-8 font-mono selection:bg-[#e63329]/30">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Section */}
        <div className="border-4 border-black bg-[#111111] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tight text-white uppercase flex items-center gap-4">
              PROMOTORES <span className="text-white/40">/ RP's</span>
              {dataLoading && <Loader2 className="w-6 h-6 animate-spin" style={{ color: primaryColor }} />}
            </h1>
            <p className="text-[#7a7269] text-xs uppercase tracking-widest">Seguimiento de Ventas, Comisiones y Códigos de Descuento</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="bg-[#0a0a0a] border-2 border-white/10 px-4 py-2 flex items-center gap-3">
              <Calendar className="w-4 h-4" style={{ color: primaryColor }} />
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="bg-transparent border-none focus:outline-none text-xs font-bold pr-8 cursor-pointer uppercase text-white"
              >
                {allEvents.map(e => (
                  <option key={e.id} value={e.id} className="bg-[#111111] text-white">
                    {e.name} ({e.status})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleOpenCreatePromoter}
              style={{ backgroundColor: primaryColor }}
              className="px-5 py-2.5 font-bold uppercase text-white hover:shadow-[4px_4px_0_0_rgba(255,255,255,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all flex items-center gap-2 border-2 border-black"
            >
              <Plus className="w-4 h-4" /> Nuevo Promotor
            </button>
          </div>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="bg-[#e63329]/10 border-2 border-[#e63329] text-[#e63329] p-4 flex items-center gap-3 text-xs">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="font-bold uppercase">⚠ Error: {error}</span>
          </div>
        )}
        {successMsg && (
          <div className="bg-green-500/10 border-2 border-green-500 text-green-400 p-4 flex items-center justify-between text-xs">
            <span className="font-bold uppercase">✓ {successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="hover:text-white"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Quick Summary Widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#111] border-2 border-white/10 p-5 space-y-2 relative">
            <Users className="w-8 h-8 opacity-10 absolute right-4 bottom-4" />
            <p className="text-white/40 text-xs font-bold uppercase tracking-wider">Promotores Activos</p>
            <p className="text-3xl font-black text-white">{promoters.filter(p => p.isActive).length}</p>
          </div>
          <div className="bg-[#111] border-2 border-white/10 p-5 space-y-2 relative">
            <Activity className="w-8 h-8 opacity-10 absolute right-4 bottom-4" />
            <p className="text-white/40 text-xs font-bold uppercase tracking-wider">Total Entradas Emitidas</p>
            <p className="text-3xl font-black text-white">{globalTickets} <span className="text-xs text-white/40">({globalOrders} ord.)</span></p>
          </div>
          <div className="bg-[#111] border-2 border-white/10 p-5 space-y-2 relative">
            <DollarSign className="w-8 h-8 opacity-10 absolute right-4 bottom-4" />
            <p className="text-white/40 text-xs font-bold uppercase tracking-wider">Neto Recaudado</p>
            <p className="text-3xl font-black text-white" style={{ color: primaryColor }}>{formatCurrency(globalNetRevenue)}</p>
          </div>
          <div className="bg-[#111] border-2 border-white/10 p-5 space-y-2 relative">
            <Tag className="w-8 h-8 opacity-10 absolute right-4 bottom-4" />
            <p className="text-white/40 text-xs font-bold uppercase tracking-wider">Descuentos Aplicados</p>
            <p className="text-3xl font-black text-white">{formatCurrency(globalDiscounts)}</p>
          </div>
        </div>

        {/* Promoter List & Analytics */}
        <div className="space-y-4">
          {promoters.length === 0 ? (
            <div className="border-2 border-dashed border-white/10 h-64 flex flex-col items-center justify-center text-white/30 italic">
              No hay promotores registrados para este evento.
            </div>
          ) : (
            promoters.map((promoter) => (
              <div key={promoter.id} className="bg-[#111] border-2 border-white/10 p-6 space-y-6">

                {/* Promoter Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold uppercase text-white">{promoter.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 font-bold uppercase border ${promoter.isActive
                          ? 'bg-green-500/10 text-green-400 border-green-500/30'
                          : 'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}>
                        {promoter.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    {promoter.email && <p className="text-white/40 text-xs">{promoter.email}</p>}
                  </div>

                  {/* Actions & Metrics Summary for Promoter */}
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center divide-x divide-white/10 bg-[#0a0a0a] border border-white/10 text-xs text-white/80">
                      <div className="px-3 py-1.5 text-center">
                        <span className="block font-bold">{promoter.totalTickets}</span>
                        <span className="text-[10px] text-white/40">TICKETS</span>
                      </div>
                      <div className="px-3 py-1.5 text-center">
                        <span className="block font-bold text-white">{formatCurrency(promoter.grossRevenue)}</span>
                        <span className="text-[10px] text-white/40">BRUTO</span>
                      </div>
                      <div className="px-3 py-1.5 text-center">
                        <span className="block font-bold" style={{ color: primaryColor }}>{formatCurrency(promoter.netRevenue)}</span>
                        <span className="text-[10px] text-white/40">NETO</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenAddCode(promoter)}
                        className="px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all text-xs font-bold uppercase flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Añadir Código
                      </button>
                      <button
                        onClick={() => handleOpenEditPromoter(promoter)}
                        className="p-1.5 bg-white/5 border border-white/10 text-white/80 hover:text-white transition-all"
                        title="Editar Promotor"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePromoter(promoter.id, promoter.name)}
                        className="p-1.5 bg-white/5 border border-white/10 text-red-400 hover:text-red-300 hover:border-red-500/40 transition-all"
                        title="Eliminar Promotor"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Codes Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white/40">Códigos de descuento vinculados</h4>
                  {promoter.codes.length === 0 ? (
                    <p className="text-xs text-white/20 italic">No hay códigos creados para este promotor.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#0c0c0c] text-white/40 border-b border-white/10">
                            <th className="px-4 py-2 font-bold uppercase">Código</th>
                            <th className="px-4 py-2 font-bold uppercase">Tipo</th>
                            <th className="px-4 py-2 font-bold uppercase text-right">Valor</th>
                            <th className="px-4 py-2 font-bold uppercase text-center">Usos / Máx</th>
                            <th className="px-4 py-2 font-bold uppercase">Validez</th>
                            <th className="px-4 py-2 font-bold uppercase text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {promoter.codes.map((c) => (
                            <tr key={c.id} className="hover:bg-white/2">
                              <td className="px-4 py-3 font-bold text-white select-all">{c.code}</td>
                              <td className="px-4 py-3 font-mono text-white/60">{c.type}</td>
                              <td className="px-4 py-3 text-right font-bold text-white">
                                {c.type === 'FREE' ? '-' : c.type === 'FIXED' ? `${c.value}€` : `${c.value}%`}
                              </td>
                              <td className="px-4 py-3 text-center text-white/80">
                                {c.usedCount} / {c.maxUses === null ? '∞' : c.maxUses}
                              </td>
                              <td className="px-4 py-3 text-white/40 font-mono text-[10px]">
                                {c.validUntil ? new Date(c.validUntil).toLocaleDateString() : 'Permanente'}
                              </td>
                              <td className="px-4 py-3 text-right space-x-2">
                                <button
                                  onClick={() => handleToggleCode(c.id, c.isActive)}
                                  className={`px-2 py-0.5 border text-[10px] uppercase font-bold ${c.isActive
                                      ? 'border-green-500/40 text-green-400 hover:bg-green-500/5'
                                      : 'border-red-500/40 text-red-400 hover:bg-red-500/5'
                                    }`}
                                >
                                  {c.isActive ? 'Desactivar' : 'Activar'}
                                </button>
                                <button
                                  onClick={() => handleDeleteCode(c.id, c.code)}
                                  className="p-1 border border-white/10 hover:border-red-500 hover:text-red-400 transition-colors text-white/50 inline-flex items-center justify-center align-middle"
                                  title="Eliminar Código"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            ))
          )}
        </div>

      </div>

      {/* PROMOTER CREATOR/EDITOR MODAL */}
      {promoterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs">
          <div
            style={{ boxShadow: `8px 8px 0 0 ${primaryColor}33` }}
            className="w-full max-w-md bg-[#0d0d0d] border-2 border-white p-6 relative"
          >
            <button
              onClick={() => setPromoterModalOpen(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black uppercase text-white mb-6 tracking-tight">
              {editingPromoter ? 'Editar Promotor' : 'Nuevo Promotor'}
            </h2>

            <form onSubmit={handlePromoterSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-xs uppercase tracking-wider text-white/50 mb-1">Nombre</label>
                <input
                  type="text"
                  value={promoterForm.name}
                  onChange={(e) => setPromoterForm({ ...promoterForm, name: e.target.value })}
                  onFocus={() => setFocusedInput('p_name')}
                  onBlur={() => setFocusedInput(null)}
                  style={focusedInput === 'p_name' ? { borderColor: primaryColor } : {}}
                  className="w-full bg-[#121212] border-2 border-white/10 p-3 text-white text-sm focus:outline-none transition-colors"
                  placeholder="Ej. DJ Álvaro"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-white/50 mb-1">Email</label>
                <input
                  type="email"
                  value={promoterForm.email}
                  onChange={(e) => setPromoterForm({ ...promoterForm, email: e.target.value })}
                  onFocus={() => setFocusedInput('p_email')}
                  onBlur={() => setFocusedInput(null)}
                  style={focusedInput === 'p_email' ? { borderColor: primaryColor } : {}}
                  className="w-full bg-[#121212] border-2 border-white/10 p-3 text-white text-sm focus:outline-none transition-colors"
                  placeholder="alvaro@ejemplo.com"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-white/50 mb-1">Teléfono</label>
                <input
                  type="text"
                  value={promoterForm.phone}
                  onChange={(e) => setPromoterForm({ ...promoterForm, phone: e.target.value })}
                  onFocus={() => setFocusedInput('p_phone')}
                  onBlur={() => setFocusedInput(null)}
                  style={focusedInput === 'p_phone' ? { borderColor: primaryColor } : {}}
                  className="w-full bg-[#121212] border-2 border-white/10 p-3 text-white text-sm focus:outline-none transition-colors"
                  placeholder="+34 600 000 000"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-white/50 mb-1">Notas Internas</label>
                <textarea
                  value={promoterForm.notes}
                  onChange={(e) => setPromoterForm({ ...promoterForm, notes: e.target.value })}
                  onFocus={() => setFocusedInput('p_notes')}
                  onBlur={() => setFocusedInput(null)}
                  style={focusedInput === 'p_notes' ? { borderColor: primaryColor } : {}}
                  className="w-full bg-[#121212] border-2 border-white/10 p-3 text-white text-sm focus:outline-none transition-colors h-24 resize-none"
                  placeholder="Notas internas y condiciones del promotor..."
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="submit"
                  style={{ backgroundColor: primaryColor }}
                  className="flex-1 py-3 text-sm font-bold uppercase text-white hover:shadow-[4px_4px_0_0_rgba(255,255,255,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all border border-black"
                >
                  {editingPromoter ? 'Guardar Cambios' : 'Crear Promotor'}
                </button>
                <button
                  type="button"
                  onClick={() => setPromoterModalOpen(false)}
                  className="py-3 px-6 border border-white/10 text-white hover:bg-white/5 text-sm uppercase"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD DISCOUNT CODE MODAL */}
      {codeModalPromoter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs">
          <div
            style={{ boxShadow: `8px 8px 0 0 ${primaryColor}33` }}
            className="w-full max-w-md bg-[#0d0d0d] border-2 border-white p-6 relative"
          >
            <button
              onClick={() => setCodeModalPromoter(null)}
              className="absolute top-4 right-4 text-white/50 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black uppercase text-white mb-2 tracking-tight">Nuevo Código</h2>
            <p className="text-white/40 text-xs mb-6">Asociar un código de descuento a {codeModalPromoter.name}</p>

            <form onSubmit={handleCodeSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-xs uppercase tracking-wider text-white/50 mb-1">Código (Se guarda en MAYÚSCULAS)</label>
                <input
                  type="text"
                  value={codeForm.code}
                  onChange={(e) => setCodeForm({ ...codeForm, code: e.target.value.toUpperCase() })}
                  onFocus={() => setFocusedInput('c_code')}
                  onBlur={() => setFocusedInput(null)}
                  style={focusedInput === 'c_code' ? { borderColor: primaryColor } : {}}
                  className="w-full bg-[#121212] border-2 border-white/10 p-3 text-white text-sm focus:outline-none transition-colors font-bold tracking-widest"
                  placeholder="MUNDOALVARO"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-white/50 mb-1">Tipo Descuento</label>
                  <select
                    value={codeForm.type}
                    onChange={(e) => setCodeForm({ ...codeForm, type: e.target.value as any })}
                    className="w-full bg-[#121212] border-2 border-white/10 p-3 text-white text-sm focus:outline-none"
                  >
                    <option value="PERCENTAGE">Porcentaje (%)</option>
                    <option value="FIXED">Fijo (€)</option>
                    <option value="FREE">Gratis (100%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-white/50 mb-1">Valor</label>
                  <input
                    type="number"
                    disabled={codeForm.type === 'FREE'}
                    value={codeForm.type === 'FREE' ? '' : codeForm.value}
                    onChange={(e) => setCodeForm({ ...codeForm, value: Number(e.target.value) })}
                    onFocus={() => setFocusedInput('c_value')}
                    onBlur={() => setFocusedInput(null)}
                    style={focusedInput === 'c_value' ? { borderColor: primaryColor } : {}}
                    className="w-full bg-[#121212] border-2 border-white/10 p-3 text-white text-sm focus:outline-none transition-colors"
                    placeholder="Ej. 15"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-white/50 mb-1">Usos Máximos (Vacio = ilimitado)</label>
                <input
                  type="number"
                  value={codeForm.maxUses}
                  onChange={(e) => setCodeForm({ ...codeForm, maxUses: e.target.value })}
                  onFocus={() => setFocusedInput('c_max')}
                  onBlur={() => setFocusedInput(null)}
                  style={focusedInput === 'c_max' ? { borderColor: primaryColor } : {}}
                  className="w-full bg-[#121212] border-2 border-white/10 p-3 text-white text-sm focus:outline-none transition-colors"
                  placeholder="Ej. 100"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-white/50 mb-1">Válido hasta</label>
                <input
                  type="date"
                  value={codeForm.validUntil}
                  onChange={(e) => setCodeForm({ ...codeForm, validUntil: e.target.value })}
                  onFocus={() => setFocusedInput('c_until')}
                  onBlur={() => setFocusedInput(null)}
                  style={focusedInput === 'c_until' ? { borderColor: primaryColor } : {}}
                  className="w-full bg-[#121212] border-2 border-white/10 p-3 text-white text-sm focus:outline-none transition-colors text-white"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="submit"
                  style={{ backgroundColor: primaryColor }}
                  className="flex-1 py-3 text-sm font-bold uppercase text-white hover:shadow-[4px_4px_0_0_rgba(255,255,255,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all border border-black"
                >
                  Crear Código
                </button>
                <button
                  type="button"
                  onClick={() => setCodeModalPromoter(null)}
                  className="py-3 px-6 border border-white/10 text-white hover:bg-white/5 text-sm uppercase"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
