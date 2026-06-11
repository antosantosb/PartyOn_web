import React, { useState, useEffect } from 'react';
import { Receipt, X } from 'lucide-react';
import type { Expense } from './types';
import { EXPENSE_CATEGORIES } from './types';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  editingExpense: Expense | null;
  onSave: (name: string, amount: number, category: string) => Promise<void>;
  primaryColor: string;
}

export default function ExpenseModal({ isOpen, onClose, mode, editingExpense, onSave, primaryColor }: ExpenseModalProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [loading, setLoading] = useState(false);

  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isAmountFocused, setIsAmountFocused] = useState(false);
  const [isCategoryFocused, setIsCategoryFocused] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && editingExpense) {
      setName(editingExpense.name);
      setAmount(String(editingExpense.amount));
      setCategory(editingExpense.category);
    } else {
      setName('');
      setAmount('');
      setCategory('GENERAL');
    }
  }, [mode, editingExpense, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount) return;
    setLoading(true);
    try {
      await onSave(name, parseFloat(amount), category);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-none animate-in fade-in duration-200">
      <div className="bg-[#111111] border-4 border-black rounded-none w-full max-w-md overflow-hidden shadow-none animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b-4 border-black bg-[#0a0a0a]">
          <h3 className="text-lg font-display font-black text-white uppercase flex items-center gap-2">
            <Receipt className="w-5 h-5" style={{ color: primaryColor }} />
            {mode === 'create' ? 'Registrar Gasto' : 'Editar Gasto'}
          </h3>
          <button 
            onClick={onClose}
            className="text-[#7a7269] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase text-[#7a7269] tracking-wider font-bold">Concepto o Proveedor</label>
            <input 
              type="text" 
              required
              placeholder="Ej. Compra de Hielo, DJ Cache, Seguridad"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setIsNameFocused(true)}
              onBlur={() => setIsNameFocused(false)}
              style={isNameFocused ? { borderColor: primaryColor } : {}}
              className="w-full bg-black border-2 border-[#2a2a2a] rounded-none px-4 py-3 text-sm text-white focus:outline-none transition-colors font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase text-[#7a7269] tracking-wider font-bold">Importe (€)</label>
              <input 
                type="number" 
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onFocus={() => setIsAmountFocused(true)}
                onBlur={() => setIsAmountFocused(false)}
                style={isAmountFocused ? { borderColor: primaryColor } : {}}
                className="w-full bg-black border-2 border-[#2a2a2a] rounded-none px-4 py-3 text-sm text-white focus:outline-none transition-colors font-mono"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase text-[#7a7269] tracking-wider font-bold">Categoría</label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                onFocus={() => setIsCategoryFocused(true)}
                onBlur={() => setIsCategoryFocused(false)}
                style={isCategoryFocused ? { borderColor: primaryColor } : {}}
                className="w-full bg-black border-2 border-[#2a2a2a] rounded-none px-4 py-3 text-sm text-white focus:outline-none transition-colors font-mono"
              >
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value} className="bg-[#111111]">
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t-2 border-black">
            <button 
              type="button"
              onClick={onClose}
              className="brut-btn-outline text-[10px] px-5 py-2.5"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={loading}
              style={{ backgroundColor: primaryColor }}
              className="brut-btn text-[10px] px-5 py-2.5 text-white"
            >
              {loading ? 'Guardando...' : 'Guardar Gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
