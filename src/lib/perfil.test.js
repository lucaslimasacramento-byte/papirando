import { describe, it, expect } from 'vitest';
import { primeiroNomeDoPerfil } from './perfil';

describe('primeiroNomeDoPerfil', () => {
  // O bug que o dono pegou: entrando com contato@boxsol.com.br, o app dizia
  // "Boa noite, Contato" e trocava para "Lucas" quando o perfil chegava.
  it('nao chuta nome enquanto o perfil nao carregou', () => {
    expect(primeiroNomeDoPerfil(null, 'contato@boxsol.com.br', { carregado: false })).toBe('');
  });

  it('usa o primeiro nome do perfil', () => {
    expect(primeiroNomeDoPerfil({ nome: 'Lucas Lima Sacramento' }, 'contato@x.com')).toBe('Lucas');
  });

  // O username vinha antes do nome em versoes anteriores, e "Lucas Lima" era ignorado em
  // favor de "lucasl".
  it('prefere o nome real ao username', () => {
    expect(primeiroNomeDoPerfil({ nome: 'Lucas Lima', username: 'lucasl' }, '')).toBe('Lucas');
  });

  it('cai no username quando nao ha nome', () => {
    expect(primeiroNomeDoPerfil({ username: 'concurseiro' }, 'x@y.com')).toBe('Concurseiro');
  });

  it('cai na primeira palavra do email em ultimo caso', () => {
    expect(primeiroNomeDoPerfil({}, 'lucas.lima@gmail.com')).toBe('Lucas');
    expect(primeiroNomeDoPerfil({}, 'lucas_lima@gmail.com')).toBe('Lucas');
  });

  it('devolve vazio quando nao ha nada', () => {
    expect(primeiroNomeDoPerfil({}, '')).toBe('');
    expect(primeiroNomeDoPerfil(null, null)).toBe('');
  });

  it('nao quebra com email sem arroba', () => {
    expect(primeiroNomeDoPerfil({}, 'lucas')).toBe('Lucas');
  });
});
