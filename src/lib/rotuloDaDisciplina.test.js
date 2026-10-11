import { describe, it, expect } from 'vitest';
import { rotuloDaDisciplina, chaveDaDisciplina } from './rotuloDaDisciplina';

describe('rotuloDaDisciplina', () => {
  it('devolve o acento e a maiuscula que a API do ENEM nao manda', () => {
    // O caso da tela: o cartao exibia "matematica".
    expect(rotuloDaDisciplina('matematica')).toBe('Matemática');
  });

  it('traduz os slugs das areas do ENEM', () => {
    expect(rotuloDaDisciplina('ciencias-natureza')).toBe('Ciências da Natureza');
    expect(rotuloDaDisciplina('ciencias-humanas')).toBe('Ciências Humanas');
    expect(rotuloDaDisciplina('linguagens')).toBe('Linguagens');
  });

  it('nao desfaz um nome que ja veio escrito direito', () => {
    expect(rotuloDaDisciplina('Direito Penal - Parte Geral')).toBe('Direito Penal - Parte Geral');
    expect(rotuloDaDisciplina('Língua Portuguesa')).toBe('Língua Portuguesa');
  });

  it('nome desconhecido sai apresentavel, com conectivo minusculo', () => {
    expect(rotuloDaDisciplina('etica_no_servico_publico')).toBe('Ética no Serviço Público');
    expect(rotuloDaDisciplina('gestao de pessoas')).toBe('Gestão de Pessoas');
  });

  it('preserva sigla ja escrita em caixa alta', () => {
    expect(rotuloDaDisciplina('legislacao do SUS')).toBe('Legislação do SUS');
  });

  it('vazio sai vazio — o que mostrar no lugar e decisao da tela', () => {
    expect(rotuloDaDisciplina('')).toBe('');
    expect(rotuloDaDisciplina(null)).toBe('');
    expect(rotuloDaDisciplina('   ')).toBe('');
  });
});

describe('chaveDaDisciplina', () => {
  it('leva grafias diferentes do mesmo nome a uma chave so', () => {
    expect(chaveDaDisciplina('Ciências da Natureza')).toBe('ciencias-da-natureza');
    expect(chaveDaDisciplina('CIENCIAS_DA_NATUREZA')).toBe('ciencias-da-natureza');
    expect(chaveDaDisciplina('  ciencias da natureza  ')).toBe('ciencias-da-natureza');
  });
});
