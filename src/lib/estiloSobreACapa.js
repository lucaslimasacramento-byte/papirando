// Estilos de conteudo sobreposto a capa do curso.
//
// Vivem fora do componente porque o Fast Refresh do Vite so funciona quando um arquivo
// exporta apenas componentes — e porque a pagina de cursos precisa dos mesmos valores para
// desenhar as acoes por cima da imagem.

// Texto sobre a capa. Sempre claro, sempre com sombra: a sombra e o que segura a leitura
// quando a foto do aluno tem uma area clara justo atras da palavra.
export const SOBRE_A_CAPA = {
  color: '#fff',
  textShadow: '0 1px 3px rgba(0,0,0,0.55)',
};

// Acoes por cima da capa: precisam de fundo proprio, porque um icone claro pode cair sobre
// uma area clara da foto e sumir.
export const BOTAO_SOBRE_A_CAPA = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  borderRadius: 7,
  border: '1px solid rgba(255,255,255,0.26)',
  background: 'rgba(12,10,8,0.42)',
  backdropFilter: 'blur(4px)',
  color: '#fff',
  cursor: 'pointer',
  padding: 0,
};
