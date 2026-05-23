import React, { useState } from 'react';
import { Play, X } from 'lucide-react';

export default function CadernoModal({ isCadernoModalOpen, setIsCadernoModalOpen }) {
  const [cadernoQtd, setCadernoQtd] = useState(20);

  if (!isCadernoModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-[#14110d]/70 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="simulados-modal-shell simulados-caderno-modal" role="dialog" aria-modal="true">
        <header className="simulados-modal-head">
          <div>
            <div className="pl-overline">Montar prova</div>
            <h2>Montar caderno.</h2>
            <p>Configure os filtros e transforme o banco em uma prova sob medida.</p>
          </div>
          <button type="button" onClick={() => setIsCadernoModalOpen(false)} aria-label="Fechar"><X size={18} /></button>
        </header>

        <div className="simulados-modal-body">
          <section className="simulados-caderno-hero">
            <div>
              <div className="pl-overline">Quantas questoes?</div>
              <h3>Escolha o tamanho da prova</h3>
              <p>20 questoes e um bom ponto de partida para treino focado.</p>
            </div>
            <div className="simulados-stepper">
              <button type="button" onClick={() => setCadernoQtd(Math.max(5, cadernoQtd - 5))}>-</button>
              <input type="number" min={5} value={cadernoQtd} onChange={(event) => setCadernoQtd(Number(event.target.value) || 5)} />
              <button type="button" onClick={() => setCadernoQtd(cadernoQtd + 5)}>+</button>
            </div>
          </section>

          <div className="simulados-form-grid two">
            <ModalField label="Disciplina(s)"><select><option>Selecione a disciplina...</option><option>Direito Constitucional</option><option>Direito Administrativo</option><option>Lingua Portuguesa</option><option>Informatica</option></select></ModalField>
            <ModalField label="Assunto(s)"><select><option>Selecione a disciplina primeiro</option></select></ModalField>
          </div>

          <div className="simulados-form-grid three">
            <ModalField label="Banca"><select><option>Qualquer banca</option><option>CESPE / CEBRASPE</option><option>FCC</option><option>FGV</option></select></ModalField>
            <ModalField label="Dificuldade"><select><option>Todas</option><option>Facil</option><option>Media</option><option>Dificil</option></select></ModalField>
            <ModalField label="Ano"><select><option>Recentes (2020-24)</option><option>Todos os anos</option></select></ModalField>
          </div>

          <section className="simulados-advanced-box">
            <div className="pl-overline">Opcoes avancadas</div>
            <div>
              <CheckOpt defaultChecked label="Excluir anuladas/desatualizadas" />
              <CheckOpt defaultChecked label="Apenas com comentarios" />
              <CheckOpt label="Esconder questoes que ja resolvi" />
              <CheckOpt label="Apenas ineditas do Papirando" />
            </div>
          </section>
        </div>

        <footer className="simulados-modal-footer">
          <p><strong>+1.500 questoes</strong> correspondem a estes filtros.</p>
          <div>
            <button type="button" className="pl-btn" onClick={() => setIsCadernoModalOpen(false)}>Cancelar</button>
            <button type="button" className="pl-btn pl-btn-primary" onClick={() => setIsCadernoModalOpen(false)}><Play size={13} /> Gerar e iniciar</button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function ModalField({ label, children }) {
  return <label className="simulados-modal-field"><span>{label}</span>{children}</label>;
}

function CheckOpt({ label, defaultChecked = false }) {
  return <label><input type="checkbox" defaultChecked={defaultChecked} /><span>{label}</span></label>;
}
