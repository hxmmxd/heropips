import { jsPDF } from 'jspdf';
import { AccountInfo, RiskStats, ClosedDeal } from '@/types';

type C = { r:number; g:number; b:number };
const NAVY:C={r:26,g:39,b:64}, DKBROWN:C={r:40,g:30,b:5}, GOLD:C={r:200,g:162,b:77},
  LIGHT:C={r:250,g:246,b:234}, SLATE:C={r:100,g:90,b:70}, GREEN:C={r:34,g:139,b:80},
  RED:C={r:200,g:50,b:50}, DIVIDER:C={r:215,g:200,b:170}, MUTED:C={r:160,g:140,b:90},
  GOLDLT:C={r:212,g:184,b:106}, CREAM:C={r:255,g:253,b:245};
const W=210, H=297, M=14;
const f=(v:number,d=2)=>v.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const fl=(d:jsPDF,c:C)=>{d.setFillColor(c.r,c.g,c.b)};
const st=(d:jsPDF,c:C)=>{d.setDrawColor(c.r,c.g,c.b)};
const tc=(d:jsPDF,c:C)=>{d.setTextColor(c.r,c.g,c.b)};

function gradient(doc:jsPDF, y:number, h:number, c1:C, c2:C) {
  const steps=40;
  for(let i=0;i<steps;i++){
    const t=i/steps;
    fl(doc,{r:Math.round(c1.r+(c2.r-c1.r)*t),g:Math.round(c1.g+(c2.g-c1.g)*t),b:Math.round(c1.b+(c2.b-c1.b)*t)});
    doc.rect(0, y+i*(h/steps), W, h/steps+0.5, 'F');
  }
}

function sectionTitle(doc:jsPDF, y:number, text:string) {
  doc.setFont('helvetica','bold'); doc.setFontSize(7.5); tc(doc,SLATE);
  const spaced = text.split('').join(' ');
  doc.text(spaced, M, y);
  st(doc,DIVIDER); doc.setLineWidth(0.3); doc.line(M, y+2.5, W-M, y+2.5);
}

