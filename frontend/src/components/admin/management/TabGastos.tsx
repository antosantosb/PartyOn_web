import { useState } from 'react';
import { Receipt, Plus, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import type { Expense } from './types';
import { EXPENSE_CATEGORIES } from './types';

interface TabGastosProps {
  expenses: Expense[];
  formatCurrency: (val: number) => string;
  onOpenCreate: () => void;
  onOpenEdit: (exp: Expense) => void;
  onDelete: (id: string) => void;
  primaryColor: string;
}

export default function TabGastos({ expenses, formatCurrency, onOpenCreate, onOpenEdit, onDelete, primaryColor }: TabGastosProps) {
  const [hoveredTrash, setHoveredTrash] = useState<string | null>(null);

  // Grouped expenses
  const groupedExpenses = expenses.reduce((acc: { [key: string]: Expense[] }, exp) => {
    const cat = exp.category || 'GENERAL';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(exp);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between border-b-4 border-black pb-4">
        <h2 className="text-2xl font-display font-black text-white uppercase flex items-center gap-3">
          <Receipt className="w-6 h-6 text-[#7a7269]" /> Registro Detallado de Gastos
        </h2>
        <button 
          onClick={onOpenCreate}
          style={{ backgroundColor: primaryColor }}
          className="brut-btn text-[10px] text-white"
        >
          <Plus className="w-4 h-4" /> Registrar Gasto
        </button>
      </div>

      <div className="space-y-6">
        {Object.keys(groupedExpenses).length > 0 ? (
          Object.entries(groupedExpenses).map(([categoryValue, list]) => {
            const categoryInfo = EXPENSE_CATEGORIES.find(c => c.value === categoryValue) || {
              label: categoryValue,
              bg: 'bg-[#2a2a2a]',
              text: 'text-white',
              border: 'border-neutral-700'
            };
            const categoryTotal = list.reduce((sum, e) => sum + e.amount, 0);

            return (
              <div key={categoryValue} className="border-4 border-black rounded-none overflow-hidden bg-[#111111]">
                {/* Group Subheader */}
                <div className="bg-[#0a0a0a] border-b-2 border-black p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className={`text-[10px] font-mono uppercase font-black px-3 py-1 border-2 border-black ${categoryInfo.bg} ${categoryInfo.text}`}>
                    {categoryInfo.label}
                  </span>
                  <span className="text-xs font-mono text-[#7a7269] uppercase tracking-wider">
                    Subtotal: <span className="font-display font-black text-base ml-1" style={{ color: primaryColor }}>{formatCurrency(categoryTotal)}</span>
                  </span>
                </div>

                {/* Expense Group Rows */}
                <table className="w-full text-left border-collapse">
                  <tbody className="divide-y divide-[#2a2a2a]">
                    {list.map((exp) => (
                      <tr key={exp.id} className="hover:bg-black/40 transition-colors">
                        <td className="px-6 py-4 font-mono text-sm text-white/90">{exp.name}</td>
                        <td className="px-6 py-4 text-[#7a7269] text-xs font-mono">
                          {format(new Date(exp.createdAt), 'dd MMM yyyy')}
                        </td>
                        <td className="px-6 py-4 text-right font-display font-bold text-lg" style={{ color: primaryColor }}>
                          -{formatCurrency(exp.amount)}
                        </td>
                        <td className="px-6 py-4 text-center w-24">
                          <div className="flex items-center justify-center gap-3">
                            <button 
                              onClick={() => onOpenEdit(exp)}
                              className="text-[#7a7269] hover:text-white transition-colors p-1"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => onDelete(exp.id)}
                              onMouseEnter={() => setHoveredTrash(exp.id)}
                              onMouseLeave={() => setHoveredTrash(null)}
                              style={hoveredTrash === exp.id ? { color: primaryColor } : {}}
                              className="text-[#7a7269] transition-colors p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })
        ) : (
          <div className="border-4 border-black p-12 text-center text-[#7a7269] font-mono text-sm uppercase bg-[#111111]">
            No se han registrado gastos para este evento todavía.
          </div>
        )}
      </div>
    </div>
  );
}
