import { AccountInfo, RiskStats, ClosedDeal } from '@/types';

function n(v: number, d = 2) {
  return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function pct(v: number) { return `${v >= 0 ? '+' : ''}${n(v)}%`; }

function svgBar(values: number[], colors: string[], labels: string[], w = 480, h = 120): string {
  const max = Math.max(...values.map(Math.abs), 1);
  const bw = Math.floor(w / values.length) - 8;
  const bars = values.map((v, i) => {
    const bh = Math.max(4, Math.round((Math.abs(v) / max) * (h - 28)));
    const x = i * (bw + 8) + 4;
    const y = h - 18 - bh;
    return `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="3" fill="${colors[i] || '#C8A24D'}"/>
            <text x="${x + bw / 2}" y="${h - 4}" text-anchor="middle" font-size="9" fill="#8a7a5a">${labels[i]}</text>
            <text x="${x + bw / 2}" y="${y - 4}" text-anchor="middle" font-size="9" font-weight="600" fill="#3d2e00">${n(v, 0)}</text>`;
  }).join('');
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${bars}</svg>`;
}

function donut(pct: number, color: string, label: string, size = 90): string {
  const r = size / 2 - 10;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const cx = size / 2, cy = size / 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#f0e8d0" stroke-width="8"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="8"
      stroke-dasharray="${dash} ${circ}" stroke-dashoffset="${circ / 4}"
      stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})"/>
    <text x="${cx}" y="${cy - 5}" text-anchor="middle" font-size="15" font-weight="700" fill="#3d2e00">${Math.round(pct)}%</text>
    <text x="${cx}" y="${cy + 11}" text-anchor="middle" font-size="9" fill="#8a7a5a">${label}</text>
  </svg>`;
}

export function generateReportHTML(
  accountInfo: AccountInfo,
  period: string,
  stats: RiskStats,
  deals: ClosedDeal[],
  brokerName: string = 'TradeGPT Account'
): string {
  const periodLabel = period === '7d' ? 'Last 7 Days' : period === '30d' ? 'Last 30 Days' : 'All Time';
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Group deals by symbol for bar chart
  const bySymbol: Record<string, number> = {};
  deals.forEach(d => { bySymbol[d.symbol] = (bySymbol[d.symbol] || 0) + d.profit; });
  const topSymbols = Object.entries(bySymbol).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 6);
  const symLabels = topSymbols.map(s => s[0]);
  const symVals = topSymbols.map(s => s[1]);
  const symColors = symVals.map(v => v >= 0 ? '#B8963A' : '#c0392b');

  const barChart = topSymbols.length > 0
    ? svgBar(symVals, symColors, symLabels)
    : `<p style="color:#8a7a5a;font-size:12px;text-align:center;padding:20px 0">No closed trades in this period</p>`;

  const winDonut = donut(stats.winRate, '#B8963A', 'Win Rate');
  const pfVal = stats.profitFactor === Infinity ? 99 : Math.min(stats.profitFactor, 10);
  const pfDonut = donut(pfVal * 10, '#C8A24D', 'Pf ×' + (stats.profitFactor === Infinity ? '∞' : n(stats.profitFactor)));

  const recentDeals = [...deals].sort((a, b) => new Date(b.closeTime).getTime() - new Date(a.closeTime).getTime()).slice(0, 12);

  const tradeRows = recentDeals.map(d => {
    const color = d.profit >= 0 ? '#27ae60' : '#c0392b';
    return `<tr>
      <td>${d.symbol}</td>
      <td>${d.type.toUpperCase()}</td>
      <td>${n(d.volume, 2)}</td>
      <td>${n(d.entryPrice, 5)}</td>
      <td>${n(d.exitPrice, 5)}</td>
      <td style="color:${color};font-weight:700">${d.profit >= 0 ? '+' : ''}$${n(d.profit)}</td>
      <td>${new Date(d.closeTime).toLocaleDateString()}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>TradeGPT Performance Report · ${periodLabel}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#fffdf7;color:#2c1f00;-webkit-print-color-adjust:exact;print-color-adjust:exact}

  /* ── PAGE BREAKS ── */
  .page{width:210mm;min-height:297mm;padding:14mm 16mm;position:relative;background:#fffdf7;page-break-after:always}
  .page:last-child{page-break-after:avoid}

  /* ── COVER ── */
  .cover-banner{background:linear-gradient(135deg,#1a1200 0%,#3d2e00 50%,#1a1200 100%);border-radius:12px;padding:40px 36px 36px;margin-bottom:24px;position:relative;overflow:hidden}
  .cover-banner::before{content:'';position:absolute;inset:0;background:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 30 Q15 0 30 30 Q45 60 60 30' fill='none' stroke='%23C8A24D' stroke-width='0.4' opacity='0.15'/%3E%3C/svg%3E") repeat;opacity:0.3}
  .cover-logo{font-size:32px;font-weight:800;color:#C8A24D;letter-spacing:4px;position:relative}
  .cover-sub{font-size:11px;color:#d4b86a;letter-spacing:3px;text-transform:uppercase;margin-top:4px;position:relative}
  .cover-divider{height:1px;background:linear-gradient(90deg,transparent,#C8A24D,transparent);margin:20px 0;position:relative}
  .cover-title{font-size:18px;font-weight:700;color:#fff8e8;position:relative}
  .cover-meta{display:flex;gap:32px;margin-top:16px;position:relative}
  .cover-meta-item label{font-size:9px;color:#a08030;letter-spacing:2px;text-transform:uppercase;display:block}
  .cover-meta-item span{font-size:13px;color:#C8A24D;font-weight:600}

  /* ── SECTION HEADERS ── */
  .section-title{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#8a7a5a;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid #e8dcc0}

  /* ── KPI GRID ── */
  .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}
  .kpi-card{background:linear-gradient(145deg,#fff9ed,#fdf3d8);border:1px solid #e8d9a0;border-radius:10px;padding:14px 12px;text-align:center}
  .kpi-label{font-size:8.5px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#8a7a5a;margin-bottom:6px}
  .kpi-value{font-size:20px;font-weight:800;color:#3d2e00;line-height:1}
  .kpi-value.pos{color:#1a7a3a}
  .kpi-value.neg{color:#c0392b}
  .kpi-sub{font-size:9px;color:#a08030;margin-top:4px}

  /* ── 2-COL LAYOUT ── */
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px}
  .card{background:linear-gradient(145deg,#fff9ed,#fdf3d8);border:1px solid #e8d9a0;border-radius:10px;padding:14px}

  /* ── STATS TABLE ── */
  .stats-table{width:100%;border-collapse:collapse}
  .stats-table tr{border-bottom:1px solid #f0e8d0}
  .stats-table tr:last-child{border-bottom:none}
  .stats-table td{padding:7px 4px;font-size:11px}
  .stats-table td:first-child{color:#6b5a30;font-weight:500}
  .stats-table td:last-child{font-weight:700;color:#3d2e00;text-align:right}
  .val-pos{color:#1a7a3a !important}
  .val-neg{color:#c0392b !important}
  .val-gold{color:#B8963A !important}

  /* ── DONUT ROW ── */
  .donut-row{display:flex;gap:20px;justify-content:center;align-items:center;padding:10px 0}

  /* ── TRADE LOG TABLE ── */
  .trade-table{width:100%;border-collapse:collapse;font-size:9.5px}
  .trade-table thead tr{background:linear-gradient(90deg,#3d2e00,#5a4400);color:#C8A24D}
  .trade-table thead td{padding:7px 6px;font-weight:700;font-size:8.5px;letter-spacing:1px;text-transform:uppercase}
  .trade-table tbody tr:nth-child(even){background:#fffbf0}
  .trade-table tbody tr{border-bottom:1px solid #f0e8cc}
  .trade-table tbody td{padding:6px 6px;color:#3d2e00}

  /* ── RISK BARS ── */
  .risk-bar-wrap{margin-bottom:10px}
  .risk-bar-label{display:flex;justify-content:space-between;font-size:10px;margin-bottom:3px;color:#5a4400}
  .risk-bar-track{height:6px;background:#f0e8d0;border-radius:3px;overflow:hidden}
  .risk-bar-fill{height:6px;border-radius:3px;background:linear-gradient(90deg,#C8A24D,#e8b84d)}

  /* ── WATERMARK / FOOTER ── */
  .page-footer{position:absolute;bottom:10mm;left:16mm;right:16mm;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e8d9a0;padding-top:6px}
  .page-footer span{font-size:8px;color:#b0a070;letter-spacing:1px}

  /* ── BADGE ── */
  .badge{display:inline-block;background:linear-gradient(90deg,#C8A24D,#e8b84d);color:#2c1f00;font-size:8px;font-weight:700;padding:2px 8px;border-radius:20px;letter-spacing:1px;text-transform:uppercase}

  /* ── PRINT ── */
  @media print{
    body{background:#fffdf7}
    .page{page-break-after:always;padding:12mm 14mm}
    .page:last-child{page-break-after:avoid}
  }
</style>
</head>
<body>

<!-- ═══════════════════════════════════════ PAGE 1: COVER + KPIs ═══ -->
<div class="page">
  <div class="cover-banner">
    <div class="cover-logo">TRADEGPT</div>
    <div class="cover-sub">Institutional Portfolio Analytics</div>
    <div class="cover-divider"></div>
    <div class="cover-title">Performance Intelligence Report</div>
    <div class="cover-meta">
      <div class="cover-meta-item"><label>Period</label><span>${periodLabel}</span></div>
      <div class="cover-meta-item"><label>Account</label><span>${brokerName}</span></div>
      <div class="cover-meta-item"><label>Currency</label><span>${accountInfo.currency || 'USD'}</span></div>
      <div class="cover-meta-item"><label>Compiled</label><span>${date}</span></div>
    </div>
  </div>

  <div class="section-title">Portfolio Overview</div>
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Balance</div>
      <div class="kpi-value">$${n(accountInfo.balance)}</div>
      <div class="kpi-sub">Account Balance</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Equity</div>
      <div class="kpi-value">$${n(accountInfo.equity)}</div>
      <div class="kpi-sub">Live Equity</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Net Profit</div>
      <div class="kpi-value ${stats.netProfit >= 0 ? 'pos' : 'neg'}">${stats.netProfit >= 0 ? '+' : ''}$${n(stats.netProfit)}</div>
      <div class="kpi-sub">${periodLabel}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Win Rate</div>
      <div class="kpi-value ${stats.winRate >= 50 ? 'pos' : 'neg'}">${n(stats.winRate, 1)}%</div>
      <div class="kpi-sub">${stats.wins}W / ${stats.losses}L</div>
    </div>
  </div>

  <div class="two-col">
    <div class="card">
      <div class="section-title">Performance Metrics</div>
      <table class="stats-table">
        <tr><td>Profit Factor</td><td class="${stats.profitFactor >= 1 ? 'val-gold' : 'val-neg'}">${stats.profitFactor === Infinity ? '∞' : n(stats.profitFactor)}</td></tr>
        <tr><td>Expectancy</td><td class="${stats.expectancy >= 0 ? 'val-pos' : 'val-neg'}">$${n(stats.expectancy)}</td></tr>
        <tr><td>Avg Win</td><td class="val-pos">+$${n(stats.avgWin)}</td></tr>
        <tr><td>Avg Loss</td><td class="val-neg">-$${n(Math.abs(stats.avgLoss))}</td></tr>
        <tr><td>Best Trade</td><td class="val-pos">+$${n(stats.bestTrade)}</td></tr>
        <tr><td>Worst Trade</td><td class="val-neg">-$${n(Math.abs(stats.worstTrade))}</td></tr>
        <tr><td>Total Trades</td><td class="val-gold">${stats.samples}</td></tr>
        <tr><td>Total Volume</td><td>${n(stats.totalVolume)} lots</td></tr>
      </table>
    </div>
    <div class="card">
      <div class="section-title">Risk Intelligence</div>
      <table class="stats-table">
        <tr><td>Sharpe Ratio</td><td class="${stats.sharpe >= 1 ? 'val-gold' : ''}">${n(stats.sharpe)}</td></tr>
        <tr><td>Sortino Ratio</td><td class="${stats.sortino >= 1 ? 'val-gold' : ''}">${n(stats.sortino)}</td></tr>
        <tr><td>Max Drawdown</td><td class="val-neg">${n(stats.maxDrawdown)}%</td></tr>
        <tr><td>Recovery Factor</td><td class="${stats.recoveryFactor >= 1 ? 'val-pos' : 'val-neg'}">${n(stats.recoveryFactor)}</td></tr>
        <tr><td>Max Win Streak</td><td class="val-pos">${stats.maxWinStreak} trades</td></tr>
        <tr><td>Max Loss Streak</td><td class="val-neg">${stats.maxLossStreak} trades</td></tr>
        <tr><td>Total Commission</td><td>-$${n(Math.abs(stats.totalCommission))}</td></tr>
        <tr><td>Total Swap</td><td>$${n(stats.totalSwap)}</td></tr>
      </table>
    </div>
  </div>

  <div class="page-footer">
    <span>TRADEGPT · CONFIDENTIAL · ${date}</span>
    <span class="badge">Page 1 of 3</span>
    <span>AI-POWERED QUANTITATIVE ANALYTICS</span>
  </div>
</div>

<!-- ═══════════════════════════════════════ PAGE 2: CHARTS ═══ -->
<div class="page">
  <div class="cover-banner" style="padding:20px 28px;margin-bottom:20px">
    <div style="display:flex;align-items:center;justify-content:space-between;position:relative">
      <div><div class="cover-logo" style="font-size:20px">TRADEGPT</div><div class="cover-sub">Analytics Intelligence · ${periodLabel}</div></div>
      <span class="badge">Performance Charts</span>
    </div>
  </div>

  <div class="two-col" style="align-items:start">
    <div class="card" style="text-align:center">
      <div class="section-title">Win / Loss Distribution</div>
      <div class="donut-row">
        ${winDonut}
        ${pfDonut}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:10px;font-size:10px">
        <div style="background:#f0f9f4;border-radius:6px;padding:6px;text-align:center">
          <div style="color:#1a7a3a;font-weight:700;font-size:15px">${stats.wins}</div>
          <div style="color:#5a7a60">Winning Trades</div>
        </div>
        <div style="background:#fdf2f2;border-radius:6px;padding:6px;text-align:center">
          <div style="color:#c0392b;font-weight:700;font-size:15px">${stats.losses}</div>
          <div style="color:#7a5a5a">Losing Trades</div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="section-title">Risk Score Dashboard</div>
      <div class="risk-bar-wrap">
        <div class="risk-bar-label"><span>Win Rate</span><span>${n(stats.winRate, 1)}%</span></div>
        <div class="risk-bar-track"><div class="risk-bar-fill" style="width:${Math.min(stats.winRate, 100)}%"></div></div>
      </div>
      <div class="risk-bar-wrap">
        <div class="risk-bar-label"><span>Profit Factor (×10 scale)</span><span>${stats.profitFactor === Infinity ? '∞' : n(stats.profitFactor)}</span></div>
        <div class="risk-bar-track"><div class="risk-bar-fill" style="width:${Math.min(pfVal * 10, 100)}%"></div></div>
      </div>
      <div class="risk-bar-wrap">
        <div class="risk-bar-label"><span>Sharpe Ratio (/3 scale)</span><span>${n(stats.sharpe)}</span></div>
        <div class="risk-bar-track"><div class="risk-bar-fill" style="width:${Math.min((stats.sharpe / 3) * 100, 100)}%"></div></div>
      </div>
      <div class="risk-bar-wrap">
        <div class="risk-bar-label"><span>Recovery Factor (/5 scale)</span><span>${n(stats.recoveryFactor)}</span></div>
        <div class="risk-bar-track"><div class="risk-bar-fill" style="width:${Math.min((stats.recoveryFactor / 5) * 100, 100)}%"></div></div>
      </div>
      <div class="risk-bar-wrap">
        <div class="risk-bar-label"><span>Max Drawdown Exposure</span><span>${n(stats.maxDrawdown)}%</span></div>
        <div class="risk-bar-track"><div class="risk-bar-fill" style="width:${Math.min(stats.maxDrawdown * 5, 100)}%;background:linear-gradient(90deg,#c0392b,#e74c3c)"></div></div>
      </div>
    </div>
  </div>

  <div class="card" style="margin-bottom:20px">
    <div class="section-title">Profit by Symbol — Top Instruments</div>
    <div style="overflow:hidden;border-radius:6px">${barChart}</div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Avg Trade</div>
      <div class="kpi-value ${stats.avgTrade >= 0 ? 'pos' : 'neg'}" style="font-size:16px">${stats.avgTrade >= 0 ? '+' : ''}$${n(stats.avgTrade)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Win Streak</div>
      <div class="kpi-value pos" style="font-size:16px">${stats.maxWinStreak}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Loss Streak</div>
      <div class="kpi-value neg" style="font-size:16px">${stats.maxLossStreak}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Free Margin</div>
      <div class="kpi-value" style="font-size:16px">$${n(accountInfo.freeMargin)}</div>
    </div>
  </div>

  <div class="page-footer">
    <span>TRADEGPT · CONFIDENTIAL · ${date}</span>
    <span class="badge">Page 2 of 3</span>
    <span>AI-POWERED QUANTITATIVE ANALYTICS</span>
  </div>
</div>

<!-- ═══════════════════════════════════════ PAGE 3: TRADE LOG ═══ -->
<div class="page">
  <div class="cover-banner" style="padding:20px 28px;margin-bottom:20px">
    <div style="display:flex;align-items:center;justify-content:space-between;position:relative">
      <div><div class="cover-logo" style="font-size:20px">TRADEGPT</div><div class="cover-sub">Closed Trade Log · ${periodLabel}</div></div>
      <span class="badge">${recentDeals.length} of ${deals.length} Trades</span>
    </div>
  </div>

  <div class="section-title">Recent Closed Trades</div>
  <table class="trade-table">
    <thead>
      <tr>
        <td>Symbol</td><td>Type</td><td>Volume</td><td>Entry</td><td>Exit</td><td>P&amp;L</td><td>Date</td>
      </tr>
    </thead>
    <tbody>
      ${tradeRows || `<tr><td colspan="7" style="text-align:center;padding:20px;color:#8a7a5a">No trades in this period</td></tr>`}
    </tbody>
  </table>

  <div style="margin-top:20px;background:linear-gradient(135deg,#fff9ed,#fdf3d8);border:1px solid #e8d9a0;border-radius:10px;padding:16px">
    <div class="section-title">Report Certification</div>
    <p style="font-size:10px;color:#6b5a30;line-height:1.7">
      This institutional performance report has been automatically generated by the TradeGPT Quantitative Analytics Engine.
      All metrics are computed from verified broker trade data for the period <strong>${periodLabel}</strong>.
      Leverage: <strong>1:${accountInfo.leverage}</strong> · Margin Used: <strong>$${n(accountInfo.margin)}</strong> · 
      Open Positions: <strong>${accountInfo.positionCount}</strong>.
    </p>
    <div style="display:flex;justify-content:space-between;margin-top:14px;align-items:center">
      <div style="font-size:9px;color:#a08030">Generated: ${date}</div>
      <div style="background:linear-gradient(90deg,#3d2e00,#5a4400);color:#C8A24D;font-size:9px;font-weight:700;padding:4px 14px;border-radius:20px;letter-spacing:2px">✓ CERTIFIED REPORT</div>
    </div>
  </div>

  <div class="page-footer">
    <span>TRADEGPT · CONFIDENTIAL · ${date}</span>
    <span class="badge">Page 3 of 3</span>
    <span>AI-POWERED QUANTITATIVE ANALYTICS</span>
  </div>
</div>

</body>
</html>`;
}
