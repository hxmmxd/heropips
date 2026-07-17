import React, { useState, useEffect } from 'react';

interface PricingTabProps {
  initialConfig: Record<string, any>;
}

export default function PricingTab({ initialConfig }: PricingTabProps) {
  const [config, setConfig] = useState(initialConfig);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setConfig(initialConfig);
  }, [initialConfig]);

  const getNormalizedPricing = () => {
    const defaultData: Record<string, any> = {
      starter: {
        price: 20,
        features: [
          '5 AI trade signals per day',
          '1 broker connection',
          'Basic market analysis',
          'Email support',
          'Trade history (30 days)',
          'Standard execution speed',
        ],
        limits: [
          'No advanced indicators',
          'No priority execution',
        ]
      },
      pro: {
        price: 50,
        features: [
          'Unlimited AI trade signals',
          '5 broker connections',
          'Advanced technical analysis',
          'Priority support (24/7)',
          'Full trade history',
          'Priority execution speed',
          'Risk management tools',
          'Custom trading strategies',
        ],
        limits: []
      },
      enterprise: {
        price: 100,
        features: [
          'Everything in Pro',
          'Unlimited broker connections',
          'Institutional-grade AI models',
          'Dedicated account manager',
          'API access & webhooks',
          'White-label dashboard',
          'Custom integrations',
          'Multi-user team access',
          'SLA guarantee (99.9%)',
        ],
        limits: []
      }
    };

    const currentPricing = config.plan_pricing || {};
    const normalized: Record<string, any> = {};

    ['starter', 'pro', 'enterprise'].forEach(k => {
      const val = currentPricing[k];
      if (val === undefined) {
        normalized[k] = defaultData[k];
      } else if (typeof val === 'number' || typeof val === 'string') {
        normalized[k] = {
          price: Number(val),
          features: defaultData[k].features,
          limits: defaultData[k].limits,
        };
      } else {
        normalized[k] = {
          price: val.price ?? defaultData[k].price,
          features: val.features ?? defaultData[k].features,
          limits: val.limits ?? defaultData[k].limits,
        };
      }
    });

    return normalized;
  };

  const pricingData = getNormalizedPricing();

  const handlePriceChange = (key: string, val: number) => {
    const updated = {
      ...pricingData,
      [key]: {
        ...pricingData[key],
        price: val
      }
    };
    setConfig(prev => ({ ...prev, plan_pricing: updated }));
  };

  const handleFeaturesChange = (key: string, field: 'features' | 'limits', list: string[]) => {
    const updated = {
      ...pricingData,
      [key]: {
        ...pricingData[key],
        [field]: list
      }
    };
    setConfig(prev => ({ ...prev, plan_pricing: updated }));
  };

  const savePricing = async () => {
    await fetch('/api/admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configKey: 'plan_pricing', configValue: pricingData })
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="adm-card adm-card-full">
      <div className="adm-card-head">
        <h3>Plan Pricing Options</h3>
      </div>
      <div className="adm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { key: 'starter', label: 'Starter Plan', desc: 'Starter Tier subscription' },
            { key: 'pro', label: 'Pro Plan', desc: 'Pro Tier subscription' },
            { key: 'enterprise', label: 'Enterprise Plan', desc: 'Enterprise Tier subscription' },
          ].map(tier => {
            const pData = pricingData[tier.key];
            return (
              <div key={tier.key} style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{tier.label}</p>
                  <p style={{ fontSize: 11, color: 'var(--subtext)', margin: '2px 0 0' }}>{tier.desc}</p>
                </div>
                
                {/* Price input wrapper */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--subtext)', display: 'block', marginBottom: 4 }}>Monthly Price</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--input-bg, #f9fafb)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px' }}>
                    <span style={{ fontSize: 13, color: 'var(--subtext)', fontWeight: 700 }}>$</span>
                    <input
                      type="number"
                      style={{ border: 'none', background: 'transparent', width: '100%', fontSize: 15, fontWeight: 800, color: 'var(--text)', outline: 'none', padding: 0, margin: 0 }}
                      value={pData.price}
                      onChange={e => handlePriceChange(tier.key, Number(e.target.value))}
                    />
                    <span style={{ fontSize: 12, color: 'var(--subtext)', fontWeight: 500 }}>/mo</span>
                  </div>
                </div>

                {/* Features input wrapper */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--subtext)' }}>Included Features</label>
                    <span style={{ fontSize: 10, color: 'var(--subtext)' }}>One per line</span>
                  </div>
                  <textarea
                    style={{
                      width: '100%',
                      minHeight: 120,
                      fontSize: 13,
                      fontFamily: 'inherit',
                      padding: '8px 10px',
                      background: 'var(--input-bg, #f9fafb)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      color: 'var(--text)',
                      resize: 'vertical',
                      outline: 'none',
                      lineHeight: '1.4'
                    }}
                    value={pData.features.join('\n')}
                    onChange={e => handleFeaturesChange(tier.key, 'features', e.target.value.split('\n'))}
                  />
                </div>

                {/* Limits input wrapper */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--subtext)' }}>Excluded / Limits</label>
                    <span style={{ fontSize: 10, color: 'var(--subtext)' }}>One per line</span>
                  </div>
                  <textarea
                    style={{
                      width: '100%',
                      minHeight: 80,
                      fontSize: 13,
                      fontFamily: 'inherit',
                      padding: '8px 10px',
                      background: 'var(--input-bg, #f9fafb)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      color: 'var(--text)',
                      resize: 'vertical',
                      outline: 'none',
                      lineHeight: '1.4'
                    }}
                    value={pData.limits.join('\n')}
                    onChange={e => handleFeaturesChange(tier.key, 'limits', e.target.value.split('\n'))}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <button className="adm-post-btn" onClick={savePricing}>
            Save Plan Pricing
          </button>
          {saved && (
            <span style={{ fontSize: 13, color: '#10a37f', fontWeight: 600 }}>
              ✓ Pricing updated
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
