const BRASIL_API_BASE_URL = 'https://brasilapi.com.br/api';

export async function getBrazilHolidays(year) {
  const normalizedYear = Number(year);
  if (!Number.isInteger(normalizedYear) || normalizedYear < 1900 || normalizedYear > 2200) {
    return [];
  }

  const response = await fetch(`${BRASIL_API_BASE_URL}/feriados/v1/${normalizedYear}`, {
    headers: { accept: 'application/json' },
  });

  if (response.status === 404) return [];
  if (response.status === 429) {
    throw new Error('A BrasilAPI limitou temporariamente a consulta de feriados.');
  }
  if (!response.ok) {
    throw new Error(`Falha ao carregar feriados nacionais (${response.status}).`);
  }

  const data = await response.json();
  return Array.isArray(data)
    ? data
        .map((item) => ({
          date: String(item?.date || '').slice(0, 10),
          name: String(item?.name || '').trim(),
          type: String(item?.type || 'national').trim(),
        }))
        .filter((item) => item.date && item.name)
    : [];
}
