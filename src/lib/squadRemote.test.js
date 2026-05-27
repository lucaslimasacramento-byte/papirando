import { describe, expect, it, vi } from 'vitest';

import { fetchSquadRowByInviteCode } from './squadRemote';

describe('convites de esquadrao', () => {
  it('bloqueia codigo curto antes de chamar RPC', async () => {
    const supabaseClient = { rpc: vi.fn() };

    const result = await fetchSquadRowByInviteCode(supabaseClient, 'abc');

    expect(result.row).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(supabaseClient.rpc).not.toHaveBeenCalled();
  });

  it('normaliza codigo antes de chamar RPC', async () => {
    const supabaseClient = {
      rpc: vi.fn().mockResolvedValue({ data: [{ id: 'squad-1' }], error: null }),
    };

    const result = await fetchSquadRowByInviteCode(supabaseClient, ' pf2026-alfa!! ');

    expect(supabaseClient.rpc).toHaveBeenCalledWith('resolve_squad_invite', { p_code: 'PF2026-ALFA' });
    expect(result.row).toEqual({ id: 'squad-1' });
  });
});
