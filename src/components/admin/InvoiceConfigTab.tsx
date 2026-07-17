import React, { useState, useEffect } from 'react';
import { Receipt, Loader2, FileText } from 'lucide-react';

export const DEFAULT_INVOICE_CONFIG = {
  company_name: 'TradeGPT',
  company_tagline: 'Institutional AI Signal Platform',
  company_address: '1 Financial District',
  company_city: 'Dubai, UAE',
  company_country: 'United Arab Emirates',
  company_email: 'billing@tradegpt.ai',
  company_website: 'tradegpt.ai',
  company_phone: '+971 XX XXX XXXX',
  primary_color: '#6366f1',
  accent_color: '#8b5cf6',
  header_bg_color: '#0d1117',
  invoice_prefix: 'TG',
  currency_symbol: '$',
  currency_code: 'USD',
  tax_label: 'VAT (0%)',
  tax_rate: 0,
  show_tax_line: false,
  footer_note: 'Subscription activations occur automatically upon successful blockchain confirmation. All fees are non-refundable after plan activation.',
  support_email: 'support@tradegpt.ai',
  terms_url: 'tradegpt.ai/terms',
  show_watermark: true,
  watermark_text: 'PAID',
};

export default function InvoiceConfigTab() {
  const [cfg, setCfg] = useState<Record<string, any>>(DEFAULT_INVOICE_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/invoice-config')
      .then(r => r.json())
      .then(data => { setCfg({ ...DEFAULT_INVOICE_CONFIG, ...data }); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (k: string, v: any) => setCfg(prev => ({ ...prev, [k]: v }));

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch('/api/invoice-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  };

  const textField = (label: string, key: string, helpText?: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--subtext)' }}>{label}</label>
      <input
        type="text"
        value={cfg[key] ?? ''}
        onChange={e => set(key, e.target.value)}
        style={{ padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: 'var(--input-bg)', color: 'var(--text)', outline: 'none' }}
      />
      {helpText && <span style={{ fontSize: 11, color: 'var(--subtext)', marginTop: 2 }}>{helpText}</span>}
    </div>
  );

  const numberField = (label: string, key: string, helpText?: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--subtext)' }}>{label}</label>
      <input
        type="number"
        value={cfg[key] ?? 0}
        onChange={e => set(key, Number(e.target.value))}
        style={{ padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: 'var(--input-bg)', color: 'var(--text)', outline: 'none' }}
      />
      {helpText && <span style={{ fontSize: 11, color: 'var(--subtext)', marginTop: 2 }}>{helpText}</span>}
    </div>
  );

  const colorField = (label: string, key: string, helpText?: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--subtext)' }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="color"
          value={cfg[key] || '#6366f1'}
          onChange={e => set(key, e.target.value)}
          style={{ width: 36, height: 36, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', padding: 2, background: 'var(--input-bg)' }}
        />
        <input
          type="text"
          value={cfg[key] || ''}
          onChange={e => set(key, e.target.value)}
          style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'monospace', outline: 'none' }}
        />
      </div>
      {helpText && <span style={{ fontSize: 11, color: 'var(--subtext)', marginTop: 2 }}>{helpText}</span>}
    </div>
  );

  const toggleField = (label: string, key: string, onLabel: string, offLabel: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--subtext)' }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          onClick={() => set(key, !cfg[key])}
          style={{ width: 44, height: 24, borderRadius: 12, background: cfg[key] ? '#6366f1' : 'var(--border)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
        >
          <div style={{ position: 'absolute', top: 3, left: cfg[key] ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
        </div>
        <span style={{ fontSize: 13, color: 'var(--subtext)' }}>{cfg[key] ? onLabel : offLabel}</span>
      </div>
    </div>
  );

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--subtext)' }}>Loading invoice configuration...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header card */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Receipt style={{ width: 20, height: 20, color: '#6366f1' }} />
            Invoice & Receipt Branding
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--subtext)' }}>
            Configure company info, colors, tax rules, and document layout for all generated PDF invoices.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {saved && <span style={{ fontSize: 13, color: '#10b981', fontWeight: 600 }}>✓ Saved</span>}
          <button type="button" onClick={save} disabled={saving} className="adm-post-btn" style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.7 : 1 }}>
            {saving ? <Loader2 style={{ width: 14, height: 14 }} className="adm-spin" /> : <FileText style={{ width: 14, height: 14 }} />}
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {/* Company Info */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px' }}>
        <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>🏢 Company Information</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {textField('Company Name', 'company_name')}
          {textField('Tagline / Description', 'company_tagline')}
          {textField('Billing Email', 'company_email', 'Shown in the From section of every invoice')}
          {textField('Phone Number', 'company_phone')}
          {textField('Address Line', 'company_address')}
          {textField('City & State', 'company_city')}
          {textField('Country', 'company_country')}
          {textField('Website', 'company_website', 'Shown in header and document footer')}
        </div>
      </div>

      {/* Branding Colors */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px' }}>
        <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>🎨 Branding Colors</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          {colorField('Primary Color', 'primary_color', 'Accent stripes, badges, total box, header labels')}
          {colorField('Accent Color', 'accent_color', 'Secondary highlights and decorative elements')}
          {colorField('Header Background', 'header_bg_color', 'Top banner and footer bar background')}
        </div>
        {/* Live preview */}
        <div style={{ marginTop: 18, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{ background: cfg.header_bg_color, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `4px solid ${cfg.primary_color}` }}>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>{cfg.company_name || 'Company Name'}</div>
              <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 3 }}>{cfg.company_tagline}</div>
              <div style={{ color: cfg.primary_color, fontSize: 11, marginTop: 4 }}>{cfg.company_website}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#fff', fontWeight: 900, fontSize: 22, letterSpacing: '-0.5px' }}>INVOICE</div>
              <div style={{ color: '#9ca3af', fontSize: 10, marginTop: 2 }}>{cfg.invoice_prefix}-A3F91B2C</div>
            </div>
          </div>
          <div style={{ background: '#f8fafc', padding: '10px 18px', display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ background: '#10b981', borderRadius: 4, padding: '3px 10px', color: '#fff', fontSize: 11, fontWeight: 700 }}>PAID</div>
            <div style={{ background: cfg.primary_color, borderRadius: 4, padding: '3px 10px', color: '#fff', fontSize: 11, fontWeight: 700 }}>COMPLETED</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginLeft: 4 }}>Live preview — updates in real-time</div>
          </div>
        </div>
      </div>

      {/* Invoice Numbering */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px' }}>
        <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>🔢 Invoice Numbering & Currency</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          {textField('Invoice ID Prefix', 'invoice_prefix', 'e.g. TG → TG-A3F91B2C')}
          {textField('Currency Symbol', 'currency_symbol', 'e.g. $ £ € ₹')}
          {textField('Currency Code', 'currency_code', 'ISO code e.g. USD, GBP, EUR')}
        </div>
      </div>

      {/* Tax */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px' }}>
        <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>🧾 Tax Configuration</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          {toggleField('Show Tax Line', 'show_tax_line', 'Tax line shown on invoice', 'No tax line (0% / excluded)')}
          {cfg.show_tax_line && textField('Tax Label', 'tax_label', 'e.g. VAT (5%), GST, Sales Tax')}
          {cfg.show_tax_line && numberField('Tax Rate (%)', 'tax_rate', 'Percentage applied to subtotal')}
        </div>
      </div>

      {/* Watermark */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px' }}>
        <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>🔏 Watermark & Security</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {toggleField('Diagonal Watermark (completed invoices only)', 'show_watermark', 'Watermark stamp enabled', 'No watermark')}
          {textField('Watermark Text', 'watermark_text', 'e.g. PAID, OFFICIAL, CONFIDENTIAL')}
        </div>
      </div>

      {/* Footer & Legal */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px' }}>
        <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>📋 Footer & Legal Text</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          {textField('Support Email', 'support_email', 'Displayed in invoice footer contact info')}
          {textField('Terms of Service URL', 'terms_url', 'e.g. tradegpt.ai/terms')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--subtext)' }}>Payment Notes / Legal Disclaimer</label>
          <textarea
            value={cfg.footer_note || ''}
            onChange={e => set('footer_note', e.target.value)}
            rows={3}
            style={{ padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: 'var(--input-bg)', color: 'var(--text)', outline: 'none', resize: 'vertical', lineHeight: 1.6 }}
          />
          <span style={{ fontSize: 11, color: 'var(--subtext)' }}>This text appears in the "Payment Notes" panel on every generated PDF invoice.</span>
        </div>
      </div>

      {/* Save row */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, alignItems: 'center', paddingBottom: 16 }}>
        {saved && <span style={{ fontSize: 13, color: '#10b981', fontWeight: 600 }}>✓ Configuration saved successfully</span>}
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="adm-post-btn"
          style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.7 : 1 }}
        >
          {saving ? <Loader2 style={{ width: 14, height: 14 }} className="adm-spin" /> : <FileText style={{ width: 14, height: 14 }} />}
          {saving ? 'Saving...' : 'Save Invoice Configuration'}
        </button>
      </div>
    </div>
  );
}
