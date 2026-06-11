import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, Edit2, Trash2, Key, X } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';
import { CreateUserSchema, UpdateUserSchema, ResetPasswordSchema } from '@partyon/schemas';
import type { CreateUserFormData, UpdateUserFormData, ResetPasswordFormData } from '@partyon/schemas';
import { useStore } from '../../lib/store';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'DEV' | 'ADMIN' | 'STAFF';
  createdAt?: string;
}

export default function Users() {
  const { theme } = useStore();
  const primaryColor = theme?.primaryColor || '#e63329';

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [resetUser, setResetUser] = useState<User | null>(null);
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Input focus tracking
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Action button hover tracking
  const [hoveredEdit, setHoveredEdit] = useState<string | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  // Decode JWT to get current user ID
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload && payload.userId) {
          setCurrentUserId(payload.userId);
        }
      } catch (e) {
        console.error('Error parsing token payload:', e);
      }
    }
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'No se pudieron cargar los usuarios');
      }
    } catch (err) {
      setErrorMsg('Error de red al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Form Hooks
  const createForm = useForm<CreateUserFormData>({
    resolver: zodResolver(CreateUserSchema),
    defaultValues: { name: '', email: '', role: 'STAFF', password: '' }
  });

  const editForm = useForm<UpdateUserFormData>({
    resolver: zodResolver(UpdateUserSchema)
  });

  const resetForm = useForm<ResetPasswordFormData>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: { password: '' }
  });

  // Actions
  const onCreateSubmit = async (data: CreateUserFormData) => {
    setErrorMsg(null);
    try {
      const res = await apiFetch('/admin/users', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      const resData = await res.json();
      if (res.ok) {
        setSuccessMsg('Usuario creado correctamente');
        setCreateOpen(false);
        createForm.reset();
        fetchUsers();
      } else {
        setErrorMsg(resData.error || 'Error al crear usuario');
      }
    } catch (err) {
      setErrorMsg('Error de conexión');
    }
  };

  const onEditSubmit = async (data: UpdateUserFormData) => {
    if (!editUser) return;
    setErrorMsg(null);
    try {
      const res = await apiFetch(`/admin/users/${editUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
      const resData = await res.json();
      if (res.ok) {
        setSuccessMsg('Usuario actualizado correctamente');
        setEditUser(null);
        fetchUsers();
      } else {
        setErrorMsg(resData.error || 'Error al actualizar usuario');
      }
    } catch (err) {
      setErrorMsg('Error de conexión');
    }
  };

  const onResetSubmit = async (data: ResetPasswordFormData) => {
    if (!resetUser) return;
    setErrorMsg(null);
    try {
      const res = await apiFetch(`/admin/users/${resetUser.id}/reset-password`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
      const resData = await res.json();
      if (res.ok) {
        setSuccessMsg('Contraseña restablecida correctamente');
        setResetUser(null);
        resetForm.reset();
      } else {
        setErrorMsg(resData.error || 'Error al restablecer contraseña');
      }
    } catch (err) {
      setErrorMsg('Error de conexión');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (id === currentUserId) {
      alert('No puedes eliminarte a ti mismo.');
      return;
    }
    if (!window.confirm(`¿Estás seguro de que deseas eliminar al usuario "${name}"?`)) {
      return;
    }
    setErrorMsg(null);
    try {
      const res = await apiFetch(`/admin/users/${id}`, {
        method: 'DELETE'
      });
      const resData = await res.json();
      if (res.ok) {
        setSuccessMsg('Usuario eliminado correctamente');
        fetchUsers();
      } else {
        setErrorMsg(resData.error || 'Error al eliminar usuario');
      }
    } catch (err) {
      setErrorMsg('Error de conexión');
    }
  };

  const openEditModal = (user: User) => {
    setEditUser(user);
    editForm.setValue('name', user.name);
    editForm.setValue('email', user.email);
    editForm.setValue('role', user.role);
  };

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-white p-6 font-mono selection:bg-[#e63329]/30">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b-2 border-white/10 pb-6 mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase text-white tracking-tight">
            Equipo <span style={{ color: primaryColor }}>/ System Users</span>
          </h1>
          <p className="text-white/40 text-xs mt-1">Gestión de administradores y personal con acceso al backoffice</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
          className="brut-btn select-none rounded-none border-2 text-white hover:shadow-[4px_4px_0_0_rgba(255,255,255,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all"
        >
          <Plus className="w-4 h-4" /> Nuevo Usuario
        </button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="bg-red-950/40 border-2 border-red-500 text-red-400 text-xs p-4 mb-6 rounded-none flex items-center justify-between font-mono">
          <span>⚠ ERROR: {errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="hover:text-white"><X className="w-4 h-4" /></button>
        </div>
      )}
      {successMsg && (
        <div className="bg-green-950/40 border-2 border-green-500 text-green-400 text-xs p-4 mb-6 rounded-none flex items-center justify-between font-mono">
          <span>✓ {successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="hover:text-white"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Main Grid/Table */}
      <div className="bg-[#111] border-2 border-white/10 rounded-none overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-white/30 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: primaryColor }} />
            <span>Cargando equipo...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-20 text-white/30">
            No se han encontrado usuarios del sistema.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-[#080808] border-b-2 border-white/10 text-white/50 text-xs uppercase tracking-wider font-mono">
                <tr>
                  <th className="px-6 py-4 font-normal">Nombre</th>
                  <th className="px-6 py-4 font-normal">Email</th>
                  <th className="px-6 py-4 font-normal">Rol</th>
                  <th className="px-6 py-4 font-normal text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-6 py-4 font-bold text-white">{u.name}</td>
                    <td className="px-6 py-4 text-white/60 font-mono text-xs">{u.email}</td>
                    <td className="px-6 py-4">
                      {u.role === 'DEV' ? (
                        <span className="px-2 py-1 text-[10px] font-bold border rounded-none tracking-wider bg-purple-500/10 text-purple-400 border-purple-500/40">
                          {u.role}
                        </span>
                      ) : u.role === 'ADMIN' ? (
                        <span 
                          style={{ backgroundColor: `${primaryColor}1a`, color: primaryColor, borderColor: `${primaryColor}66` }}
                          className="px-2 py-1 text-[10px] font-bold border rounded-none tracking-wider"
                        >
                          {u.role}
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-[10px] font-bold border rounded-none tracking-wider bg-blue-500/10 text-blue-400 border-blue-500/40">
                          {u.role}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(u)}
                        onMouseEnter={() => setHoveredEdit(u.id)}
                        onMouseLeave={() => setHoveredEdit(null)}
                        style={hoveredEdit === u.id ? { color: primaryColor, borderColor: primaryColor } : {}}
                        className="p-2 border-2 border-white/10 text-white transition-colors rounded-none"
                        title="Editar detalles"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setResetUser(u)}
                        onMouseEnter={() => setHoveredKey(u.id)}
                        onMouseLeave={() => setHoveredKey(null)}
                        style={hoveredKey === u.id ? { color: primaryColor, borderColor: primaryColor } : {}}
                        className="p-2 border-2 border-white/10 text-white transition-colors rounded-none"
                        title="Restablecer Contraseña"
                      >
                        <Key className="w-3.5 h-3.5" />
                      </button>
                      {u.id !== currentUserId && (
                        <button
                          onClick={() => handleDelete(u.id, u.name)}
                          className="p-2 border-2 border-white/10 text-red-500 hover:border-red-600 hover:text-red-400 transition-colors rounded-none"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div 
            style={{ boxShadow: `8px 8px 0 0 ${primaryColor}33` }}
            className="w-full max-w-md bg-[#0d0d0d] border-2 border-white p-6 relative rounded-none"
          >
            <button
              onClick={() => { setCreateOpen(false); createForm.reset(); }}
              className="absolute top-4 right-4 text-white/50 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black uppercase text-white mb-6 tracking-tight">Nuevo Usuario</h2>
            
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4 text-left">
              <div>
                <label className="block text-xs uppercase tracking-wider text-white/50 mb-1">Nombre</label>
                <input
                  type="text"
                  {...createForm.register('name')}
                  onFocus={() => setFocusedInput('create_name')}
                  onBlur={() => setFocusedInput(null)}
                  style={focusedInput === 'create_name' ? { borderColor: primaryColor } : {}}
                  className="w-full bg-[#121212] border-2 border-white/10 p-3 text-white text-sm focus:outline-none transition-colors rounded-none"
                  placeholder="Ej. Juan Pérez"
                />
                {createForm.formState.errors.name && (
                  <span className="text-[11px] text-red-500">{createForm.formState.errors.name.message}</span>
                )}
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-white/50 mb-1">Email</label>
                <input
                  type="email"
                  {...createForm.register('email')}
                  onFocus={() => setFocusedInput('create_email')}
                  onBlur={() => setFocusedInput(null)}
                  style={focusedInput === 'create_email' ? { borderColor: primaryColor } : {}}
                  className="w-full bg-[#121212] border-2 border-white/10 p-3 text-white text-sm focus:outline-none transition-colors rounded-none"
                  placeholder="ejemplo@partyon.pt"
                />
                {createForm.formState.errors.email && (
                  <span className="text-[11px] text-red-500">{createForm.formState.errors.email.message}</span>
                )}
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-white/50 mb-1">Rol</label>
                <select
                  {...createForm.register('role')}
                  onFocus={() => setFocusedInput('create_role')}
                  onBlur={() => setFocusedInput(null)}
                  style={focusedInput === 'create_role' ? { borderColor: primaryColor } : {}}
                  className="w-full bg-[#121212] border-2 border-white/10 p-3 text-white text-sm focus:outline-none transition-colors rounded-none appearance-none"
                >
                  <option value="STAFF">STAFF</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="DEV">DEV</option>
                </select>
                {createForm.formState.errors.role && (
                  <span className="text-[11px] text-red-500">{createForm.formState.errors.role.message}</span>
                )}
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-white/50 mb-1">Contraseña</label>
                <input
                  type="password"
                  {...createForm.register('password')}
                  onFocus={() => setFocusedInput('create_password')}
                  onBlur={() => setFocusedInput(null)}
                  style={focusedInput === 'create_password' ? { borderColor: primaryColor } : {}}
                  className="w-full bg-[#121212] border-2 border-white/10 p-3 text-white text-sm focus:outline-none transition-colors rounded-none"
                  placeholder="Mínimo 6 caracteres"
                />
                {createForm.formState.errors.password && (
                  <span className="text-[11px] text-red-500">{createForm.formState.errors.password.message}</span>
                )}
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="submit"
                  style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
                  className="flex-1 brut-btn text-white py-3 rounded-none hover:shadow-[4px_4px_0_0_rgba(255,255,255,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all"
                >
                  Crear Usuario
                </button>
                <button
                  type="button"
                  onClick={() => { setCreateOpen(false); createForm.reset(); }}
                  className="brut-btn-outline py-3 px-6 border-2 border-white/10 text-white rounded-none"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div 
            style={{ boxShadow: `8px 8px 0 0 ${primaryColor}33` }}
            className="w-full max-w-md bg-[#0d0d0d] border-2 border-white p-6 relative rounded-none"
          >
            <button
              onClick={() => setEditUser(null)}
              className="absolute top-4 right-4 text-white/50 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black uppercase text-white mb-6 tracking-tight">Editar Usuario</h2>
            
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 text-left">
              <div>
                <label className="block text-xs uppercase tracking-wider text-white/50 mb-1">Nombre</label>
                <input
                  type="text"
                  {...editForm.register('name')}
                  onFocus={() => setFocusedInput('edit_name')}
                  onBlur={() => setFocusedInput(null)}
                  style={focusedInput === 'edit_name' ? { borderColor: primaryColor } : {}}
                  className="w-full bg-[#121212] border-2 border-white/10 p-3 text-white text-sm focus:outline-none transition-colors rounded-none"
                />
                {editForm.formState.errors.name && (
                  <span className="text-[11px] text-red-500">{editForm.formState.errors.name.message}</span>
                )}
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-white/50 mb-1">Email</label>
                <input
                  type="email"
                  {...editForm.register('email')}
                  onFocus={() => setFocusedInput('edit_email')}
                  onBlur={() => setFocusedInput(null)}
                  style={focusedInput === 'edit_email' ? { borderColor: primaryColor } : {}}
                  className="w-full bg-[#121212] border-2 border-white/10 p-3 text-white text-sm focus:outline-none transition-colors rounded-none"
                />
                {editForm.formState.errors.email && (
                  <span className="text-[11px] text-red-500">{editForm.formState.errors.email.message}</span>
                )}
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-white/50 mb-1">Rol</label>
                <select
                  {...editForm.register('role')}
                  onFocus={() => setFocusedInput('edit_role')}
                  onBlur={() => setFocusedInput(null)}
                  style={focusedInput === 'edit_role' ? { borderColor: primaryColor } : {}}
                  className="w-full bg-[#121212] border-2 border-white/10 p-3 text-white text-sm focus:outline-none transition-colors rounded-none appearance-none"
                >
                  <option value="STAFF">STAFF</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="DEV">DEV</option>
                </select>
                {editForm.formState.errors.role && (
                  <span className="text-[11px] text-red-500">{editForm.formState.errors.role.message}</span>
                )}
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="submit"
                  style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
                  className="flex-1 brut-btn text-white py-3 rounded-none hover:shadow-[4px_4px_0_0_rgba(255,255,255,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all"
                >
                  Guardar Cambios
                </button>
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="brut-btn-outline py-3 px-6 border-2 border-white/10 text-white rounded-none"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div 
            style={{ boxShadow: `8px 8px 0 0 ${primaryColor}33` }}
            className="w-full max-w-md bg-[#0d0d0d] border-2 border-white p-6 relative rounded-none"
          >
            <button
              onClick={() => { setResetUser(null); resetForm.reset(); }}
              className="absolute top-4 right-4 text-white/50 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black uppercase text-white mb-2 tracking-tight">Restablecer Contraseña</h2>
            <p className="text-white/40 text-xs mb-6">Restablecer la contraseña for {resetUser.name} ({resetUser.email})</p>
            
            <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4 text-left">
              <div>
                <label className="block text-xs uppercase tracking-wider text-white/50 mb-1">Nueva Contraseña</label>
                <input
                  type="password"
                  {...resetForm.register('password')}
                  onFocus={() => setFocusedInput('reset_password')}
                  onBlur={() => setFocusedInput(null)}
                  style={focusedInput === 'reset_password' ? { borderColor: primaryColor } : {}}
                  className="w-full bg-[#121212] border-2 border-white/10 p-3 text-white text-sm focus:outline-none transition-colors rounded-none"
                  placeholder="Mínimo 6 caracteres"
                />
                {resetForm.formState.errors.password && (
                  <span className="text-[11px] text-red-500">{resetForm.formState.errors.password.message}</span>
                )}
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="submit"
                  style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
                  className="flex-1 brut-btn text-white py-3 rounded-none hover:shadow-[4px_4px_0_0_rgba(255,255,255,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all"
                >
                  Restablecer
                </button>
                <button
                  type="button"
                  onClick={() => { setResetUser(null); resetForm.reset(); }}
                  className="brut-btn-outline py-3 px-6 border-2 border-white/10 text-white rounded-none"
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
