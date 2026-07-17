import React, { useState, useEffect, useRef } from 'react';

interface PaymentsTabProps {
  initialConfig: Record<string, any>;
}

export default function PaymentsTab({ initialConfig }: PaymentsTabProps) {
  const [npApiKey, setNpApiKey] = useState('');
  const [npEmail, setNpEmail] = useState('');
  const [npPassword, setNpPassword] = useState('');
  const [npTotpSecret, setNpTotpSecret] = useState('');
  const [npIpnSecret, setNpIpnSecret] = useState('');
  const [npSandbox, setNpSandbox] = useState(false);
  const [npCoins, setNpCoins] = useState(['USDT (TRC-20)', 'USDT (ERC-20)', 'BTC', 'ETH', 'BNB', 'USDC']);

  const [logs, setLogs] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialConfig?.nowpayments_config) {
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
  }, [initialConfig]);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const testGatewayConnection = async () => {
    setTesting(true);
    setLogs([]);
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    setLogs(prev => [...prev, `[INFO] Initializing gateway handshake...`]);
    await sleep(600);
    setLogs(prev => [...prev, `[INFO] Env Target: ${npSandbox ? 'SANDBOX SIMULATOR' : 'PRODUCTION GATEWAY'}`]);
    await sleep(500);
    setLogs(prev => [...prev, `[INFO] Resolving NOWPayments server status via withdrawals client...`]);
    await sleep(700);

    try {
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_gateway', apiKey: npApiKey || undefined }),
      });
      const data = await res.json();
      if (data.ok) {
        setLogs(prev => [
          ...prev,
          `[SUCCESS] Connection established! Node status: ONLINE`,
          `[SUCCESS] Response details: ${data.message}`
        ]);
      } else {
        setLogs(prev => [
          ...prev,
          `[ERROR] Handshake failed! Details: ${data.message}`
        ]);
      }
    } catch (e: any) {
      setLogs(prev => [...prev, `[ERROR] Network error: ${e.message}`]);
    }
    setTesting(false);
  };

  const saveConfiguration = async () => {
    const cfg = {
      api_key: npApiKey,
      email: npEmail,
      password: npPassword,
      totp_secret: npTotpSecret,
      ipn_secret: npIpnSecret,
      sandbox: npSandbox,
      enabled_coins: npCoins
    };
    await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configKey: 'nowpayments_config', configValue: cfg })
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Credentials */}
      <div className="adm-card adm-card-full">
        <div className="adm-card-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3>Withdrawals Gateway Configuration</h3>
          <span style={{ fontSize: 11, fontWeight: 700, color: npSandbox ? '#f59e0b' : '#10a37f' }}>
            {npSandbox ? 'SANDBOX MODE' : 'PRODUCTION MODE'}
          </span>
        </div>
        <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'API Key (HMAC-SHA512)', key: 'api_key', val: npApiKey, setter: setNpApiKey },
            { label: 'nowpayments.io Login Email', key: 'email', val: npEmail, setter: setNpEmail },
            { label: 'nowpayments.io Login Password', key: 'password', val: npPassword, setter: setNpPassword },
            { label: '2FA Secure Key Secret (TOTP)', key: 'totp', val: npTotpSecret, setter: setNpTotpSecret },
            { label: 'IPN Webhook Verification Secret', key: 'ipn', val: npIpnSecret, setter: setNpIpnSecret },
          ].map(f => (
            <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>{f.label}</label>
              <input
                type="password"
                className="adm-edit-input"
                placeholder={f.val ? '••••••••••••••••••••••••••••••••' : 'Enter credential value...'}
                value={f.val}
                onChange={e => f.setter(e.target.value)}
              />
            </div>
          ))}

          {/* Sandbox toggle */}
          <div className="adm-toggle-row" style={{ borderBottom: 'none', padding: '8px 0 0' }}>
            <div className="adm-toggle-info">
              <div>
                <p className="adm-toggle-name">Sandbox Mode</p>
                <p className="adm-toggle-desc">Simulate payouts and transactions without moving real assets</p>
              </div>
            </div>
            <div
              className={`adm-switch ${npSandbox ? 'adm-switch-on' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => setNpSandbox(!npSandbox)}
            >
              <span className="adm-switch-track"><span className="adm-switch-thumb" /></span>
            </div>
          </div>
        </div>
      </div>

      {/* Terminal log & Webhook */}
      <div className="adm-card adm-card-full">
        <div className="adm-card-head">
          <h3>Gateway Handshake Diagnostics</h3>
        </div>
        <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Terminal Console */}
          <div
            style={{
              background: 'var(--bg)',
              borderRadius: 10,
              border: '1px solid var(--border)',
              padding: 14,
              minHeight: 120,
              maxHeight: 180,
              overflowY: 'auto',
              fontFamily: 'Courier New, Courier, monospace',
              fontSize: 12,
              lineHeight: 1.4,
              display: 'flex',
              flexDirection: 'column',
              gap: 4
            }}
          >
            {logs.length === 0 ? (
              <span style={{ color: 'var(--subtext)' }}>Terminal ready. Click &quot;Test Connection&quot; to begin.</span>
            ) : (
              logs.map((log, index) => {
                let color = 'var(--text)';
                if (log.startsWith('[ERROR]')) color = '#ef4444';
                if (log.startsWith('[SUCCESS]')) color = '#10a37f';
                if (log.startsWith('[INFO]')) color = '#3b82f6';
                return (
                  <div key={index} style={{ color }}>
                    {log}
                  </div>
                );
              })
            )}
            <div ref={terminalEndRef} />
          </div>

          {/* Webhook */}
          <div
            style={{
              background: 'var(--input-bg)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12
            }}
          >
            <div style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: 10, color: 'var(--subtext)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>
                IPN Callback URL
              </span>
              <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#10a37f', wordBreak: 'break-all' }}>
                {typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'}/api/webhooks/nowpayments
              </span>
            </div>
            <button
              className="adm-pagination button"
              style={{ height: 32, padding: '0 12px', whiteSpace: 'nowrap' }}
              onClick={() => navigator.clipboard.writeText((typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com') + '/api/webhooks/nowpayments')}
            >
              ⎘ Copy
            </button>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 12, borderTop: '1px solid var(--border)', marginTop: 8 }}>
            <button
              className="adm-pagination button"
              style={{ height: 34, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 6 }}
              disabled={testing || !npApiKey}
              onClick={testGatewayConnection}
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button className="adm-post-btn" onClick={saveConfiguration}>
              Save Gateway Configuration
            </button>
            {saved && (
              <span style={{ fontSize: 13, color: '#10a37f', fontWeight: 600 }}>
                ✓ Gateway configuration saved
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
