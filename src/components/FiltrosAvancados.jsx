import React from 'react';
import { Filter, X } from 'lucide-react';

export default function FiltrosAvancados({ isFilterPanelOpen, setIsFilterPanelOpen, bancoDisciplinas }) {
  if (!isFilterPanelOpen) return null;

  return (
    <div className="fixed inset-0 z-[400] bg-[#1A365D]/40 backdrop-blur-sm animate-in fade-in duration-300 flex justify-end">
        <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-xl font-extrabold text-gray-800 flex items-center gap-2"><Filter size={20} className="text-[#10B981]"/> Filtros Avançados</h2>
                <button onClick={() => setIsFilterPanelOpen(false)} className="text-gray-400 hover:text-red-500 p-2 rounded-xl hover:bg-red-50 transition-colors"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                
                {/* Período */}
                <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Período</label>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Início</label>
                            <input type="date" className="w-full border-b-2 border-gray-200 hover:border-[#10B981] focus:border-[#10B981] bg-transparent py-1.5 text-sm font-semibold text-gray-700 outline-none transition-colors cursor-pointer" />
                        </div>
                        <div>
                            <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Fim</label>
                            <input type="date" className="w-full border-b-2 border-gray-200 hover:border-[#10B981] focus:border-[#10B981] bg-transparent py-1.5 text-sm font-semibold text-gray-700 outline-none transition-colors cursor-pointer" />
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {['Hoje', '7 Dias', '30 Dias', 'Este Mês', 'Este Ano'].map(p => (
                            <button key={p} className="px-3 py-1.5 text-[10px] font-bold text-gray-500 bg-gray-100 border border-gray-200 rounded-lg hover:border-[#10B981] hover:text-[#10B981] hover:bg-emerald-50 transition-colors">{p}</button>
                        ))}
                    </div>
                </div>

                {/* Disciplina e Tópico */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Disciplina</label>
                        <select className="w-full border-b-2 border-gray-200 hover:border-[#10B981] focus:border-[#10B981] bg-transparent py-2 text-sm font-semibold text-gray-700 outline-none transition-colors cursor-pointer">
                            <option>Todas as disciplinas</option>
                            {bancoDisciplinas.map(d=><option key={d.id}>{d.nome}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Tópico</label>
                        <select className="w-full border-b-2 border-gray-200 hover:border-[#10B981] focus:border-[#10B981] bg-transparent py-2 text-sm font-semibold text-gray-700 outline-none transition-colors cursor-pointer">
                            <option>Todos os tópicos</option>
                        </select>
                    </div>
                </div>

                {/* Categoria */}
                <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Categoria</label>
                    <div className="grid grid-cols-2 gap-3">
                        {['Teoria', 'Revisão', 'Questões', 'Simulados', 'Redação', 'Leitura'].map(c => (
                            <label key={c} className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 cursor-pointer hover:border-[#10B981] hover:bg-emerald-50 transition-colors group">
                                <input type="checkbox" className="w-4 h-4 text-[#10B981] rounded border-gray-300 focus:ring-[#10B981]" />
                                <span className="text-xs font-bold text-gray-600 group-hover:text-[#10B981]">{c}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Desempenho */}
                <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Desempenho (%)</label>
                    <div className="flex items-center gap-4">
                        <div className="flex-1 relative">
                            <input type="number" placeholder="Min" min="0" max="100" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-center text-sm font-bold text-gray-700 outline-none focus:border-[#10B981] focus:bg-white transition-colors" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">%</span>
                        </div>
                        <span className="text-gray-400 font-bold">-</span>
                        <div className="flex-1 relative">
                            <input type="number" placeholder="Max" min="0" max="100" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-center text-sm font-bold text-gray-700 outline-none focus:border-[#10B981] focus:bg-white transition-colors" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">%</span>
                        </div>
                    </div>
                </div>

            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
                <button onClick={() => setIsFilterPanelOpen(false)} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm bg-white hover:bg-gray-50 transition-colors shadow-sm">Limpar Tudo</button>
                <button onClick={() => setIsFilterPanelOpen(false)} className="flex-1 px-4 py-3 rounded-xl bg-[#10B981] text-white font-bold text-sm hover:bg-[#059669] transition-colors shadow-sm">Aplicar Filtros</button>
            </div>
        </div>
    </div>
  );
}