// Progresso da leitura do edital.
//
// A análise leva dezenas de segundos — extrair 70 páginas de PDF, recortar o anexo e esperar
// o modelo. Antes havia só o texto "Lendo PDF e analisando com IA...", parado: numa espera
// longa, texto estático não distingue "processando" de "travou", e o aluno fecha o modal.
//
// As etapas são as reais, não um cronômetro disfarçado: a página avisa quando a extração do
// PDF termina e a chamada à IA começa. A etapa da IA não "completa" sozinha — fica pulsando
// até a resposta chegar, em vez de fingir uma barra que enche até 100%.

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

const ETAPAS = [
  { id: 'pdf', label: 'Lendo o arquivo' },
  { id: 'ia', label: 'Montando as disciplinas' },
];

export function LeituraEditalProgresso({ fase = 'pdf' }) {
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    const relogio = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(relogio);
  }, []);

  // Texto colado não passa pela extração: começar em "lendo o arquivo" seria inventar uma
  // etapa que não aconteceu.
  const etapas = fase === 'texto' ? ETAPAS.slice(1) : ETAPAS;
  const indiceAtual = fase === 'pdf' ? 0 : etapas.length - 1;

  return (
    <div className="pl-leitura" role="status" aria-live="polite">
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
          <Loader2 size={15} className="animate-spin" style={{ color: 'var(--pl-accent)', flexShrink: 0 }} />
          <strong style={{ fontSize: 13.5, color: 'var(--pl-accent)' }}>
            Lendo o seu edital
          </strong>
          {/* O contador é o que mais tranquiliza numa espera longa: mostra que anda. */}
          <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: 'var(--pl-accent)', opacity: 0.75 }}>
            {segundos}s
          </span>
        </div>

        {etapas.map((etapa, indice) => (
          <div
            key={etapa.id}
            className="pl-leitura-etapa"
            data-estado={indice < indiceAtual ? 'feita' : indice === indiceAtual ? 'ativa' : 'espera'}
          >
            <span className="pl-leitura-ponto" />
            {etapa.label}
          </div>
        ))}

        <div className="pl-leitura-barra"><i /></div>

        {segundos >= 25 && (
          <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--pl-accent)', opacity: 0.8 }}>
            Edital longo demora mais. Pode deixar aberto que a gente avisa aqui.
          </p>
        )}
      </div>
    </div>
  );
}