function header(doc:jsPDF, sub:string, pg:number) {
  fl(doc,NAVY); doc.rect(0,0,W,17,'F');
  fl(doc,GOLD); doc.rect(0,17,W,1,'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(8.5); tc(doc,GOLD);
  doc.text('TRADEGPT', M, 10.5);
  doc.setFont('helvetica','normal'); doc.setFontSize(6.5); tc(doc,MUTED);
  doc.text(sub.toUpperCase(), M+34, 10.5);
  doc.text(`PAGE ${pg}`, W-M, 10.5, {align:'right'});
}

function ftr(doc:jsPDF, date:string) {
  fl(doc,LIGHT); doc.rect(0,H-9,W,9,'F');
  doc.setFont('helvetica','normal'); doc.setFontSize(5.5); tc(doc,SLATE);
  doc.text('TRADEGPT · INSTITUTIONAL PERFORMANCE REPORT · CONFIDENTIAL', M, H-4);
  doc.text(date, W-M, H-4, {align:'right'});
}

function metricRow(doc:jsPDF, x:number, y:number, w:number, label:string, value:string, vc:C) {
  doc.setFont('helvetica','normal'); doc.setFontSize(8); tc(doc,SLATE);
  doc.text(label, x, y);
  doc.setFont('helvetica','bold'); tc(doc,vc);
  doc.text(value, x+w, y, {align:'right'});
  st(doc,DIVIDER); doc.setLineWidth(0.15); doc.line(x, y+2.5, x+w, y+2.5);
}

function bar(doc:jsPDF, x:number, y:number, w:number, h:number, pct:number, c:C) {
  fl(doc,{r:230,g:220,b:195}); doc.rect(x,y,w,h,'F');
  if(pct>0){fl(doc,c); doc.rect(x,y,Math.max(w*Math.min(pct,1),0.8),h,'F');}
}

export async function downloadPDF(
  accountInfo:AccountInfo, period:string, stats:RiskStats, deals:ClosedDeal[], brokerName:string
) {
  const doc = new jsPDF({unit:'mm',format:'a4',orientation:'portrait'});
  const pLabel = period==='7d'?'Last 7 Days':period==='30d'?'Last 30 Days':'All Time';
  const date = new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});

  // ═══ PAGE 1 ═══════════════════════════════════════════════════════════════
  // Cover banner with gradient
  gradient(doc, 0, 65, {r:30,g:22,b:5}, {r:60,g:45,b:10});
  // Gold divider
  fl(doc,GOLD); doc.rect(0,56,W,0.6,'F');

  // Banner text
  doc.setFont('helvetica','bold'); doc.setFontSize(28); tc(doc,GOLD);
  doc.text('TRADEGPT', M+2, 22);
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
  doc.setTextColor(180,155,80);
  doc.text('INSTITUTIONAL PORTFOLIO ANALYTICS', M+2, 30);

  doc.setFont('helvetica','bold'); doc.setFontSize(14);
  doc.setTextColor(255,248,230);
  doc.text('Performance Intelligence Report', M+2, 42);

  // Metadata row
  const metaY = 50;
  doc.setFont('helvetica','normal'); doc.setFontSize(6);
  doc.setTextColor(140,120,60);
  doc.text('PERIOD', M+2, metaY);
  doc.text('ACCOUNT', M+50, metaY);
  doc.text('CURRENCY', M+120, metaY);
  doc.text('COMPILED', M+150, metaY);
  doc.setFont('helvetica','bold'); doc.setFontSize(8); tc(doc,GOLD);
  doc.text(pLabel, M+2, metaY+5);
  doc.text(brokerName, M+50, metaY+5);
  doc.text(accountInfo.currency||'USD', M+120, metaY+5);
  doc.text(date, M+150, metaY+5);

  // Portfolio Overview section
  sectionTitle(doc, 76, 'PORTFOLIO OVERVIEW');

  // 4 KPI cards
  const cw = (W-2*M-9)/4;
  const kpis = [
    {l:'BALANCE', v:`$${f(accountInfo.balance)}`, sub:'Account Balance', vc:NAVY},
    {l:'EQUITY',  v:`$${f(accountInfo.equity)}`,  sub:'Live Equity',    vc:NAVY},
    {l:'NET PROFIT', v:`${stats.netProfit>=0?'+':''}$${f(stats.netProfit)}`, sub:pLabel, vc:stats.netProfit>=0?GREEN:RED},
    {l:'WIN RATE', v:`${f(stats.winRate,1)}%`, sub:`${stats.wins}W / ${stats.losses}L`, vc:stats.winRate>=50?GREEN:RED},
  ];
  kpis.forEach((k,i)=>{
    const x = M+i*(cw+3), y = 82;
    fl(doc,LIGHT); st(doc,DIVIDER); doc.setLineWidth(0.3); doc.roundedRect(x,y,cw,28,2,2,'FD');
    doc.setFont('helvetica','bold'); doc.setFontSize(6); tc(doc,SLATE);
    doc.text(k.l, x+cw/2, y+7, {align:'center'});
    doc.setFontSize(13); tc(doc,k.vc);
    doc.text(k.v, x+cw/2, y+18, {align:'center'});
    doc.setFont('helvetica','normal'); doc.setFontSize(6); tc(doc,MUTED);
    doc.text(k.sub, x+cw/2, y+24, {align:'center'});
  });

  // Two metric tables
  const tw = (W-2*M-10)/2;

  // Left - Performance
  const ltY = 116;
  fl(doc,LIGHT); st(doc,DIVIDER); doc.setLineWidth(0.3);
  doc.roundedRect(M, ltY, tw, 7, 1.5, 1.5, 'FD');
  doc.setFont('helvetica','bold'); doc.setFontSize(7); tc(doc,SLATE);
  doc.text('PERFORMANCE METRICS', M+tw/2, ltY+5, {align:'center'});

  const lr:[string,string,C][] = [
    ['Profit Factor', stats.profitFactor===Infinity?'∞':f(stats.profitFactor), stats.profitFactor>=1?GREEN:RED],
    ['Expectancy', `$${f(stats.expectancy)}`, stats.expectancy>=0?GREEN:RED],
    ['Avg Win', `+$${f(stats.avgWin)}`, GREEN],
    ['Avg Loss', `-$${f(Math.abs(stats.avgLoss))}`, RED],
    ['Best Trade', `+$${f(stats.bestTrade)}`, GREEN],
    ['Worst Trade', `-$${f(Math.abs(stats.worstTrade))}`, RED],
    ['Total Trades', String(stats.samples), NAVY],
    ['Total Volume', `${f(stats.totalVolume)} lots`, NAVY],
  ];
  lr.forEach(([l,v,c],i)=>metricRow(doc, M, ltY+14+i*10, tw, l, v, c));

  // Right - Risk
  const rx = M+tw+10;
  fl(doc,LIGHT); st(doc,DIVIDER); doc.setLineWidth(0.3);
  doc.roundedRect(rx, ltY, tw, 7, 1.5, 1.5, 'FD');
  doc.setFont('helvetica','bold'); doc.setFontSize(7); tc(doc,SLATE);
  doc.text('RISK INTELLIGENCE', rx+tw/2, ltY+5, {align:'center'});

  const rr:[string,string,C][] = [
    ['Sharpe Ratio', f(stats.sharpe), stats.sharpe>=1?GREEN:SLATE],
    ['Sortino Ratio', f(stats.sortino), stats.sortino>=1?GREEN:SLATE],
    ['Max Drawdown', `${f(stats.maxDrawdown)}%`, RED],
    ['Recovery Factor', f(stats.recoveryFactor), stats.recoveryFactor>=1?GREEN:RED],
    ['Max Win Streak', `${stats.maxWinStreak} trades`, GREEN],
    ['Max Loss Streak', `${stats.maxLossStreak} trades`, RED],
    ['Commission', `-$${f(Math.abs(stats.totalCommission))}`, SLATE],
    ['Swap', `$${f(stats.totalSwap)}`, SLATE],
  ];
  rr.forEach(([l,v,c],i)=>metricRow(doc, rx, ltY+14+i*10, tw, l, v, c));

  ftr(doc, date);

  // ═══ PAGE 2: CHARTS ══════════════════════════════════════════════════════
  doc.addPage();
  header(doc, 'Analytics · '+pLabel, 2);

  let y2 = 26;
  sectionTitle(doc, y2, 'RISK SCORE DASHBOARD');
  y2 += 8;

  const riskBars:[string,number,C,string][] = [
    ['Win Rate', stats.winRate/100, stats.winRate>=50?GREEN:RED, `${f(stats.winRate,1)}%`],
    ['Profit Factor (÷10)', Math.min(stats.profitFactor===Infinity?1:stats.profitFactor/10,1), GOLD, stats.profitFactor===Infinity?'∞':f(stats.profitFactor)],
    ['Sharpe Ratio (÷3)', Math.min(stats.sharpe/3,1), GOLD, f(stats.sharpe)],
    ['Recovery Factor (÷5)', Math.min(stats.recoveryFactor/5,1), GREEN, f(stats.recoveryFactor)],
    ['Max Drawdown ×5', Math.min(stats.maxDrawdown/20,1), RED, `${f(stats.maxDrawdown)}%`],
  ];
  riskBars.forEach(([label,pct,bc,val])=>{
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5); tc(doc,SLATE);
    doc.text(label, M, y2+3.5);
    doc.setFont('helvetica','bold'); tc(doc,bc);
    doc.text(val, W-M, y2+3.5, {align:'right'});
    bar(doc, M, y2+5, W-2*M, 4.5, pct, bc);
    y2 += 14;
  });

  y2 += 6;
  sectionTitle(doc, y2, 'WIN / LOSS DISTRIBUTION');
  y2 += 8;
  const bw2 = (W-2*M-8)/2;

  fl(doc,{r:230,g:248,b:235}); st(doc,GREEN); doc.setLineWidth(0.5);
  doc.roundedRect(M, y2, bw2, 24, 2, 2, 'FD');
  doc.setFont('helvetica','bold'); doc.setFontSize(22); tc(doc,GREEN);
  doc.text(String(stats.wins), M+bw2/2, y2+15, {align:'center'});
  doc.setFontSize(6.5); tc(doc,SLATE);
  doc.text('WINNING TRADES', M+bw2/2, y2+21, {align:'center'});

  const rx2 = M+bw2+8;
  fl(doc,{r:252,g:232,b:232}); st(doc,RED); doc.setLineWidth(0.5);
  doc.roundedRect(rx2, y2, bw2, 24, 2, 2, 'FD');
  doc.setFont('helvetica','bold'); doc.setFontSize(22); tc(doc,RED);
  doc.text(String(stats.losses), rx2+bw2/2, y2+15, {align:'center'});
  doc.setFontSize(6.5); tc(doc,SLATE);
  doc.text('LOSING TRADES', rx2+bw2/2, y2+21, {align:'center'});
  y2 += 32;

  // Symbol bar chart
  const bySymbol:Record<string,number> = {};
  deals.forEach(d=>{bySymbol[d.symbol]=(bySymbol[d.symbol]||0)+d.profit});
  const top = Object.entries(bySymbol).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).slice(0,8);

  if (top.length>0) {
    sectionTitle(doc, y2, 'PROFIT BY SYMBOL');
    y2 += 8;
    const maxVal = Math.max(...top.map(t=>Math.abs(t[1])),1);
    const barW = (W-2*M-(top.length-1)*3)/top.length;
    const maxH = 42;
    top.forEach(([sym,val],i)=>{
      const bh = Math.max((Math.abs(val)/maxVal)*maxH, 2);
      const bx = M+i*(barW+3), by = y2+maxH-bh;
      const bc = val>=0?GREEN:RED;
      fl(doc,bc); doc.rect(bx,by,barW,bh,'F');
      doc.setFont('helvetica','bold'); doc.setFontSize(5.5); tc(doc,bc);
      doc.text(`$${f(val,0)}`, bx+barW/2, by-2, {align:'center'});
      doc.setFont('helvetica','normal'); tc(doc,SLATE);
      doc.text(sym, bx+barW/2, y2+maxH+5, {align:'center'});
    });
  }

  ftr(doc, date);

  // ═══ PAGE 3: TRADE LOG ════════════════════════════════════════════════════
  doc.addPage();
  header(doc, 'Closed Trade Log · '+pLabel, 3);

  let ty = 26;
  sectionTitle(doc, ty, 'RECENT CLOSED TRADES');
  ty += 6;

  fl(doc,NAVY); doc.rect(M, ty, W-2*M, 7, 'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(6.5); tc(doc,GOLD);
  const cols = [
    {l:'SYMBOL',x:M+2}, {l:'TYPE',x:M+26}, {l:'VOLUME',x:M+42},
    {l:'ENTRY',x:M+60}, {l:'EXIT',x:M+84}, {l:'P&L',x:M+108}, {l:'DATE',x:M+134},
  ];
  cols.forEach(c=>doc.text(c.l, c.x, ty+5));
  ty += 8;

  const recent = [...deals].sort((a,b)=>new Date(b.closeTime).getTime()-new Date(a.closeTime).getTime()).slice(0,22);

  recent.forEach((d,i)=>{
    if(i%2===0){fl(doc,LIGHT); doc.rect(M, ty-0.5, W-2*M, 7, 'F');}
    doc.setFont('helvetica','normal'); doc.setFontSize(6.5); tc(doc,NAVY);
    doc.text(d.symbol, cols[0].x, ty+4);
    const tl = d.type.replace(/^DEAL_TYPE_/i,'').toUpperCase();
    doc.text(tl, cols[1].x, ty+4);
    doc.text(f(d.volume,2), cols[2].x, ty+4);
    doc.text(f(d.entryPrice,5), cols[3].x, ty+4);
    doc.text(f(d.exitPrice,5), cols[4].x, ty+4);
    doc.setFont('helvetica','bold');
    tc(doc, d.profit>=0?GREEN:RED);
    doc.text(`${d.profit>=0?'+':''}$${f(d.profit)}`, cols[5].x, ty+4);
    doc.setFont('helvetica','normal'); tc(doc,SLATE);
    doc.text(new Date(d.closeTime).toLocaleDateString('en-GB'), cols[6].x, ty+4);
    st(doc,DIVIDER); doc.setLineWidth(0.1); doc.line(M,ty+6,W-M,ty+6);
    ty = Math.min(ty+7, H-24);
  });

  if(recent.length===0){
    doc.setFont('helvetica','normal'); doc.setFontSize(9); tc(doc,SLATE);
    doc.text('No closed trades in this period.', W/2, ty+12, {align:'center'});
  }

  // Certification
  const cy = H-44;
  fl(doc,LIGHT); st(doc,GOLD); doc.setLineWidth(0.5);
  doc.roundedRect(M, cy, W-2*M, 28, 2, 2, 'FD');
  doc.setFont('helvetica','bold'); doc.setFontSize(8.5); tc(doc,NAVY);
  doc.text('✓ CERTIFIED PERFORMANCE REPORT', W/2, cy+9, {align:'center'});
  doc.setFont('helvetica','normal'); doc.setFontSize(7); tc(doc,SLATE);
  doc.text(`Account: ${brokerName}  ·  Period: ${pLabel}  ·  Generated: ${date}`, W/2, cy+16, {align:'center'});
  doc.text(`Leverage: 1:${accountInfo.leverage}  ·  Currency: ${accountInfo.currency||'USD'}  ·  Positions: ${accountInfo.positionCount}`, W/2, cy+22, {align:'center'});

  ftr(doc, date);

  doc.save(`TradeGPT_Report_${period}_${new Date().toISOString().split('T')[0]}.pdf`);
}
