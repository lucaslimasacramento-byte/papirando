// Limites do edital, compartilhados entre o navegador e as funções de API.
//
// A constante morava em `api/_edital-text.js` e o navegador a importava de lá. Só que o
// dev server proxia tudo que começa com `/api` para o servidor de IA local: o import virava
// uma requisição HTTP que falhava, o módulo raiz não carregava e o app abria em branco.
// Código que os dois lados usam mora em `src/lib/`; o lado servidor importa daqui.

// Piso para o documento passar por edital de abertura. Os 13 editais reais do teste têm de
// 115k a 561k caracteres; os 3 não-editais que caíram na amostra tinham 1,3k, 4k e 18,6k.
export const CHARS_MINIMO_EDITAL = 20000;
