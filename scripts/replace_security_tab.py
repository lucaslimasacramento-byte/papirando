NEW_BLOCK = """            {/* Security tab */}
            {activeTab === 'security' && (
              <div style={{ display: 'flex', minHeight: 0, flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
                <SectionHeader
                  eyebrow="Segurança"
                  title="Dados sensíveis e acessos"
                  subtitle="Identidade, senha, dados e exclusão num lugar só."
                />

                <div style={{ minHeight: 0, overflowY: 'auto', overflowX: 'hidden', paddingRight: 4, paddingBottom: 16 }}>
                  <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>

                    {/* Identidade + LGPD + Perigo */}
                    <div className="pl-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <p className="pl-eyebrow" style={{ marginBottom: 2 }}>Conta</p>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--pl-ink)', marginBottom: 4 }}>Identidade da conta</h3>

                      {/* E-mail */}
                      <div style={{ borderRadius: 12, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                            <ToneIconWrap tone="neutral"><Mail style={{ width: 15, height: 15 }} /></ToneIconWrap>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--pl-ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>E-mail</p>
                              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {profileData?.email || currentUserEmail || 'Não informado'}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditingEmail((v) => !v)}
                            className="pl-btn pl-btn-ghost"
                            style={{ width: 32, minWidth: 32, height: 30, padding: 0, flexShrink: 0 }}
                            aria-label="Editar e-mail"
                          >
                            <Pencil style={{ width: 13, height: 13 }} />
                          </button>
                        </div>
                        {editingEmail && (
                          <div style={{ marginTop: 12, display: 'grid', gap: 8, gridTemplateColumns: 'minmax(0,1fr) auto', alignItems: 'end' }}>
                            <Field label="Novo e-mail" type="email" value={newEmail} onChange={setNewEmail} placeholder="voce@exemplo.com" autoComplete="email" />
                            <button type="button" onClick={handleEmailChange} disabled={emailBusy || !currentUserId} className="pl-btn pl-btn-primary" style={{ height: 34, opacity: (emailBusy || !currentUserId) ? 0.6 : 1 }}>
                              {emailBusy ? 'Salvando...' : 'Confirmar'}
                            </button>
                            <p style={{ gridColumn: '1 / -1', fontSize: 11.5, color: 'var(--pl-ink-3)' }}>
                              O novo endereço pode exigir confirmação no inbox.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* CPF + Username */}
                      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}>
                        <div style={{ borderRadius: 12, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '10px 14px' }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--pl-ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>CPF</p>
                          <p style={{ fontSize: 13, fontWeight: 600, color: profileHasValidCpf ? 'var(--pl-ink)' : 'var(--pl-warn)' }}>
                            {form.cpf || 'Não informado'}
                          </p>
                          <p style={{ marginTop: 3, fontSize: 11, color: profileHasValidCpf ? 'var(--pl-success)' : 'var(--pl-ink-3)' }}>
                            {profileHasValidCpf ? 'Válido' : 'Preencha em Visão geral'}
                          </p>
                        </div>
                        <div style={{ borderRadius: 12, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '10px 14px' }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--pl-ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Username</p>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rankingPreview}</p>
                          <p style={{ marginTop: 3, fontSize: 11, color: 'var(--pl-ink-3)' }}>Público nos rankings</p>
                        </div>
                      </div>

                      {/* Divisor */}
                      <div style={{ height: 1, background: 'var(--pl-rule-2)', margin: '2px 0' }} />

                      {/* LGPD + Zona de perigo em grid 2 cols */}
                      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}>

                        {/* LGPD */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <p className="pl-eyebrow" style={{ marginBottom: 2 }}>LGPD</p>
                          <LgpdButton icon={Download} label="Exportar dados" description="JSON com seu histórico" tone="accent" onClick={async () => {
                            try {
                              const { data, error } = await supabase.rpc('export_my_data');
                              if (error) throw error;
                              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `papirando-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
                              a.click();
                              URL.revokeObjectURL(url);
                            } catch {
                              alert('Erro ao exportar dados. Tente novamente.');
                            }
                          }} />
                          <LgpdButton icon={FileText} label="Privacidade" description="Como tratamos seus dados" tone="neutral" onClick={() => setActiveTab('privacidade')} />
                          <LgpdButton icon={FileText} label="Termos de Uso" description="Regras da plataforma" tone="neutral" onClick={() => setActiveTab('termos')} />
                        </div>

                        {/* Zona de perigo */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <p className="pl-eyebrow" style={{ marginBottom: 2, color: 'var(--pl-danger)' }}>Zona de perigo</p>
                          <div style={{ borderRadius: 12, border: '1px solid var(--pl-danger-soft)', background: 'var(--pl-danger-soft)', padding: '10px 12px' }}>
                            <p style={{ fontSize: 12, color: 'var(--pl-ink-2)', marginBottom: 10, lineHeight: 1.5 }}>
                              A exclusão é irreversível e pode levar até 30 dias.
                            </p>
                            <LgpdButton icon={Trash2} label="Solicitar exclusão" description="Inicia a remoção permanente" tone="danger" onClick={async () => {
                              const confirmed = window.confirm('Tem certeza? Sua conta e todos os dados serão excluídos permanentemente em até 30 dias. Esta ação não pode ser desfeita.');
                              if (!confirmed) return;
                              try {
                                const { data, error } = await supabase.rpc('request_account_deletion');
                                if (error) throw error;
                                alert(data?.message || 'Solicitação registrada. Entraremos em contato.');
                              } catch {
                                alert('Erro ao registrar solicitação. Entre em contato: privacidade@papirando.com');
                              }
                            }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Senha + recuperação */}
                    <div className="pl-card" style={{ padding: 20 }}>
                      <p className="pl-eyebrow" style={{ marginBottom: 6 }}>Senha</p>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--pl-ink)', marginBottom: 16 }}>Alterar senha</h3>

                      <div style={{ display: 'grid', gap: 10 }}>
                        <Field label="Senha atual" type="password" value={currentPassword} onChange={setCurrentPassword} placeholder="••••••••" autoComplete="current-password" />
                        <Field label="Nova senha" type="password" value={newPassword} onChange={setNewPassword} placeholder="••••••••" autoComplete="new-password" />
                        <Field label="Confirmar nova senha" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Repita a senha" autoComplete="new-password" />
                        <button type="button" onClick={handlePasswordChangeDirect} disabled={passwordChangeBusy} className="pl-btn pl-btn-primary" style={{ opacity: passwordChangeBusy ? 0.6 : 1 }}>
                          {passwordChangeBusy ? 'Salvando...' : 'Salvar nova senha'}
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0' }}>
                        <div style={{ flex: 1, height: 1, background: 'var(--pl-rule-2)' }} />
                        <span style={{ fontSize: 11, color: 'var(--pl-ink-3)', fontWeight: 600, letterSpacing: '0.06em' }}>OU</span>
                        <div style={{ flex: 1, height: 1, background: 'var(--pl-rule-2)' }} />
                      </div>

                      <div style={{ borderRadius: 12, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)', marginBottom: 2 }}>Esqueceu a senha?</p>
                          <p style={{ fontSize: 12, color: 'var(--pl-ink-3)' }}>Receba um link de redefinição por e-mail.</p>
                        </div>
                        <button type="button" onClick={handlePasswordReset} disabled={passwordBusy || !currentUserEmail} className="pl-btn pl-btn-ghost" style={{ flexShrink: 0, opacity: (passwordBusy || !currentUserEmail) ? 0.5 : 1 }}>
                          {passwordBusy ? 'Enviando...' : 'Enviar link'}
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}"""

with open(r'C:\\Users\\lucas\\Desktop\\App_Estudos\\papirando\\src\\pages\\Perfil.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the security tab block start/end
start = None
end = None
for i, line in enumerate(lines):
    if '{/* Security tab */}' in line and start is None:
        start = i
    if start and i > start + 5 and line.strip() == ')}' and end is None:
        # Check if we're past the danger zone content
        if i > start + 100:
            end = i
            break

print(f"Start: {start+1}, End: {end+1}")

new_lines = lines[:start] + [NEW_BLOCK + '\\n'] + lines[end+1:]

with open(r'C:\\Users\\lucas\\Desktop\\App_Estudos\\papirando\\src\\pages\\Perfil.jsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"Done. Lines: {len(lines)} -> {len(new_lines)}")
