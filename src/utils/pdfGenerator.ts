import { jsPDF } from 'jspdf';
import { AccountInfo, RiskStats, ClosedDeal } from '@/types';

// ── Palette ──────────────────────────────────────────────────────────────────
const NAVY  = { r:26,  g:39,  b:64  };
const GOLD  = { r:200, g:162, b:77  };
const LIGHT = { r:250, g:246, b:234 };
const SLATE = { r:100, g:90,  b:70  };
const GREEN = { r:34,  g:139, b:80  };
const RED   = { r:200, g:50,  b:50  };
const WHITE = { r:255, g:255, b:255 };
const DIVIDER = { r:215, g:200, b:170 };

type Col = typeof NAVY;

const W = 210, H = 297, M = 14;

// ── Helpers ───────────────────────────────────────────────────────────────────
const f = (v: number, d = 2) =>
  v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

function fill(doc: jsPDF, c: Col)   { doc.setFillColor(c.r, c.g, c.b); }
function stroke(doc: jsPDF, c: Col) { doc.setDrawColor(c.r, c.g, c.b); }
function color(doc: jsPDF, c: Col)  { doc.setTextColor(c.r, c.g, c.b); }

function filledRect(doc: jsPDF, fc: Col, x: number, y: number, w: number, h: number) {
  fill(doc, fc);
  stroke(doc, fc); // no visible border
  doc.rect(x, y, w, h, 'F');
}

function borderedRoundRect(doc: jsPDF, fc: Col, sc: Col, lw: number,
                            x: number, y: number, w: number, h: number, r = 2) {
  fill(doc, fc); stroke(doc, sc);
  doc.setLineWidth(lw);
  doc.roundedRect(x, y, w, h, r, r, 'FD');
}

function header(doc: jsPDF, subtitle: string, page: number) {
  filledRect(doc, NAVY, 0, 0, W, 18);
  filledRect(doc, GOLD, 0, 18, W, 1.2);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); color(doc, GOLD);
  doc.text('TRADEGPT', M, 11);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
  doc.setTextColor(180, 160, 100);
  doc.text(subtitle.toUpperCase(), M + 36, 11);
  doc.setTextColor(160, 140, 80);
  doc.text(`PAGE ${page}`, W - M - 10, 11);
}

function footer(doc: jsPDF, date: string) {
  filledRect(doc, LIGHT, 0, H - 10, W, 10);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6); color(doc, SLATE);
  doc.text('TRADEGPT · INSTITUTIONAL PERFORMANCE REPORT · CONFIDENTIAL', M, H - 4.5);
  doc.text(date, W - M - 24, H - 4.5);
}

function kpiCard(doc: jsPDF, x: number, y: number, w: number, h: number,
                 label: string, value: string, vc: Col) {
  borderedRoundRect(doc, LIGHT, GOLD, 0.35, x, y, w, h);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); color(doc, SLATE);
  doc.text(label, x + w / 2, y + 7, { align: 'center' });
  doc.setFontSize(11); color(doc, vc);
  doc.text(value, x + w / 2, y + 17, { align: 'center' });
}

function metricRow(doc: jsPDF, x: number, y: number, w: number,
                   label: string, value: string, vc: Col) {
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); color(doc, SLATE);
  doc.text(label, x, y);
  doc.setFont('helvetica', 'bold'); color(doc, vc);
  doc.text(value, x + w, y, { align: 'right' });
  // divider
  stroke(doc, DIVIDER); doc.setLineWidth(0.15);
  doc.line(x, y + 2, x + w, y + 2);
}

