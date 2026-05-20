import React from 'react';
import { X, Trash2 } from 'lucide-react';

export default function LinkModal({ linkModalOpen, setLinkModalOpen }) {
  if (!linkModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-[#1e40af]/60 backdrop-blur-sm animate-in fade-in duration-300 flex items-center justify-center p-4">
       <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 md:p-8 relative animate-in zoom-in-95 duration-300">
          <button onClick={() => setLinkModalOpen(false)} className="absolute top-6 right-6 text-ink-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50"><X size={20}/></button>
          <h3 className="text-2xl font-bold text-ink-800 mb-8">Links</h3>
          <div className="flex gap-4 items-end mb-8 border border-transparent hover:border-ink-100 p-2 -mx-2 rounded-xl transition-colors">
             <div className="text-ink-400 font-bold text-sm mb-2">#1</div>
             <div className="flex-1">
                <label className="block text-[10px] font-bold text-ink-400 uppercase mb-1">Título</label>
                <input type="text" className="w-full border-b-2 border-[#1d4ed8] outline-none py-1.5 text-ink-800 font-semibold focus:border-[#1d4ed8] transition-colors bg-transparent" placeholder="Ex: Aula de Constitucional" />
             </div>
             <div className="flex-1">
                <label className="block text-[10px] font-bold text-ink-400 uppercase mb-1">Link</label>
                <input type="text" className="w-full border-b-2 border-[#1d4ed8] outline-none py-1.5 text-ink-800 font-semibold focus:border-[#1d4ed8] transition-colors bg-transparent" placeholder="https://..." />
             </div>
             <button className="mb-2 text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={18}/></button>
          </div>
          <div className="flex justify-between items-center mt-4">
             <button className="text-[#1d4ed8] border border-[#1d4ed8] px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-50 transition-colors">Novo Link</button>
             <div className="flex gap-3">
                <button onClick={() => setLinkModalOpen(false)} className="text-ink-500 border border-ink-200 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-ink-50 transition-colors">Cancelar</button>
                <button onClick={() => setLinkModalOpen(false)} className="bg-[#1d4ed8] text-white px-8 py-2.5 rounded-xl text-sm font-bold hover:bg-[#1D4ED8] transition-colors shadow-sm">Salvar</button>
             </div>
          </div>
       </div>
    </div>
  );
}