import { jsPDF } from 'jspdf';
import { AccountInfo, RiskStats, ClosedDeal } from '@/types';

const NAVY: [number,number,number] = [26,39,64];
const GOLD: [number,number,number] = [200,162,77];
const LIGHT: [number,number,number] = [248,244,232];
const SLATE: [number,number,number] = [100,90,70];
const GREEN: [number,number,number] = [34,139,80];
const RED: [number,number,number] = [200,50,50];
const W = 210, H = 297, M = 14;

const f = (v: number, d = 2) =>
  v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

function header(doc: jsPDF, subtitle: string, page: number) {
  doc.setFillColor(...NAVY); doc.rect(0, 0, W, 18, 'F');
  doc.setFillColor(...GOLD); doc.rect(0, 18, W, 1.2, 'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(200,162,77);
  doc.text('TRADEGPT', M, 11);
  doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(180,160,100);
  doc.text(subtitle.toUpperCase(), M + 36, 11);
  doc.setTextColor(160,140,80);
  doc.text(`PAGE ${page}`, W - M - 10, 11);
}

function footer(doc: jsPDF, date: string) {
  doc.setFillColor(...LIGHT); doc.rect(0, H - 10, W, 10, 'F');
  doc.setFont('helvetica','normal'); doc.setFontSize(6); doc.setTextColor(...SLATE);
  doc.text('TRADEGPT · INSTITUTIONAL PERFORMANCE REPORT · CONFIDENTIAL', M, H - 4.5);
  doc.text(date, W - M - 24, H - 4.5);
}

function card(doc: jsPDF, x: number, y: number, w: number, h: number,
              label: string, value: string, valColor?: [number,number,number]) {
  doc.setFillColor(...LIGHT); doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.3); doc.roundedRect(x, y, w, h, 2, 2, 'S');
  doc.setFont('helvetica','bold'); doc.setFontSize(6); doc.setTextColor(...SLATE);
  doc.text(label, x + w/2, y + 6, { align: 'center' });
  doc.setFont('helvetica','bold'); doc.setFontSize(11);
  doc.setTextColor(...(valColor ?? NAVY));
  doc.text(value, x + w/2, y + 16, { align: 'center' });
}

function row(doc: jsPDF, x: number, y: number, w: number,
             label: string, value: string, valColor?: [number,number,number]) {
  doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...SLATE);
  doc.text(label, x, y);
  doc.setFont('helvetica','bold'); doc.setTextColor(...(valColor ?? NAVY));
  doc.text(value, x + w, y, { align: 'right' });
  doc.setDrawColor(220,210,185); doc.setLineWidth(0.15);
  doc.line(x, y + 1.5, x + w, y + 1.5);
}

function bar(doc: jsPDF, x: number, y: number, w: number, h: number,
             pct: number, color: [number,number,number]) {
  doc.setFillColor(220,210,185); doc.rect(x, y, w, h, 'F');
  doc.setFillColor(...color); doc.rect(x, y, Math.max(w * Math.min(pct,1), 0.5), h, 'F');
}

