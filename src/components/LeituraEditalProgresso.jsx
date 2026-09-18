// Progresso da leitura do edital.
//
// A análise leva dezenas de segundos — extrair 70 páginas de PDF, recortar o anexo e esperar
// o modelo. Antes havia só o texto "Lendo PDF e analisando com IA...", parado: numa espera
// longa, texto estático não distingue "processando" de "travou", e o aluno fecha o modal.
//
// As etapas são informativas, não medidas: o app não tem como saber o progresso real dentro
// da chamada à IA. Por isso a última etapa não "completa" sozinha — ela fica pulsando até a
// resposta chegar, em vez de fingir uma barra que enche até 100%.

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

const ETAPAS = [
  { id: 'pdf', label: 'Lendo o PDF', segundos: 4 },
  { id: 'recorte', label: 'Localizando o conteúdo programático', segundos: 3 },
  { id: 'ia', label: 'A IA está estruturando as disciplinas', segundos: Infinity },
];

export function LeituraEditalProgresso({ etapaInicial = 0 }) {
  const [etapaAtual, setEtapaAtual] = useState(etapaInicial);
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    const relogio = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(relogio);
  }, []);

  useEffect(() => {
    if (etapaAtual >= ETAPAS.length - 1) return undefined;
    const espera = ETAPAS[etapaAtual].segundos * 1000;
    const proxima = setTimeout(() => setEtapaAtual((i) => Math.min(i + 1, ETAPAS.length - 1)), espera);
    return () => clearTimeout(proxima);
  }, [etapaAtual]);

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

        {ETAPAS.map((etapa, indice) => (
          <div
            key={etapa.id}
            className="pl-leitura-etapa"
            data-estado={indice < etapaAtual ? 'feita' : indice === etapaAtual ? 'ativa' : 'espera'}
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
