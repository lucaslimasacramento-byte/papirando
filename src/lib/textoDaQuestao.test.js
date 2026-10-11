import { describe, it, expect } from 'vitest';
import {
  blocosDoEnunciado,
  textoDoEnunciado,
  textoDaAlternativa,
  resumoDoEnunciado,
} from './textoDaQuestao';

// O caso que motivou o arquivo: ENEM 2023, questao 157. O grafico estava no meio da frase,
// em markdown, e aparecia na tela como "atividade ![](https://enem.dev/...png) Apos a coleta".
const ENEM_157 = [
  'Um professor, para promover a aprendizagem dos estudantes em estatística, propôs uma atividade.',
  'O gráfico apresenta a massa corporal, em quilograma, e a altura, em metro, obtidas na atividade',
  '![](https://enem.dev/2023/questions/157/13cfbc97-0034-4904-9100-ff5ca3f6504e.png)',
  'Após a coleta dos dados, os estudantes calcularam a média dos valores obtidos.',
].join(' ');

describe('blocosDoEnunciado', () => {
  it('tira a figura do meio da frase e a transforma em bloco proprio', () => {
    const blocos = blocosDoEnunciado(ENEM_157);

    expect(blocos.map((bloco) => bloco.tipo)).toEqual(['paragrafo', 'figura', 'paragrafo']);
    expect(blocos[1].url).toBe('https://enem.dev/2023/questions/157/13cfbc97-0034-4904-9100-ff5ca3f6504e.png');
    expect(blocos[0].texto).toContain('obtidas na atividade');
    expect(blocos[2].texto).toContain('Após a coleta dos dados');
  });

  it('nenhum bloco de texto guarda a sintaxe da imagem', () => {
    const blocos = blocosDoEnunciado(ENEM_157);
    blocos
      .filter((bloco) => bloco.tipo === 'paragrafo')
      .forEach((bloco) => {
        expect(bloco.texto).not.toContain('![');
        expect(bloco.texto).not.toContain('enem.dev');
      });
  });

  it('limpa o "[]" orfao que sobra quando a fonte manda a imagem quebrada', () => {
    const blocos = blocosDoEnunciado('obtidas na atividade ![] Após a coleta');
    expect(blocos).toHaveLength(1);
    expect(blocos[0].texto).toBe('obtidas na atividade Após a coleta');
  });

  it('separa paragrafos por linha dupla e costura a quebra solta do PDF', () => {
    const blocos = blocosDoEnunciado('Primeiro trecho\ncontinua aqui.\n\nSegundo trecho.');
    expect(blocos.map((bloco) => bloco.texto)).toEqual([
      'Primeiro trecho continua aqui.',
      'Segundo trecho.',
    ]);
  });

  it('nao repete a figura quando image_url aponta para a mesma imagem do markdown', () => {
    const url = 'https://enem.dev/2023/questions/157/grafico.png';
    const blocos = blocosDoEnunciado(`Veja o gráfico ![](${url}) e responda.`, url);
    expect(blocos.filter((bloco) => bloco.tipo === 'figura')).toHaveLength(1);
  });

  it('aproveita image_url quando o enunciado nao traz figura nenhuma', () => {
    const blocos = blocosDoEnunciado('Veja o gráfico e responda.', 'https://enem.dev/g.png');
    expect(blocos.map((bloco) => bloco.tipo)).toEqual(['paragrafo', 'figura']);
  });

  it('recusa url que nao seja http(s) ou data:image', () => {
    // O banco recebe colagem de terceiros e texto extraido de PDF de origem qualquer.
    const blocos = blocosDoEnunciado('Olhe ![](javascript:alert(1)) aqui.');
    expect(blocos.filter((bloco) => bloco.tipo === 'figura')).toHaveLength(0);
  });

  it('transforma link markdown no proprio texto, sem deixar a URL a vista', () => {
    const blocos = blocosDoEnunciado('Conforme a [Lei 8.112](https://planalto.gov.br/l8112), o servidor...');
    expect(blocos[0].texto).toBe('Conforme a Lei 8.112, o servidor...');
  });

  it('decodifica entidades HTML que vieram da fonte', () => {
    const blocos = blocosDoEnunciado('A &quot;prova&quot; &eacute; objetiva &amp; dura.');
    expect(blocos[0].texto).toBe('A "prova" é objetiva & dura.');
  });

  it('enunciado vazio nao vira bloco nenhum', () => {
    expect(blocosDoEnunciado('')).toEqual([]);
    expect(blocosDoEnunciado(null)).toEqual([]);
  });
});

describe('textoDoEnunciado', () => {
  it('devolve so o texto, que e o que a busca indexa e o que a IA le', () => {
    const texto = textoDoEnunciado(ENEM_157);
    expect(texto).not.toContain('https://');
    expect(texto).toContain('Um professor');
    expect(texto).toContain('Após a coleta');
  });
});

describe('textoDaAlternativa', () => {
  it('separa o texto da figura, porque alternativa de matematica costuma ser imagem', () => {
    const alternativa = textoDaAlternativa('![](https://enem.dev/a.png) 10 cm');
    expect(alternativa.texto).toBe('10 cm');
    expect(alternativa.figuras).toHaveLength(1);
  });
});

describe('resumoDoEnunciado', () => {
  it('corta no limite e marca a continuacao', () => {
    const resumo = resumoDoEnunciado(ENEM_157, 40);
    expect(resumo.length).toBeLessThanOrEqual(40);
    expect(resumo.endsWith('…')).toBe(true);
  });

  it('texto curto sai inteiro, sem reticencia', () => {
    expect(resumoDoEnunciado('Questão curta.', 40)).toBe('Questão curta.');
  });
});