export async function downloadPDF(
  accountInfo: AccountInfo,
  period: string,
  stats: RiskStats,
  deals: ClosedDeal[],
  brokerName: string
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const periodLabel = period === '7d' ? 'Last 7 Days' : period === '30d' ? 'Last 30 Days' : 'All Time';
  const date = new Date().toLocaleDateString('en-GB');

  // ─── PAGE 1: COVER + KPIs + METRICS ─────────────────────────────────────
  // Full-page gold banner at top
  doc.setFillColor(...NAVY); doc.rect(0, 0, W, 60, 'F');
  doc.setFillColor(...GOLD); doc.rect(0, 60, W, 1.5, 'F');

  doc.setFont('helvetica','bold'); doc.setFontSize(28); doc.setTextColor(...GOLD);
  doc.text('TRADEGPT', M, 28);
  doc.setFont('helvetica','normal'); doc.setFontSize(11); doc.setTextColor(200,180,120);
  doc.text('Institutional Performance Report', M, 38);
  doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(160,140,90);
  doc.text(`Period: ${periodLabel}  ·  Account: ${brokerName}  ·  ${date}`, M, 48);

  // 4 KPI cards
  const kpis = [
    { l:'BALANCE',    v:`$${f(accountInfo.balance)}`,    c:NAVY  },
    { l:'EQUITY',     v:`$${f(accountInfo.equity)}`,     c:NAVY  },
    { l:'NET PROFIT', v:`${stats.netProfit>=0?'+':''}$${f(stats.netProfit)}`,  c: stats.netProfit>=0?GREEN:RED },
    { l:'WIN RATE',   v:`${f(stats.winRate,1)}%`,        c: stats.winRate>=50?GREEN:RED },
  ];
  const cw = (W - 2*M - 9) / 4;
  kpis.forEach((k, i) => card(doc, M + i*(cw+3), 68, cw, 24, k.l, k.v, k.c));

  // Two metric tables
  const leftMetrics = [
    ['Profit Factor',  stats.profitFactor===Infinity?'∞':f(stats.profitFactor), stats.profitFactor>=1?GREEN:RED],
    ['Expectancy',    `$${f(stats.expectancy)}`, stats.expectancy>=0?GREEN:RED],
    ['Avg Win',       `+$${f(stats.avgWin)}`, GREEN],
    ['Avg Loss',      `-$${f(Math.abs(stats.avgLoss))}`, RED],
    ['Best Trade',    `+$${f(stats.bestTrade)}`, GREEN],
    ['Worst Trade',   `-$${f(Math.abs(stats.worstTrade))}`, RED],
    ['Total Trades',  String(stats.samples), NAVY],
    ['Total Volume',  `${f(stats.totalVolume)} lots`, NAVY],
  ] as [string,string,[number,number,number]][];

  const rightMetrics = [
    ['Sharpe Ratio',     f(stats.sharpe),     stats.sharpe>=1?GREEN:SLATE],
    ['Sortino Ratio',    f(stats.sortino),     stats.sortino>=1?GREEN:SLATE],
    ['Max Drawdown',    `${f(stats.maxDrawdown*100)}%`, RED],
    ['Recovery Factor',  f(stats.recoveryFactor), stats.recoveryFactor>=1?GREEN:RED],
    ['Win Streak',      `${stats.maxWinStreak} trades`, GREEN],
    ['Loss Streak',     `${stats.maxLossStreak} trades`, RED],
    ['Commission',      `-$${f(Math.abs(stats.totalCommission))}`, SLATE],
    ['Swap',            `$${f(stats.totalSwap)}`, SLATE],
  ] as [string,string,[number,number,number]][];

  const tw = (W - 2*M - 8) / 2;
  // Left table header
  doc.setFillColor(...NAVY); doc.roundedRect(M, 100, tw, 7, 1, 1, 'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...GOLD);
  doc.text('PERFORMANCE METRICS', M + tw/2, 104.8, { align:'center' });
  leftMetrics.forEach(([l,v,c], i) => row(doc, M, 113 + i*10, tw, l, v, c));

  // Right table header
  const rx = M + tw + 8;
  doc.setFillColor(...NAVY); doc.roundedRect(rx, 100, tw, 7, 1, 1, 'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...GOLD);
  doc.text('RISK INTELLIGENCE', rx + tw/2, 104.8, { align:'center' });
  rightMetrics.forEach(([l,v,c], i) => row(doc, rx, 113 + i*10, tw, l, v, c));

  footer(doc, date);

  // ─── PAGE 2: CHARTS ──────────────────────────────────────────────────────
  doc.addPage();
  header(doc, 'Analytics · ' + periodLabel, 2);

  // Win/Loss donut-style bar
  let y2 = 30;
  doc.setFillColor(...NAVY); doc.roundedRect(M, y2, W-2*M, 7, 1, 1, 'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...GOLD);
  doc.text('RISK SCORE DASHBOARD', W/2, y2+4.8, { align:'center' });
  y2 += 10;

  const riskBars: [string, number, [number,number,number], string][] = [
    ['Win Rate',             stats.winRate/100,          stats.winRate>=50?GREEN:RED,   `${f(stats.winRate,1)}%`],
    ['Profit Factor (÷10)', Math.min(stats.profitFactor===Infinity?1:stats.profitFactor/10,1), GOLD, stats.profitFactor===Infinity?'∞':f(stats.profitFactor)],
    ['Sharpe Ratio (÷3)',   Math.min(stats.sharpe/3,1),    GOLD,   f(stats.sharpe)],
    ['Recovery Factor (÷5)',Math.min(stats.recoveryFactor/5,1), GREEN, f(stats.recoveryFactor)],
    ['Max Drawdown ×5',     Math.min(stats.maxDrawdown*5,1),     RED,  `${f(stats.maxDrawdown*100)}%`],
  ];

  riskBars.forEach(([label, pct, color, val]) => {
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...SLATE);
    doc.text(label, M, y2 + 3.5);
    doc.setFont('helvetica','bold'); doc.setTextColor(...color);
    doc.text(val, W-M, y2 + 3.5, { align:'right' });
    bar(doc, M, y2 + 5, W-2*M, 4, pct, color);
    y2 += 14;
  });

  // Win vs Loss summary boxes
  y2 += 4;
  doc.setFillColor(230,248,235); doc.roundedRect(M, y2, (W-2*M-6)/2, 22, 2, 2, 'F');
  doc.setDrawColor(...GREEN); doc.setLineWidth(0.4); doc.roundedRect(M, y2, (W-2*M-6)/2, 22, 2, 2, 'S');
  doc.setFont('helvetica','bold'); doc.setFontSize(18); doc.setTextColor(...GREEN);
  doc.text(String(stats.wins), M + (W-2*M-6)/4, y2+13, { align:'center' });
  doc.setFontSize(7); doc.setTextColor(...SLATE);
  doc.text('WINNING TRADES', M + (W-2*M-6)/4, y2+19, { align:'center' });

  const rx2 = M + (W-2*M-6)/2 + 6;
  doc.setFillColor(252,232,232); doc.roundedRect(rx2, y2, (W-2*M-6)/2, 22, 2, 2, 'F');
  doc.setDrawColor(...RED); doc.setLineWidth(0.4); doc.roundedRect(rx2, y2, (W-2*M-6)/2, 22, 2, 2, 'S');
  doc.setFont('helvetica','bold'); doc.setFontSize(18); doc.setTextColor(...RED);
  doc.text(String(stats.losses), rx2 + (W-2*M-6)/4, y2+13, { align:'center' });
  doc.setFontSize(7); doc.setTextColor(...SLATE);
  doc.text('LOSING TRADES', rx2 + (W-2*M-6)/4, y2+19, { align:'center' });
  y2 += 30;

  // Symbol bar chart
  const bySymbol: Record<string,number> = {};
  deals.forEach(d => { bySymbol[d.symbol] = (bySymbol[d.symbol]||0) + d.profit; });
  const top = Object.entries(bySymbol).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).slice(0,8);

  if (top.length > 0) {
    doc.setFillColor(...NAVY); doc.roundedRect(M, y2, W-2*M, 7, 1, 1, 'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...GOLD);
    doc.text('PROFIT BY SYMBOL', W/2, y2+4.8, { align:'center' });
    y2 += 10;

    const maxVal = Math.max(...top.map(t=>Math.abs(t[1])), 1);
    const bw = (W - 2*M - (top.length-1)*3) / top.length;
    const maxBarH = 40;

    top.forEach(([sym, val], i) => {
      const bh = Math.max((Math.abs(val)/maxVal)*maxBarH, 1);
      const bx = M + i*(bw+3);
      const by = y2 + maxBarH - bh;
      const color: [number,number,number] = val >= 0 ? GREEN : RED;
      doc.setFillColor(...color); doc.rect(bx, by, bw, bh, 'F');
      doc.setFont('helvetica','bold'); doc.setFontSize(5.5);
      doc.setTextColor(...(val>=0?GREEN:RED));
      doc.text(`$${f(val,0)}`, bx+bw/2, by-1.5, { align:'center' });
      doc.setFont('helvetica','normal'); doc.setTextColor(...SLATE);
      doc.text(sym, bx+bw/2, y2+maxBarH+5, { align:'center' });
    });
  }

  footer(doc, date);

  // ─── PAGE 3: TRADE LOG ───────────────────────────────────────────────────
  doc.addPage();
  header(doc, 'Closed Trade Log · ' + periodLabel, 3);

  // Table header
  let ty = 28;
  doc.setFillColor(...NAVY); doc.rect(M, ty, W-2*M, 8, 'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...GOLD);
  const cols = [
    { l:'SYMBOL',  x: M+2,    w:22 },
    { l:'TYPE',    x: M+26,   w:14 },
    { l:'VOLUME',  x: M+42,   w:16 },
    { l:'ENTRY',   x: M+60,   w:22 },
    { l:'EXIT',    x: M+84,   w:22 },
    { l:'P&L',     x: M+108,  w:24 },
    { l:'DATE',    x: M+134,  w:28 },
  ];
  cols.forEach(c => doc.text(c.l, c.x, ty+5.5));
  ty += 9;

  const recentDeals = [...deals]
    .sort((a,b) => new Date(b.closeTime).getTime()-new Date(a.closeTime).getTime())
    .slice(0, 22);

  recentDeals.forEach((d, i) => {
    if (i % 2 === 0) { doc.setFillColor(...LIGHT); doc.rect(M, ty-1, W-2*M, 7, 'F'); }
    doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(...NAVY);
    doc.text(d.symbol,                              cols[0].x, ty+4);
    doc.text(d.type.toUpperCase(),                  cols[1].x, ty+4);
    doc.text(f(d.volume,2),                         cols[2].x, ty+4);
    doc.text(f(d.entryPrice,5),                     cols[3].x, ty+4);
    doc.text(f(d.exitPrice,5),                       cols[4].x, ty+4);
    doc.setFont('helvetica','bold');
    doc.setTextColor(...(d.profit>=0?GREEN:RED));
    doc.text(`${d.profit>=0?'+':''}$${f(d.profit)}`, cols[5].x, ty+4);
    doc.setFont('helvetica','normal'); doc.setTextColor(...SLATE);
    doc.text(new Date(d.closeTime).toLocaleDateString('en-GB'), cols[6].x, ty+4);
    doc.setDrawColor(210,200,175); doc.setLineWidth(0.1);
    doc.line(M, ty+6, W-M, ty+6);
    ty += 7;
    if (ty > H - 22) { ty = H - 22; } // safety clamp
  });

  if (recentDeals.length === 0) {
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(...SLATE);
    doc.text('No closed trades in this period.', W/2, ty+10, { align:'center' });
  }

  // Certification box
  const certY = H - 44;
  doc.setFillColor(...LIGHT); doc.roundedRect(M, certY, W-2*M, 28, 2, 2, 'F');
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.4); doc.roundedRect(M, certY, W-2*M, 28, 2, 2, 'S');
  doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(...NAVY);
  doc.text('CERTIFIED PERFORMANCE REPORT', W/2, certY+8, { align:'center' });
  doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(...SLATE);
  doc.text(`Account: ${brokerName}  ·  Period: ${periodLabel}  ·  Generated: ${date}`, W/2, certY+15, { align:'center' });
  doc.text(`Leverage: 1:${accountInfo.leverage}  ·  Currency: ${accountInfo.currency||'USD'}  ·  Positions: ${accountInfo.positionCount}`, W/2, certY+21, { align:'center' });

  footer(doc, date);

  // Download
  const filename = `TradeGPT_Report_${period}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
