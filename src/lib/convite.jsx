import React from 'react';
import { createRoot } from 'react-dom/client';
import ConviteParaAssinar from '../components/ConviteParaAssinar';

// Mostra o convite de assinatura a partir de qualquer lugar.
//
// Monta como os outros dialogos do app (ver src/lib/dialogs.jsx): um root React avulso no
// body. Isso importa porque o convite precisa nascer de dentro do cliente de IA, que nao tem
// acesso ao estado da aplicacao — e e justamente la que a resposta 402 do servidor chega.

// Evita empilhar convites: duas chamadas barradas em sequencia (a pagina tenta, o usuario
// clica de novo) abririam dois modais sobrepostos.
let convidando = false;

export function convidarParaAssinar({ acao = '' } = {}) {
  return new Promise((resolve) => {
    if (convidando) { resolve(false); return; }
    convidando = true;

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const fechar = (querAssinar) => {
      convidando = false;
      root.unmount();
      container.remove();
      resolve(querAssinar);
    };

    root.render(
      <ConviteParaAssinar
        acao={acao}
        onFechar={() => fechar(false)}
        onAssinar={() => {
          fechar(true);
          // A pagina de Assinatura e uma aba do app; quem ouve este evento e o App, que sabe
          // trocar de aba. Evento em vez de prop porque este convite nasce em lugares que
          // nao tem acesso ao estado da aplicacao.
          window.dispatchEvent(new CustomEvent('papirando:abrir-assinatura'));
        }}
      />
    );
  });
}
