import { describe, it, expect, vi } from 'vitest';
import { duracaoDoArquivo } from './duracaoDoArquivo';
import { CHARS_MINIMO_EDITAL } from './editalLimites';

const ANALISE = {
  contests: [
    { roleName: 'Oficial de Estado-Maior', duracaoProva: '4 horas' },
    { roleName: 'Soldado do Quadro de Praças', duracaoProva: '3h30' },
  ],
};

function arquivoFalso() {
  return { name: 'edital.pdf', type: 'application/pdf' };
}

describe('duracaoDoArquivo', () => {
  it('devolve a duração do cargo do aluno, não a do primeiro cargo do edital', async () => {
    const analisar = vi.fn().mockResolvedValue(ANALISE);
    const lerTexto = vi.fn().mockResolvedValue('x'.repeat(CHARS_MINIMO_EDITAL + 1));

    const resultado = await duracaoDoArquivo(arquivoFalso(), {
      analisar,
      cargo: 'Soldado do Quadro de Praças',
      lerTexto,
    });

    expect(resultado).toEqual({ duracao: '3h30', textoCurto: false });
  });

  it('um recorte curto continua valendo — a seção "DAS PROVAS" é curta e é onde a duração está', async () => {
    const analisar = vi.fn().mockResolvedValue({ contests: [{ roleName: 'X', duracaoProva: '4 horas' }] });
    const lerTexto = vi.fn().mockResolvedValue('O candidato terá 4 horas para a prova.');

    const resultado = await duracaoDoArquivo(arquivoFalso(), { analisar, cargo: 'X', lerTexto });

    expect(resultado).toEqual({ duracao: '4 horas', textoCurto: true });
  });

  it('edital sem a duração devolve vazio em vez de chutar', async () => {
    const analisar = vi.fn().mockResolvedValue({ contests: [{ roleName: 'X' }] });
    const lerTexto = vi.fn().mockResolvedValue('y'.repeat(CHARS_MINIMO_EDITAL + 1));

    const { duracao } = await duracaoDoArquivo(arquivoFalso(), { analisar, cargo: 'X', lerTexto });

    expect(duracao).toBe('');
  });

  it('propaga o erro de extração em vez de mascarar como "não encontrei"', async () => {
    const lerTexto = vi.fn().mockRejectedValue(new Error('PDF escaneado'));
    const analisar = vi.fn();

    await expect(
      duracaoDoArquivo(arquivoFalso(), { analisar, cargo: 'X', lerTexto })
    ).rejects.toThrow('PDF escaneado');

    // Não gastou a análise à toa.
    expect(analisar).not.toHaveBeenCalled();
  });
});
