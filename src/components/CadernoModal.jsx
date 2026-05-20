import React, { useState } from 'react';
import { Settings, X, Play } from 'lucide-react';

export default function CadernoModal({ isCadernoModalOpen, setIsCadernoModalOpen }) {
  const [cadernoQtd, setCadernoQtd] = useState(20);

  if (!isCadernoModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-[#1e40af]/80 backdrop-blur-md animate-in fade-in duration-300 flex items-center justify-center p-4">
      <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-500 max-h-[95vh]">
        <div className="px-10 py-8 flex justify-between items-center bg-white border-b border-gray-100 relative">
          <div>
            <h2 className="text-3xl font-black text-[#1e40af] tracking-tight flex items-center gap-3">
              <Settings className="text-blue-600" size={32} /> Montar caderno
            </h2>
            <p className="text-gray-500 font-bold mt-1 text-sm">Configure os filtros para gerar o seu treino sob medida.</p>
          </div>
          <button onClick={() => setIsCadernoModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors p-3 rounded-2xl hover:bg-red-50">
            <X size={32} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-8 bg-[#F4F6F9]/30">
          <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h4 className="text-lg font-black text-blue-900">Quantidade de questões</h4>
              <p className="text-sm font-medium text-blue-700/70">Quantas questões quer resolver neste caderno?</p>
            </div>
            <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-blue-100">
              <button onClick={() => setCadernoQtd(Math.max(5, cadernoQtd - 5))} className="w-12 h-12 flex items-center justify-center bg-gray-50 text-gray-500 hover:bg-blue-600 hover:text-white rounded-xl font-black transition-colors">-</button>
              <input
                type="number"
                value={cadernoQtd}
                onChange={(e) => setCadernoQtd(Number(e.target.value))}
                className="w-20 text-center text-3xl font-black text-blue-600 outline-none bg-transparent"
              />
              <button onClick={() => setCadernoQtd(cadernoQtd + 5)} className="w-12 h-12 flex items-center justify-center bg-gray-50 text-gray-500 hover:bg-blue-600 hover:text-white rounded-xl font-black transition-colors">+</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-[2rem] border border-gray-200 shadow-sm hover:border-blue-300 transition-colors">
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Disciplina(s)</label>
              <select className="w-full bg-gray-50 border border-gray-200 focus:border-blue-600 rounded-xl p-4 outline-none font-bold text-gray-700 transition-all cursor-pointer">
                <option>Selecione a disciplina...</option>
                <option>Direito Constitucional</option>
                <option>Direito Administrativo</option>
                <option>Língua Portuguesa</option>
                <option>Informática</option>
              </select>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-gray-200 shadow-sm hover:border-blue-300 transition-colors">
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Assunto(s) específico(s)</label>
              <select className="w-full bg-gray-50 border border-gray-200 focus:border-blue-600 rounded-xl p-4 outline-none font-bold text-gray-700 transition-all cursor-pointer">
                <option>Selecione a disciplina primeiro</option>
              </select>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-gray-200 shadow-sm hover:border-blue-300 transition-colors">
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Banca / instituição</label>
              <select className="w-full bg-gray-50 border border-gray-200 focus:border-blue-600 rounded-xl p-4 outline-none font-bold text-gray-700 transition-all cursor-pointer">
                <option>Qualquer banca</option>
                <option>CESPE / CEBRASPE</option>
                <option>Fundação Carlos Chagas (FCC)</option>
                <option>Fundação Getulio Vargas (FGV)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-[2rem] border border-gray-200 shadow-sm hover:border-blue-300 transition-colors">
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Dificuldade</label>
                <select className="w-full bg-gray-50 border border-gray-200 focus:border-blue-600 rounded-xl p-4 outline-none font-bold text-gray-700 transition-all cursor-pointer">
                  <option>Todas</option>
                  <option>Fácil</option>
                  <option>Média</option>
                  <option>Difícil</option>
                </select>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-gray-200 shadow-sm hover:border-blue-300 transition-colors">
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Ano</label>
                <select className="w-full bg-gray-50 border border-gray-200 focus:border-blue-600 rounded-xl p-4 outline-none font-bold text-gray-700 transition-all cursor-pointer">
                  <option>Recentes (2020-24)</option>
                  <option>Todos os anos</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-gray-200 shadow-sm">
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">Opções avançadas</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200">
                <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-2 border-gray-300 text-[#1d4ed8] focus:ring-[#1d4ed8] cursor-pointer" />
                <span className="text-sm font-bold text-gray-600 group-hover:text-[#1d4ed8] transition-colors">Excluir questões anuladas/desatualizadas</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200">
                <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-2 border-gray-300 text-[#1d4ed8] focus:ring-[#1d4ed8] cursor-pointer" />
                <span className="text-sm font-bold text-gray-600 group-hover:text-[#1d4ed8] transition-colors">Apenas questões com comentários</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200">
                <input type="checkbox" className="w-5 h-5 rounded border-2 border-gray-300 text-[#1d4ed8] focus:ring-[#1d4ed8] cursor-pointer" />
                <span className="text-sm font-bold text-gray-600 group-hover:text-[#1d4ed8] transition-colors">Esconder questões que já resolvi</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200">
                <input type="checkbox" className="w-5 h-5 rounded border-2 border-gray-300 text-[#1d4ed8] focus:ring-[#1d4ed8] cursor-pointer" />
                <span className="text-sm font-bold text-gray-600 group-hover:text-[#1d4ed8] transition-colors">Apenas questões inéditas do Papirando</span>
              </label>
            </div>
          </div>
        </div>

        <div className="px-10 py-6 bg-white border-t border-gray-100 flex justify-between items-center gap-4">
          <div className="hidden sm:block text-sm font-black text-gray-400">
            <span className="text-blue-600">+1.500 questões</span> correspondem a estes filtros.
          </div>
          <div className="flex gap-4 w-full sm:w-auto">
            <button onClick={() => setIsCadernoModalOpen(false)} className="flex-1 sm:flex-none px-8 py-4 rounded-2xl font-black text-gray-500 hover:bg-gray-100 transition-all text-sm border-2 border-gray-200 hover:border-gray-300">Cancelar</button>
            <button onClick={() => setIsCadernoModalOpen(false)} className="flex-[2] sm:flex-none bg-[#1d4ed8] hover:bg-[#1D4ED8] text-white px-10 py-4 rounded-2xl font-black text-sm shadow-xl shadow-blue-200 transition-all flex items-center justify-center gap-2">
              <Play size={18} fill="currentColor" /> Gerar e iniciar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
