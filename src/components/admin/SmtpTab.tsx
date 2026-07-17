import React, { useState, useEffect, useRef } from 'react';

interface SmtpTabProps {
  initialConfig: Record<string, any>;
}

export default function SmtpTab({ initialConfig }: SmtpTabProps) {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('587');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [from, setFrom] = useState('');
  const [secure, setSecure] = useState(false);

  const [testEmail, setTestEmail] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialConfig?.smtp_config) {
      const smtp = initialConfig.smtp_config;
      setHost(smtp.host || '');
      setPort(smtp.port?.toString() || '587');
      setUser(smtp.user || '');
      setPass(smtp.pass || '');
      setFrom(smtp.from || '');
      setSecure(!!smtp.secure);
    }
  }, [initialConfig]);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const testConnection = async () => {
    setTesting(true);
    setLogs([]);
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    setLogs(prev => [...prev, `[INFO] Initializing SMTP connection test...`]);
    await sleep(400);
    setLogs(prev => [...prev, `[INFO] Connecting to ${host}:${port} (SSL/TLS: ${secure ? 'ON' : 'OFF'})...`]);
    await sleep(600);

    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_smtp',
          smtpConfig: { host, port: Number(port), user, pass, from, secure },
          testEmail: testEmail || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLogs(prev => [
          ...prev,
          `[SUCCESS] Connection established! SMTP Server verified successfully.`,
          testEmail ? `[SUCCESS] Test verification email sent to: ${testEmail}` : `[INFO] (No test email requested. SMTP handshake succeeded.)`
        ]);
      } else {
        setLogs(prev => [
          ...prev,
          `[ERROR] Connection failed! Details: ${data.error}`
        ]);
      }
    } catch (e: any) {
      setLogs(prev => [...prev, `[ERROR] Network error: ${e.message}`]);
    }
    setTesting(false);
  };

  const saveConfiguration = async () => {
    const cfg = {
      host,
      port: Number(port) || 587,
      user,
      pass,
      from,
      secure
    };
    await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configKey: 'smtp_config', configValue: cfg })
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Form */}
      <div className="adm-card adm-card-full">
        <div className="adm-card-head">
          <h3>SMTP Mailer Configuration</h3>
        </div>
        <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>SMTP Host / Server</label>
              <input
                type="text"
                className="adm-edit-input"
                placeholder="smtp.mailgun.org or smtp.gmail.com"
                value={host}
                onChange={e => setHost(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>SMTP Port</label>
              <input
                type="text"
                className="adm-edit-input"
                placeholder="587, 465, or 25"
                value={port}
                onChange={e => setPort(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>SMTP Username / Login</label>
              <input
                type="text"
                className="adm-edit-input"
                placeholder="user@domain.com"
                value={user}
                onChange={e => setUser(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>SMTP Password</label>
              <input
                type="password"
                className="adm-edit-input"
                placeholder={pass ? '••••••••••••••••••••••••••••••••' : 'Enter SMTP password...'}
                value={pass}
                onChange={e => setPass(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>Default Sender Email Address (From)</label>
            <input
              type="text"
              className="adm-edit-input"
              placeholder='TradeGPT <noreply@yourdomain.com>'
              value={from}
              onChange={e => setFrom(e.target.value)}
            />
          </div>

          {/* Secure SSL toggle */}
          <div className="adm-toggle-row" style={{ borderBottom: 'none', padding: '8px 0 0' }}>
            <div className="adm-toggle-info">
              <div>
                <p className="adm-toggle-name">SSL/TLS Secure Connection</p>
                <p className="adm-toggle-desc">Enable for port 465, disable for port 587 or 25 (uses STARTTLS)</p>
              </div>
            </div>
            <div
              className={`adm-switch ${secure ? 'adm-switch-on' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => setSecure(!secure)}
            >
              <span className="adm-switch-track"><span className="adm-switch-thumb" /></span>
            </div>
          </div>
        </div>
      </div>

      {/* Diagnostics & Test email */}
      <div className="adm-card adm-card-full">
        <div className="adm-card-head">
          <h3>Connection Handshake & Diagnostics</h3>
        </div>
        <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Test Email recipient input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: 'var(--subtext)', fontWeight: 600 }}>Send Test Verification Email To (Optional)</label>
            <input
              type="email"
              className="adm-edit-input"
              placeholder="Enter recipient email address..."
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
            />
          </div>

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
              <span style={{ color: 'var(--subtext)' }}>Terminal ready. Click &quot;Test Connection&quot; to verify SMTP server handshake.</span>
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

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 12, borderTop: '1px solid var(--border)', marginTop: 8 }}>
            <button
              className="adm-pagination button"
              style={{ height: 34, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 6 }}
              disabled={testing || !host}
              onClick={testConnection}
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button className="adm-post-btn" onClick={saveConfiguration}>
              Save SMTP Configuration
            </button>
            {saved && (
              <span style={{ fontSize: 13, color: '#10a37f', fontWeight: 600 }}>
                ✓ SMTP configuration saved
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