function progressBar(doc: jsPDF, x: number, y: number, w: number, h: number,
                     pct: number, bc: Col) {
  filledRect(doc, DIVIDER, x, y, w, h);
  if (pct > 0) {
    filledRect(doc, bc, x, y, Math.max(w * Math.min(pct, 1), 0.8), h);
  }
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function downloadPDF(
  accountInfo: AccountInfo,
  period: string,
  stats: RiskStats,
  deals: ClosedDeal[],
  brokerName: string
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const periodLabel =
    period === '7d' ? 'Last 7 Days' : period === '30d' ? 'Last 30 Days' : 'All Time';
  const date = new Date().toLocaleDateString('en-GB');

  // ═══════════════════════════════════ PAGE 1: COVER + KPIs + METRICS ═══════
  // Dark cover banner
  filledRect(doc, NAVY, 0, 0, W, 60);
  filledRect(doc, GOLD, 0, 60, W, 1.5);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(26); color(doc, GOLD);
  doc.text('TRADEGPT', M, 26);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
  doc.setTextColor(200, 180, 120);
  doc.text('Institutional Performance Report', M, 37);
  doc.setFontSize(8); doc.setTextColor(160, 140, 90);
  doc.text(`Period: ${periodLabel}  ·  Account: ${brokerName}  ·  ${date}`, M, 48);

  // 4 KPI cards
  const cw = (W - 2 * M - 9) / 4;
  const kpis = [
    { l: 'BALANCE',    v: `$${f(accountInfo.balance)}`,                              vc: NAVY  },
    { l: 'EQUITY',     v: `$${f(accountInfo.equity)}`,                               vc: NAVY  },
    { l: 'NET PROFIT', v: `${stats.netProfit >= 0 ? '+' : ''}$${f(stats.netProfit)}`,vc: stats.netProfit >= 0 ? GREEN : RED },
    { l: 'WIN RATE',   v: `${f(stats.winRate, 1)}%`,                                 vc: stats.winRate >= 50 ? GREEN : RED },
  ];
  kpis.forEach((k, i) => kpiCard(doc, M + i * (cw + 3), 68, cw, 24, k.l, k.v, k.vc));

  // Two metric tables
  const tw = (W - 2 * M - 8) / 2;

  // Left table
  borderedRoundRect(doc, NAVY, NAVY, 0, M, 100, tw, 7);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); color(doc, GOLD);
  doc.text('PERFORMANCE METRICS', M + tw / 2, 105, { align: 'center' });

  const leftRows: [string, string, Col][] = [
    ['Profit Factor',  stats.profitFactor === Infinity ? '∞' : f(stats.profitFactor), stats.profitFactor >= 1 ? GREEN : RED],
    ['Expectancy',    `$${f(stats.expectancy)}`,            stats.expectancy >= 0 ? GREEN : RED],
    ['Avg Win',       `+$${f(stats.avgWin)}`,               GREEN],
    ['Avg Loss',      `-$${f(Math.abs(stats.avgLoss))}`,    RED],
    ['Best Trade',    `+$${f(stats.bestTrade)}`,             GREEN],
    ['Worst Trade',   `-$${f(Math.abs(stats.worstTrade))}`, RED],
    ['Total Trades',   String(stats.samples),               NAVY],
    ['Total Volume',  `${f(stats.totalVolume)} lots`,       NAVY],
  ];
  leftRows.forEach(([l, v, c], i) => metricRow(doc, M, 113 + i * 10, tw, l, v, c));

  // Right table
  const rx = M + tw + 8;
  borderedRoundRect(doc, NAVY, NAVY, 0, rx, 100, tw, 7);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); color(doc, GOLD);
  doc.text('RISK INTELLIGENCE', rx + tw / 2, 105, { align: 'center' });

  const rightRows: [string, string, Col][] = [
    ['Sharpe Ratio',     f(stats.sharpe),                    stats.sharpe >= 1 ? GREEN : SLATE],
    ['Sortino Ratio',    f(stats.sortino),                   stats.sortino >= 1 ? GREEN : SLATE],
    ['Max Drawdown',    `${f(stats.maxDrawdown * 100)}%`,    RED],
    ['Recovery Factor',  f(stats.recoveryFactor),            stats.recoveryFactor >= 1 ? GREEN : RED],
    ['Win Streak',      `${stats.maxWinStreak} trades`,      GREEN],
    ['Loss Streak',     `${stats.maxLossStreak} trades`,     RED],
    ['Commission',      `-$${f(Math.abs(stats.totalCommission))}`, SLATE],
    ['Swap',            `$${f(stats.totalSwap)}`,            SLATE],
  ];
  rightRows.forEach(([l, v, c], i) => metricRow(doc, rx, 113 + i * 10, tw, l, v, c));

  footer(doc, date);

  // ═══════════════════════════════════ PAGE 2: CHARTS ══════════════════════
  doc.addPage();
  header(doc, 'Analytics · ' + periodLabel, 2);

  let y2 = 28;

  // Section header
  filledRect(doc, NAVY, M, y2, W - 2 * M, 7);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); color(doc, GOLD);
  doc.text('RISK SCORE DASHBOARD', W / 2, y2 + 4.8, { align: 'center' });
  y2 += 10;

  const riskBars: [string, number, Col, string][] = [
    ['Win Rate',              stats.winRate / 100,                              stats.winRate >= 50 ? GREEN : RED,  `${f(stats.winRate, 1)}%`],
    ['Profit Factor (÷10)',   Math.min(stats.profitFactor === Infinity ? 1 : stats.profitFactor / 10, 1), GOLD, stats.profitFactor === Infinity ? '∞' : f(stats.profitFactor)],
    ['Sharpe Ratio (÷3)',     Math.min(stats.sharpe / 3, 1),                   GOLD,                               f(stats.sharpe)],
    ['Recovery Factor (÷5)',  Math.min(stats.recoveryFactor / 5, 1),           GREEN,                              f(stats.recoveryFactor)],
    ['Max Drawdown ×5',       Math.min(stats.maxDrawdown * 5, 1),              RED,                                `${f(stats.maxDrawdown * 100)}%`],
  ];

  riskBars.forEach(([label, pct, bc, val]) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); color(doc, SLATE);
    doc.text(label, M, y2 + 3.5);
    doc.setFont('helvetica', 'bold'); color(doc, bc);
    doc.text(val, W - M, y2 + 3.5, { align: 'right' });
    progressBar(doc, M, y2 + 5, W - 2 * M, 4, pct, bc);
    y2 += 14;
  });

  // Win vs Loss boxes
  y2 += 4;
  const bw2 = (W - 2 * M - 6) / 2;

  borderedRoundRect(doc, { r:230, g:248, b:235 }, GREEN, 0.5, M, y2, bw2, 22);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); color(doc, GREEN);
  doc.text(String(stats.wins), M + bw2 / 2, y2 + 14, { align: 'center' });
  doc.setFontSize(7); color(doc, SLATE);
  doc.text('WINNING TRADES', M + bw2 / 2, y2 + 20, { align: 'center' });

  const rx2 = M + bw2 + 6;
  borderedRoundRect(doc, { r:252, g:232, b:232 }, RED, 0.5, rx2, y2, bw2, 22);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); color(doc, RED);
  doc.text(String(stats.losses), rx2 + bw2 / 2, y2 + 14, { align: 'center' });
  doc.setFontSize(7); color(doc, SLATE);
  doc.text('LOSING TRADES', rx2 + bw2 / 2, y2 + 20, { align: 'center' });
  y2 += 30;

  // Symbol bar chart
  const bySymbol: Record<string, number> = {};
  deals.forEach(d => { bySymbol[d.symbol] = (bySymbol[d.symbol] || 0) + d.profit; });
  const top = Object.entries(bySymbol)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 8);

  if (top.length > 0) {
    filledRect(doc, NAVY, M, y2, W - 2 * M, 7);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); color(doc, GOLD);
    doc.text('PROFIT BY SYMBOL', W / 2, y2 + 4.8, { align: 'center' });
    y2 += 10;

    const maxVal = Math.max(...top.map(t => Math.abs(t[1])), 1);
    const barW = (W - 2 * M - (top.length - 1) * 3) / top.length;
    const maxBarH = 42;

    top.forEach(([sym, val], i) => {
      const bh = Math.max((Math.abs(val) / maxVal) * maxBarH, 1.5);
      const bx = M + i * (barW + 3);
      const by = y2 + maxBarH - bh;
      const bc = val >= 0 ? GREEN : RED;

      filledRect(doc, bc, bx, by, barW, bh);

      doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); color(doc, bc);
      doc.text(`$${f(val, 0)}`, bx + barW / 2, by - 1.5, { align: 'center' });
      doc.setFont('helvetica', 'normal'); color(doc, SLATE);
      doc.text(sym, bx + barW / 2, y2 + maxBarH + 5, { align: 'center' });
    });
  } else {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); color(doc, SLATE);
    doc.text('No closed trades in this period', W / 2, y2 + 20, { align: 'center' });
  }

  footer(doc, date);

  // ═══════════════════════════════════ PAGE 3: TRADE LOG ════════════════════
  doc.addPage();
  header(doc, 'Closed Trade Log · ' + periodLabel, 3);

  let ty = 27;
  // Table header row
  filledRect(doc, NAVY, M, ty, W - 2 * M, 8);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); color(doc, GOLD);

  const cols = [
    { l: 'SYMBOL',  x: M + 1    },
    { l: 'TYPE',    x: M + 25   },
    { l: 'VOLUME',  x: M + 40   },
    { l: 'ENTRY',   x: M + 58   },
    { l: 'EXIT',    x: M + 82   },
    { l: 'P&L',     x: M + 108  },
    { l: 'DATE',    x: M + 133  },
  ];
  cols.forEach(c => doc.text(c.l, c.x, ty + 5.5));
  ty += 9;

  const recentDeals = [...deals]
    .sort((a, b) => new Date(b.closeTime).getTime() - new Date(a.closeTime).getTime())
    .slice(0, 22);

  recentDeals.forEach((d, i) => {
    if (i % 2 === 0) filledRect(doc, LIGHT, M, ty - 1, W - 2 * M, 7);

    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); color(doc, NAVY);
    doc.text(d.symbol,                cols[0].x, ty + 4);
    const typeLabel = d.type.replace(/^DEAL_TYPE_/i, '').toUpperCase();
    doc.text(typeLabel,                   cols[1].x, ty + 4);
    doc.text(f(d.volume, 2),          cols[2].x, ty + 4);
    doc.text(f(d.entryPrice, 5),      cols[3].x, ty + 4);
    doc.text(f(d.exitPrice, 5),       cols[4].x, ty + 4);

    doc.setFont('helvetica', 'bold');
    color(doc, d.profit >= 0 ? GREEN : RED);
    doc.text(`${d.profit >= 0 ? '+' : ''}$${f(d.profit)}`, cols[5].x, ty + 4);

    doc.setFont('helvetica', 'normal'); color(doc, SLATE);
    doc.text(new Date(d.closeTime).toLocaleDateString('en-GB'), cols[6].x, ty + 4);

    stroke(doc, DIVIDER); doc.setLineWidth(0.1);
    doc.line(M, ty + 6, W - M, ty + 6);

    ty = Math.min(ty + 7, H - 24);
  });

  if (recentDeals.length === 0) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); color(doc, SLATE);
    doc.text('No closed trades in this period.', W / 2, ty + 12, { align: 'center' });
  }

  // Certification block
  const certY = H - 44;
  borderedRoundRect(doc, LIGHT, GOLD, 0.5, M, certY, W - 2 * M, 28);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); color(doc, NAVY);
  doc.text('✓ CERTIFIED PERFORMANCE REPORT', W / 2, certY + 9, { align: 'center' });

  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); color(doc, SLATE);
  doc.text(
    `Account: ${brokerName}  ·  Period: ${periodLabel}  ·  Generated: ${date}`,
    W / 2, certY + 16, { align: 'center' }
  );
  doc.text(
    `Leverage: 1:${accountInfo.leverage}  ·  Currency: ${accountInfo.currency || 'USD'}  ·  Positions: ${accountInfo.positionCount}`,
    W / 2, certY + 22, { align: 'center' }
  );

  footer(doc, date);

  // Save
  const filename = `TradeGPT_Report_${period}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
