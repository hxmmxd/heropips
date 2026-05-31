'use client';

import React, { useState, useEffect } from 'react';
import {
  Zap, Crown, Rocket, Check, X, Loader2
} from 'lucide-react';

interface AdminSettingsProps {
  initialConfig: Record<string, any>;
  initialAnnouncements: any[];
  onRefresh: () => Promise<void> | void;
}

export default function AdminSettings({
  initialConfig,
  initialAnnouncements,
  onRefresh
}: AdminSettingsProps) {
  const [config, setConfig] = useState(initialConfig);
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [settingsSubPage, setSettingsSubPage] = useState<'main' | 'referral' | 'pricing' | 'announcements' | 'payments'>('main');

  const [referralConfig, setReferralConfig] = useState(() => {
    if (initialConfig?.referral_config) {
      return initialConfig.referral_config;
    }
    return {
      enabled: true,
      levels: [
        { level: 1, label: 'Direct',       commission: 10, rebate: 5  },
        { level: 2, label: 'Level 2',      commission: 5,  rebate: 2  },
        { level: 3, label: 'Level 3',      commission: 3,  rebate: 1  },
        { level: 4, label: 'Level 4',      commission: 2,  rebate: 0.5},
        { level: 5, label: 'Level 5',      commission: 1,  rebate: 0.25},
      ],
      milestones: [
        { referrals: 1,  reward: 25   },
        { referrals: 5,  reward: 100  },
        { referrals: 10, reward: 250  },
        { referrals: 25, reward: 750  },
        { referrals: 50, reward: 2000 },
      ],
      minWithdrawal: 50,
      cookieDays: 30,
      payoutDay: 1,
    };
  });

  const [npApiKey, setNpApiKey]             = useState('');
  const [npEmail, setNpEmail]               = useState('');
  const [npPassword, setNpPassword]         = useState('');
  const [npTotpSecret, setNpTotpSecret]     = useState('');
  const [npIpnSecret, setNpIpnSecret]       = useState('');
  const [npSandbox, setNpSandbox]           = useState(false);
  const [npCoins, setNpCoins]               = useState(['USDT (TRC-20)','USDT (ERC-20)','BTC','ETH','BNB','USDC']);

  const [npTestResult, setNpTestResult]     = useState<{ok:boolean;message:string}|null>(null);
  const [npTesting, setNpTesting]           = useState(false);
  const [npSaved, setNpSaved]               = useState(false);
  const [refSaved, setRefSaved]             = useState(false);
  const [saveMsg, setSaveMsg]               = useState('');
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', message: '', type: 'info' });

  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
      if (initialConfig.referral_config) {
        setReferralConfig(initialConfig.referral_config);
      }
      if (initialConfig.nowpayments_config) {
        const npc = initialConfig.nowpayments_config;
        setNpApiKey(npc.api_key || '');
        setNpEmail(npc.email || '');
        setNpPassword(npc.password || '');
        setNpTotpSecret(npc.totp_secret || '');
        setNpIpnSecret(npc.ipn_secret || '');
        setNpSandbox(npc.sandbox ?? false);
        if (Array.isArray(npc.enabled_coins)) {
          setNpCoins(npc.enabled_coins);
        }
      }
    }
  }, [initialConfig]);

  useEffect(() => {
    if (initialAnnouncements) {
      setAnnouncements(initialAnnouncements);
    }
  }, [initialAnnouncements]);

  return (
    <>
      {/* ── Settings Sub-Nav ── */}
      <div className="adm-card adm-card-full" style={{ padding:0, overflow:'hidden' }}>
        <div style={{ display:'flex', borderBottom:'1px solid var(--border)', background:'var(--sidebar-bg)' }}>
          {[
            { id:'main',         label:'Platform',  icon:'⚡' },
            { id:'referral',     label:'Referral',  icon:'🎁' },
            { id:'pricing',      label:'Pricing',   icon:'💳' },
            { id:'announcements',label:'Announce',  icon:'📢' },
            { id:'payments',     label:'Payments',  icon:'₿' },
          ].map(tab => (
            <button key={tab.id}
              onClick={() => {
                setSettingsSubPage(tab.id as any);
                document.querySelector('.adm-main')?.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={{
                padding:'14px 20px', border:'none', background:'none', cursor:'pointer',
                fontFamily:'inherit', fontSize:13, fontWeight:600,
                color: settingsSubPage === tab.id ? 'var(--text)' : 'var(--subtext)',
                borderBottom: settingsSubPage === tab.id ? '2px solid #6366f1' : '2px solid transparent',
                display:'flex', alignItems:'center', gap:7, transition:'all 0.15s',
                whiteSpace:'nowrap',
              }}>
              <span>{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Platform Tab ── */}
      {settingsSubPage === 'main' && (
        <>
          {/* Platform Toggles */}
          <div className="adm-card adm-card-full">
            <div className="adm-card-head"><h3>Platform Controls</h3></div>
            <div className="adm-card-body">
              <div className="adm-toggle-list">
                {[
                  { key:'maintenance_mode', icon:'⚠️', label:'Maintenance Mode',     desc:'Show maintenance page to all users',                color:'#f59e0b' },
                  { key:'ai_kill_switch',   icon:'⚡', label:'AI Kill Switch',        desc:'Immediately pause all AI signal generation',        color:'#ef4444' },
                  { key:'new_registrations',icon:'👤', label:'Allow Registrations',   desc:'Let new users sign up to the platform',             color:'#10b981' },
                  { key:'demo_mode',        icon:'🧪', label:'Demo Mode',             desc:'Route all trades to paper trading simulator',       color:'#6366f1' },
                ].map(t => (
                  <div key={t.key} className="adm-toggle-row">
                    <div className="adm-toggle-info">
                      <span style={{ fontSize:18 }}>{t.icon}</span>
                      <div><p className="adm-toggle-name">{t.label}</p><p className="adm-toggle-desc">{t.desc}</p></div>
                    </div>
                    <div className={`adm-switch ${config[t.key] ? 'adm-switch-on' : ''}`} role="button" tabIndex={0}
                      onClick={() => {
                        const val = !config[t.key];
                        fetch('/api/admin', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ configKey: t.key, configValue: val }) });
                        setConfig({ ...config, [t.key]: val });
                      }}>
                      <span className="adm-switch-track"><span className="adm-switch-thumb" /></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Feature Flags */}
          <div className="adm-card adm-card-full">
            <div className="adm-card-head"><h3>Feature Flags</h3></div>
            <div className="adm-card-body">
              {config.feature_flags ? (
                <div className="adm-toggle-list">
                  {Object.entries(config.feature_flags as Record<string, boolean>).map(([key, val]) => (
                    <div key={key} className="adm-toggle-row">
                      <div className="adm-toggle-info">
                        <span style={{ fontSize:16 }}>🚩</span>
                        <div><p className="adm-toggle-name">{key.replace(/_/g,' ').replace(/\b\w/g, l => l.toUpperCase())}</p></div>
                      </div>
                      <div className={`adm-switch ${val ? 'adm-switch-on' : ''}`} role="button" tabIndex={0}
                        onClick={() => {
                          const flags = { ...config.feature_flags, [key]: !val };
                          fetch('/api/admin', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ configKey:'feature_flags', configValue: flags }) });
                          setConfig({ ...config, feature_flags: flags });
                        }}>
                        <span className="adm-switch-track"><span className="adm-switch-thumb" /></span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize:13, color:'var(--adm-text-muted)', padding:'12px 0' }}>No feature flags configured yet.</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Referral Tab ── */}
      {settingsSubPage === 'referral' && (
        <div className="adm-card adm-card-full">
          <div className="adm-card-head" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <h3>🎁 Referral Program</h3>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:12, color: referralConfig.enabled ? '#10b981' : '#ef4444', fontWeight:700 }}>
                {referralConfig.enabled ? '● Active' : '○ Disabled'}
              </span>
              <div className={`adm-switch ${referralConfig.enabled ? 'adm-switch-on' : ''}`} role="button" tabIndex={0}
                onClick={() => setReferralConfig({ ...referralConfig, enabled: !referralConfig.enabled })}>
                <span className="adm-switch-track"><span className="adm-switch-thumb" /></span>
              </div>
            </div>
          </div>
          <div className="adm-card-body" style={{ display:'flex', flexDirection:'column', gap:28 }}>

            {/* Commission table */}
            <div>
              <p style={{ fontSize:13, fontWeight:700, marginBottom:14, color:'var(--adm-text)' }}>Commission & Rebate Per Level</p>
              <div style={{ borderRadius:12, overflow:'hidden', border:'1px solid var(--adm-border)' }}>
                <div style={{ display:'grid', gridTemplateColumns:'48px 1fr 140px 140px', background:'var(--adm-bg-secondary)', borderBottom:'1px solid var(--adm-border)' }}>
                  {['Lvl','Label','Commission %','Rebate %'].map(h => (
                    <div key={h} style={{ padding:'10px 14px', fontSize:10, fontWeight:700, color:'var(--adm-text-muted)', textTransform:'uppercase', letterSpacing:'0.6px' }}>{h}</div>
                  ))}
                </div>
                {referralConfig.levels.map((lvl: any, i: number) => {
                  const colors = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ec4899'];
                  const c = colors[i];
                  return (
                    <div key={lvl.level} style={{ display:'grid', gridTemplateColumns:'48px 1fr 140px 140px', borderBottom: i < 4 ? '1px solid var(--adm-border)' : 'none' }}>
                      <div style={{ padding:'14px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <span style={{ width:28, height:28, borderRadius:7, background:c, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#fff' }}>L{lvl.level}</span>
                      </div>
                      <div style={{ padding:'14px', display:'flex', alignItems:'center' }}>
                        <input style={{ width:'100%', background:'var(--adm-bg)', border:'1px solid var(--adm-border)', borderRadius:8, padding:'7px 10px', fontSize:13, fontWeight:600, color:'var(--adm-text)', fontFamily:'inherit' }}
                          value={lvl.label}
                          onChange={e => { const ls = referralConfig.levels.map((l: any, j: number) => j===i?{...l,label:e.target.value}:l); setReferralConfig({...referralConfig,levels:ls}); }} />
                      </div>
                      <div style={{ padding:'14px', display:'flex', alignItems:'center', gap:6 }}>
                        <input type="number" min={0} max={100} step={0.5}
                          style={{ width:72, background:'var(--adm-bg)', border:'1px solid var(--adm-border)', borderRadius:8, padding:'7px 10px', fontSize:14, fontWeight:800, color:c, fontFamily:'inherit', textAlign:'center' }}
                          value={lvl.commission}
                          onChange={e => { const ls = referralConfig.levels.map((l: any, j: number) => j===i?{...l,commission:Number(e.target.value)}:l); setReferralConfig({...referralConfig,levels:ls}); }} />
                        <span style={{ fontSize:12, color:'var(--adm-text-muted)', fontWeight:600 }}>%</span>
                      </div>
                      <div style={{ padding:'14px', display:'flex', alignItems:'center', gap:6 }}>
                        <input type="number" min={0} max={100} step={0.25}
                          style={{ width:72, background:'var(--adm-bg)', border:'1px solid var(--adm-border)', borderRadius:8, padding:'7px 10px', fontSize:14, fontWeight:800, color:'#10b981', fontFamily:'inherit', textAlign:'center' }}
                          value={lvl.rebate}
                          onChange={e => { const ls = referralConfig.levels.map((l: any, j: number) => j===i?{...l,rebate:Number(e.target.value)}:l); setReferralConfig({...referralConfig,levels:ls}); }} />
                        <span style={{ fontSize:12, color:'var(--adm-text-muted)', fontWeight:600 }}>%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Milestones */}
            <div>
              <p style={{ fontSize:13, fontWeight:700, marginBottom:14, color:'var(--adm-text)' }}>Milestone Rewards</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {referralConfig.milestones.map((m: any, i: number) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', background:'var(--adm-bg-secondary)', border:'1px solid var(--adm-border)', borderRadius:12 }}>
                    <div style={{ background:'rgba(16,185,129,0.1)', borderRadius:8, padding:'6px 10px', fontSize:11, fontWeight:700, color:'#10b981', whiteSpace:'nowrap' }}>
                      At {m.referrals} ref{m.referrals>1?'s':''}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:4, flex:1 }}>
                      <span style={{ fontSize:15, color:'#10b981', fontWeight:700 }}>$</span>
                      <input type="number" min={0}
                        style={{ flex:1, background:'var(--adm-bg)', border:'1px solid var(--adm-border)', borderRadius:8, padding:'7px 10px', fontSize:15, fontWeight:800, color:'#10b981', fontFamily:'inherit' }}
                        value={m.reward}
                        onChange={e => { const ms = referralConfig.milestones.map((x: any, j: number) => j===i?{...x,reward:Number(e.target.value)}:x); setReferralConfig({...referralConfig,milestones:ms}); }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Global settings */}
            <div>
              <p style={{ fontSize:13, fontWeight:700, marginBottom:14, color:'var(--adm-text)' }}>Global Settings</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                {[
                  { label:'Min Withdrawal', key:'minWithdrawal', prefix:'$', suffix:'' },
                  { label:'Cookie Duration', key:'cookieDays',    prefix:'', suffix:' days' },
                  { label:'Payout Day',      key:'payoutDay',     prefix:'Day ', suffix:'' },
                ].map(f => (
                  <div key={f.key} style={{ background:'var(--adm-bg-secondary)', border:'1px solid var(--adm-border)', borderRadius:12, padding:'16px 18px' }}>
                    <p style={{ fontSize:10, fontWeight:700, color:'var(--adm-text-muted)', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:10 }}>{f.label}</p>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      {f.prefix && <span style={{ fontSize:13, color:'var(--adm-text-muted)', fontWeight:600 }}>{f.prefix}</span>}
                      <input type="number" min={1}
                        style={{ flex:1, background:'var(--adm-bg)', border:'1px solid var(--adm-border)', borderRadius:8, padding:'8px 10px', fontSize:16, fontWeight:800, color:'var(--adm-text)', fontFamily:'inherit' }}
                        value={(referralConfig as any)[f.key]}
                        onChange={e => setReferralConfig({...referralConfig, [f.key]: Number(e.target.value)})} />
                      {f.suffix && <span style={{ fontSize:13, color:'var(--adm-text-muted)', fontWeight:600 }}>{f.suffix}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Save */}
            <div style={{ display:'flex', alignItems:'center', gap:14, paddingTop:4 }}>
              <button onClick={async () => {
                await fetch('/api/admin', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ configKey: 'referral_config', configValue: referralConfig })
                });
                setRefSaved(true);
                setTimeout(()=>setRefSaved(false),2500);
              }}
                style={{ background:'linear-gradient(135deg,#6366f1,#3b82f6)', color:'#fff', border:'none', borderRadius:10, padding:'11px 28px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 4px 12px rgba(99,102,241,0.3)' }}>
                Save Referral Config
              </button>
              <button onClick={() => setReferralConfig({
                enabled:true, cookieDays:30, payoutDay:1, minWithdrawal:50,
                levels:[{level:1,label:'Direct',commission:10,rebate:5},{level:2,label:'Level 2',commission:5,rebate:2},{level:3,label:'Level 3',commission:3,rebate:1},{level:4,label:'Level 4',commission:2,rebate:0.5},{level:5,label:'Level 5',commission:1,rebate:0.25}],
                milestones:[{referrals:1,reward:25},{referrals:5,reward:100},{referrals:10,reward:250},{referrals:25,reward:750},{referrals:50,reward:2000}],
              })} style={{ background:'none', border:'1px solid var(--adm-border)', borderRadius:10, padding:'11px 20px', fontSize:13, fontWeight:600, color:'var(--adm-text-muted)', cursor:'pointer', fontFamily:'inherit' }}>
                Reset to Defaults
              </button>
              {refSaved && <span style={{ fontSize:13, color:'#10b981', fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>✓ Saved successfully</span>}
            </div>
          </div>
        </div>
      )}

      {/* ── Pricing Tab ── */}
      {settingsSubPage === 'pricing' && (
        <div className="adm-card adm-card-full">
          <div className="adm-card-head"><h3>Plan Pricing</h3></div>
          <div className="adm-card-body">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
              {[
                { key:'starter',    label:'Starter',    icon:'⚡', color:'#6b7280', desc:'For individual traders' },
                { key:'pro',        label:'Pro',        icon:'👑', color:'#8b5cf6', desc:'For serious traders' },
                { key:'enterprise', label:'Enterprise', icon:'🚀', color:'#f59e0b', desc:'For institutions' },
              ].map(tier => (
                <div key={tier.key} style={{ background:'var(--adm-bg-secondary)', border:'1px solid var(--adm-border)', borderRadius:16, padding:'24px 20px', textAlign:'center' }}>
                  <div style={{ fontSize:28, marginBottom:8 }}>{tier.icon}</div>
                  <p style={{ fontSize:15, fontWeight:800, color:'var(--adm-text)', marginBottom:4 }}>{tier.label}</p>
                  <p style={{ fontSize:11, color:'var(--adm-text-muted)', marginBottom:18 }}>{tier.desc}</p>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4, marginBottom:16 }}>
                    <span style={{ fontSize:20, fontWeight:700, color:tier.color }}>$</span>
                    <input type="number" min={0}
                      style={{ width:90, background:'var(--adm-bg)', border:`2px solid ${tier.color}33`, borderRadius:10, padding:'8px 10px', fontSize:22, fontWeight:800, color:tier.color, fontFamily:'inherit', textAlign:'center' }}
                      value={config.plan_pricing?.[tier.key] ?? ''}
                      onChange={e => { const pricing = { ...config.plan_pricing, [tier.key]: Number(e.target.value) }; setConfig({ ...config, plan_pricing: pricing }); }} />
                    <span style={{ fontSize:13, color:'var(--adm-text-muted)', fontWeight:600 }}>/mo</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop:20, display:'flex', alignItems:'center', gap:14 }}>
              <button onClick={() => {
                fetch('/api/admin', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ configKey:'plan_pricing', configValue: config.plan_pricing }) });
                setSaveMsg('Pricing saved'); setTimeout(()=>setSaveMsg(''),2500);
              }} style={{ background:'linear-gradient(135deg,#8b5cf6,#6366f1)', color:'#fff', border:'none', borderRadius:10, padding:'11px 28px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 4px 12px rgba(139,92,246,0.3)' }}>
                Save Pricing
              </button>
              {saveMsg === 'Pricing saved' && <span style={{ fontSize:13, color:'#10b981', fontWeight:700 }}>✓ Pricing updated</span>}
            </div>
          </div>
        </div>
      )}

      {/* ── Announcements Tab ── */}
      {settingsSubPage === 'announcements' && (
        <div className="adm-card adm-card-full">
          <div className="adm-card-head"><h3>Announcements ({announcements.length})</h3></div>
          <div className="adm-card-body" style={{ display:'flex', flexDirection:'column', gap:20 }}>
            {/* New announcement form */}
            <div style={{ background:'var(--adm-bg-secondary)', border:'1px solid var(--adm-border)', borderRadius:14, padding:'20px' }}>
              <p style={{ fontSize:12, fontWeight:700, color:'var(--adm-text-muted)', textTransform:'uppercase', marginBottom:14, letterSpacing:'0.6px' }}>New Announcement</p>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <input className="adm-edit-input" placeholder="Title (e.g. Scheduled Maintenance)" value={newAnnouncement.title} onChange={e => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })} />
                <input className="adm-edit-input" placeholder="Message body…" value={newAnnouncement.message} onChange={e => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })} />
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <select className="adm-select" value={newAnnouncement.type} onChange={e => setNewAnnouncement({ ...newAnnouncement, type: e.target.value })} style={{ flex:1 }}>
                    <option value="info">ℹ️ Info</option>
                    <option value="warning">⚠️ Warning</option>
                    <option value="success">✅ Success</option>
                  </select>
                  <button onClick={async () => {
                    if (!newAnnouncement.title) return;
                    await fetch('/api/admin', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ announcement: newAnnouncement }) });
                    setNewAnnouncement({ title:'', message:'', type:'info' });
                    onRefresh();
                  }} style={{ background:'#6366f1', color:'#fff', border:'none', borderRadius:10, padding:'10px 22px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                    + Post
                  </button>
                </div>
              </div>
            </div>
            {/* List */}
            {announcements.length === 0 ? (
              <div style={{ textAlign:'center', padding:'32px', color:'var(--adm-text-muted)', fontSize:13 }}>📢 No active announcements</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {announcements.map(a => (
                  <div key={a.id} className={`adm-announce-item adm-announce-${a.type}`} style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16 }}>
                    <div>
                      <p className="adm-announce-title">{a.title}</p>
                      <p className="adm-announce-msg">{a.message}</p>
                      <p className="adm-announce-date">{new Date(a.created_at).toLocaleDateString()}</p>
                    </div>
                    <button style={{ background:'none', border:'none', cursor:'pointer', color:'var(--adm-text-muted)', fontSize:16, padding:4, flexShrink:0 }}
                      onClick={async () => {
                        await fetch('/api/admin', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ announcement: { id: a.id, is_active: false } }) });
                        setAnnouncements(announcements.filter(x => x.id !== a.id));
                      }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Payments (NOWPayments) Tab ── */}
      {settingsSubPage === 'payments' && (
        <div className="gw-root">

          {/* ── Hero Header ── */}
          <div className={`gw-hero ${npSandbox ? 'gw-hero-sandbox' : 'gw-hero-prod'}`}>
            <div className="gw-hero-left">
              <div className="gw-hero-logo">₿</div>
              <div>
                <p className="gw-hero-title">NOWPayments Gateway</p>
                <p className="gw-hero-sub">
                  Crypto withdrawal infrastructure ·{' '}
                  <a href="https://nowpayments.io" target="_blank" rel="noreferrer">nowpayments.io</a>
                </p>
              </div>
            </div>
            <div className="gw-hero-right">
              <div className="gw-mode-badge">
                <div className={`gw-mode-dot ${npSandbox ? 'gw-mode-dot-sandbox' : 'gw-mode-dot-live'}`} />
                <div>
                  <p className="gw-mode-text">{npSandbox ? 'Sandbox' : 'Production'}</p>
                  <p className="gw-mode-sub">{npSandbox ? 'Test mode active' : 'Live transactions'}</p>
                </div>
              </div>
              <div className="gw-env-toggle" role="button" tabIndex={0} onClick={() => setNpSandbox(!npSandbox)}>
                <span className="gw-env-label">{npSandbox ? 'SANDBOX' : 'LIVE'}</span>
                <div className={`gw-toggle-pill ${npSandbox ? 'gw-toggle-pill-sandbox' : 'gw-toggle-pill-live'}`}>
                  <div className={`gw-toggle-thumb ${npSandbox ? 'gw-toggle-thumb-sandbox' : 'gw-toggle-thumb-live'}`} />
                </div>
              </div>
            </div>
          </div>

          {/* Test Result */}
          {npTestResult && (
            <div className={`gw-result ${npTestResult.ok ? 'gw-result-ok' : 'gw-result-fail'}`}>
              <span className="gw-result-icon">{npTestResult.ok ? '✓' : '✕'}</span>
              <div style={{ flex: 1 }}>
                <p className="gw-result-title">{npTestResult.ok ? 'Gateway Connected Successfully' : 'Connection Failed'}</p>
                <p className="gw-result-msg">{npTestResult.message}</p>
              </div>
              <button className="gw-result-close" onClick={() => setNpTestResult(null)}>✕</button>
            </div>
          )}

          {/* ── Body: Left config + Right status ── */}
          <div className="gw-body">

            {/* LEFT: Credentials + Coins */}
            <div className="gw-left">

              {/* API Credentials */}
              <div>
                <p className="gw-sec-label">API Credentials</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {([
                    { label: 'API Key', key: 'apiKey', hint: 'From NOWPayments Dashboard → Settings → API Keys', value: npApiKey, setter: setNpApiKey, icon: '🗝' },
                    { label: 'Dashboard Email', key: 'email', hint: 'Email you use to log in to nowpayments.io (needed for JWT auth)', value: npEmail, setter: setNpEmail, icon: '✉️' },
                    { label: 'Dashboard Password', key: 'password', hint: 'Password for nowpayments.io (JWT is fetched fresh on each payout — expires in 5 min)', value: npPassword, setter: setNpPassword, icon: '🔑' },
                    { label: 'TOTP Secret (2FA)', key: 'totp', hint: 'base32 TOTP secret from Dashboard → Account Settings → Two-step auth (enables automated payout verification)', value: npTotpSecret, setter: setNpTotpSecret, icon: '📲' },
                    { label: 'IPN Secret', key: 'ipn', hint: 'From NOWPayments Dashboard → Payment Settings → IPN Secret Key (for HMAC-SHA512 webhook verification)', value: npIpnSecret, setter: setNpIpnSecret, icon: '🛡' },
                  ] as const).map(f => (
                    <div key={f.key} className="gw-field">
                      <div className="gw-field-head">
                        <span className="gw-field-name"><span>{f.icon}</span>{f.label}</span>
                        <span className={f.value ? 'gw-field-badge-set' : 'gw-field-badge-unset'}>
                          {f.value ? 'SET' : 'NOT SET'}
                        </span>
                      </div>
                      <div className="gw-input-wrap">
                        <input
                          id={`gw-input-${f.key}`}
                          type="password"
                          placeholder="Enter value…"
                          className={`gw-input ${f.value ? 'gw-input-set' : ''}`}
                          value={f.value}
                          onChange={e => (f.setter as any)(e.target.value)}
                          autoComplete="new-password"
                        />
                      </div>
                      <p style={{ fontSize: 10, color: 'var(--subtext)', margin: 0 }}>{f.hint}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payout Flow Info */}
              <div>
                <p className="gw-sec-label">Payout Flow</p>
                <div style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--input-bg)', lineHeight: 1.7, fontSize: 12, color: 'var(--subtext)' }}>
                  <p style={{ margin: '0 0 8px', fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>How withdrawals work</p>
                  <p style={{ margin: '0 0 4px' }}>1. User raises a withdrawal request (USDT, crypto only)</p>
                  <p style={{ margin: '0 0 4px' }}>2. Request appears in your Admin dashboard as <strong style={{ color: '#f59e0b' }}>Pending</strong></p>
                  <p style={{ margin: '0 0 4px' }}>3. You review &amp; approve → NOWPayments creates the payout</p>
                  <p style={{ margin: '0 0 4px' }}>4. NOWPayments sends IPN → status auto-updates to <strong style={{ color: '#10b981' }}>Completed</strong></p>
                  <p style={{ margin: '8px 0 0', fontSize: 10, opacity: 0.6 }}>Rejected requests automatically refund the user&apos;s balance.</p>
                </div>
              </div>
            </div>

            {/* RIGHT: Status + Webhook + Checklist */}
            <div className="gw-right">

              {/* KPI Status */}
              <div>
                <p className="gw-sec-label">Gateway Status</p>
                <div className="gw-kpis">
                  {[
                    { label: 'Environment', value: npSandbox ? 'Sandbox' : 'Live', color: npSandbox ? '#f59e0b' : '#10b981' },
                    { label: 'API Key', value: npApiKey ? '● Set' : '○ Missing', color: npApiKey ? '#10b981' : '#ef4444' },
                    { label: 'Auth (JWT)', value: (npEmail && npPassword) ? '● Set' : '○ Missing', color: (npEmail && npPassword) ? '#10b981' : '#ef4444' },
                    { label: '2FA Auto', value: npTotpSecret ? '● Active' : '○ Manual', color: npTotpSecret ? '#10b981' : '#f59e0b' },
                  ].map((s, i) => (
                    <div key={i} className="gw-kpi">
                      <p className="gw-kpi-label">{s.label}</p>
                      <p className="gw-kpi-val" style={{ color: s.color }}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="gw-divider" />

              {/* IPN Webhook */}
              <div>
                <p className="gw-sec-label">IPN Webhook URL</p>
                <p style={{ fontSize: 11, color: 'var(--subtext)', margin: '0 0 8px', lineHeight: 1.5 }}>
                  Register this in your <strong>NOWPayments → IPN Settings</strong> to receive real-time payout status callbacks.
                </p>
                <div className="gw-webhook-box">
                  <span className="gw-webhook-url">
                    {typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'}/api/webhooks/nowpayments
                  </span>
                  <button className="gw-webhook-copy"
                    onClick={() => navigator.clipboard.writeText(window.location.origin + '/api/webhooks/nowpayments')}>
                    ⎘ Copy
                  </button>
                </div>
              </div>

              <div className="gw-divider" />

              {/* Setup Checklist */}
              <div>
                <p className="gw-sec-label">Setup Checklist</p>
                <div className="gw-checks">
                  {[
                    { label: 'API Key configured', done: !!npApiKey },
                    { label: 'Dashboard email set', done: !!npEmail },
                    { label: 'Dashboard password set', done: !!npPassword },
                    { label: 'IPN Secret set', done: !!npIpnSecret },
                    { label: '2FA auto-verify (TOTP)', done: !!npTotpSecret },
                    { label: 'IPN webhook URL registered', done: false },
                    { label: 'API connection tested', done: npTestResult?.ok === true },
                  ].map((c, i) => (
                    <div key={i} className="gw-check">
                      <div className={`gw-check-icon ${c.done ? 'gw-check-icon-done' : 'gw-check-icon-todo'}`}>
                        {c.done ? '✓' : i + 1}
                      </div>
                      <span className={c.done ? 'gw-check-text-done' : 'gw-check-text'}>{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Footer Action Bar ── */}
          <div className="gw-footer">
            <div className="gw-footer-left">
              <button id="gw-test-btn" className="gw-btn-test"
                disabled={npTesting || !npApiKey}
                onClick={async () => {
                  setNpTesting(true); setNpTestResult(null);
                  try {
                    const r = await fetch('/api/withdrawals', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'test_gateway', apiKey: npApiKey || undefined }),
                    });
                    setNpTestResult(await r.json());
                  } catch (e) {
                    setNpTestResult({ ok: false, message: (e as Error).message });
                  }
                  setNpTesting(false);
                }}>
                {npTesting ? <><span className="gw-spin">◌</span> Testing…</> : <>🔌 Test Connection</>}
              </button>
              <button id="gw-save-btn" className="gw-btn-save"
                onClick={() => {
                  const cfg = { api_key: npApiKey, email: npEmail, password: npPassword, totp_secret: npTotpSecret, ipn_secret: npIpnSecret, sandbox: npSandbox, enabled_coins: npCoins };
                  fetch('/api/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ configKey: 'nowpayments_config', configValue: cfg }) });
                  setNpSaved(true); setTimeout(() => setNpSaved(false), 2500);
                }}>
                💾 Save Configuration
              </button>
              {npSaved && <span className="gw-saved-toast">✓ Saved!</span>}
            </div>
            <a href="https://account.nowpayments.io" target="_blank" rel="noreferrer" className="gw-dash-link">
              Open NOWPayments ↗
            </a>
          </div>
        </div>
      )}
    </>
  );
}
