import React from 'react';
import { APLICATIVOS_LINKS } from '../config/aplicativosLinks';
import {
  Smartphone,
  WifiOff,
  Headphones,
  BellRing,
  QrCode,
  Cloud,
  ShieldCheck,
  Download,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

export default function Aplicativos() {
  return (
    <div className="pl-page">
      {/* Hero compacto */}
      <header className="pl-app-hero">
        <div className="lede">
          <div className="icon">
            <Smartphone size={20} strokeWidth={1.75} />
          </div>
          <div>
            <span className="eyebrow">Estude em qualquer lugar</span>
            <h1>O Papirando no <strong>seu bolso</strong>.</h1>
            <p className="subtitle">
              A mesma potência da plataforma web, agora otimizada para iOS e Android. Baixe seus materiais e estude offline.
            </p>
          </div>
        </div>
        <div className="pills">
          <span className="pill"><Cloud size={13} /> Sincronização em nuvem</span>
          <span className="pill"><ShieldCheck size={13} /> Acesso rápido e seguro</span>
        </div>
      </header>

      {/* Bloco central com telefone */}
      <section className="pl-app-stage">
        <div>
          <span className="eyebrow"><Sparkles size={11} /> Experiência mobile</span>
          <h2>A sua aprovação não tira férias<span className="dot">.</span></h2>
          <p className="copy">
            Sincronize seu progresso na nuvem. Resolva questões no ônibus, ouça as leis enquanto treina e receba lembretes para não perder o ritmo.
          </p>
          <div className="stores">
            <LinkOrStaticButton href={APLICATIVOS_LINKS?.appStore} className="store-btn">
              <Download size={18} /> App Store
            </LinkOrStaticButton>
            <LinkOrStaticButton href={APLICATIVOS_LINKS?.googlePlay} className="store-btn dark">
              <Download size={18} /> Google Play
            </LinkOrStaticButton>
          </div>
          <div className="mini-pills">
            <span className="mini-pill"><WifiOff size={12} /> Modo offline</span>
            <span className="mini-pill"><Headphones size={12} /> Áudio em segundo plano</span>
            <span className="mini-pill"><BellRing size={12} /> Push inteligente</span>
          </div>
        </div>
        <div className="phone">
          <PhoneMockup />
        </div>
      </section>

      {/* 3 features */}
      <section className="pl-app-features">
        <article className="pl-app-feature">
          <div className="icon green"><WifiOff size={22} /></div>
          <h4>Modo offline</h4>
          <p>Baixe cadernos de questões inteiros e audiolivros. Estude no metrô, no avião ou onde a internet não chega. Tudo sincroniza quando a conexão voltar.</p>
        </article>
        <article className="pl-app-feature">
          <div className="icon amber"><Headphones size={22} /></div>
          <h4>Áudio em segundo plano</h4>
          <p>Bloqueie a tela do celular e continue ouvindo as leis em áudio ou a mentoria da semana enquanto corre, dirige ou organiza a rotina.</p>
        </article>
        <article className="pl-app-feature">
          <div className="icon violet"><BellRing size={22} /></div>
          <h4>Notificações inteligentes</h4>
          <p>O algoritmo percebe quando uma matéria está esfriando. Você recebe um alerta útil direto no celular: "Está na hora de revisar Atos Administrativos".</p>
        </article>
      </section>

      {/* QR pareamento */}
      <section className="pl-app-pair">
        <div>
          <span className="eyebrow"><QrCode size={11} /> Emparelhamento instantâneo</span>
          <h3>Já instalou o aplicativo?</h3>
          <p>
            Abra o app Papirando PRO no seu celular e aponte a câmera para o código ao lado para sincronizar a sua conta instantaneamente, sem precisar digitar senha.
          </p>
          <a href={APLICATIVOS_LINKS?.syncInstructions || '#'}>
            Ver instruções de sincronização <ArrowUpRight size={13} />
          </a>
        </div>
        <div className="qr-box">
          <div className="qr"><QrCode size={80} /></div>
          <span className="lab">Escaneie para entrar</span>
        </div>
      </section>
    </div>
  );
}

function LinkOrStaticButton({ href, className, children, ...rest }) {
  const url = typeof href === 'string' ? href.trim() : '';
  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={className} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={className} {...rest}>
      {children}
    </button>
  );
}

function PhoneMockup() {
  return (
    <div style={{
      width: 220, height: 440,
      background: 'linear-gradient(180deg, #1e3a5f 0%, #4338ca 100%)',
      borderRadius: 32,
      border: '4px solid rgba(255,255,255,0.10)',
      boxShadow: '0 24px 60px rgba(29,78,216,0.40), 0 0 0 1px rgba(0,0,0,0.30)',
      padding: '24px 18px',
      display: 'flex', flexDirection: 'column', gap: 16,
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
        width: 80, height: 22, background: '#000', borderRadius: 14,
      }} />
      <div style={{ height: 28 }} />
      <div>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          Meta diária: 80%
        </p>
        <p style={{ margin: '6px 0 0', fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 22, letterSpacing: '-0.025em', color: '#fff', lineHeight: 1.1 }}>
          Olá, estudante!
        </p>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: 12 }}>
        <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.50)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
          Q1520 · CESPE
        </p>
        <div style={{ height: 5, background: 'rgba(255,255,255,0.12)', borderRadius: 3, marginTop: 10 }} />
        <div style={{ height: 5, background: 'rgba(255,255,255,0.12)', borderRadius: 3, marginTop: 6, width: '70%' }} />
      </div>
      <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14 }}>
          ▶
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#10b981', letterSpacing: '0.16em', textTransform: 'uppercase' }}>Em reprodução</p>
          <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 600, color: '#fff' }}>Código Penal</p>
        </div>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700 }}>
          80%
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: '#fff' }}>Meta de questões</p>
          <p style={{ margin: '2px 0 0', fontSize: 9, color: 'rgba(255,255,255,0.55)' }}>80/100 resolvidas hoje</p>
        </div>
      </div>
    </div>
  );
}
