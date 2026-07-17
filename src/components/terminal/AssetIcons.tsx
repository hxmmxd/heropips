import React from 'react';

// Coin/Asset icons for analysis cards (larger versions of WatchIcon)
export function CoinIcon({ symbol }: { symbol: string }) {
  const s = symbol.toUpperCase();
  const sz = 32;
  const getType = (): string => {
    if (s.includes('XAU') || s.includes('GOLD')) return 'gold';
    if (s.includes('BTC') || s.includes('BITCOIN')) return 'btc';
    if (s.includes('ETH')) return 'eth';
    if (s.includes('EUR')) return 'eur';
    if (s.includes('GBP')) return 'gbp';
    if (s.includes('JPY')) return 'jpy';
    if (s.includes('NAS') || s.includes('NASDAQ')) return 'nasdaq';
    if (s.includes('US30') || s.includes('DOW')) return 'dow';
    if (s.includes('OIL') || s.includes('USO')) return 'oil';
    if (s.includes('SP') || s.includes('SPY')) return 'spy';
    return 'default';
  };
  const type = getType();

  switch (type) {
    case 'gold':
      return <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none"><path d="M4 20h16l-3-8H7L4 20z" fill="#FFD700"/><path d="M7 12h10l-2-6H9L7 12z" fill="#FFC107"/><path d="M9 6h6l-1.5-4h-3L9 6z" fill="#FFB300"/></svg>;
    case 'btc':
      return <svg width={sz} height={sz} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#F7931A"/><path d="M22.5 14.2c.3-2.1-1.3-3.2-3.4-4l.7-2.8-1.7-.4-.7 2.7c-.4-.1-.9-.2-1.4-.3l.7-2.7-1.7-.4-.7 2.8c-.4-.1-.7-.2-1-.2l-2.3-.6-.5 1.8s1.3.3 1.2.3c.7.2.8.6.8 1l-.8 3.3c0 .1.1.1.1.1l-.1 0-1.2 4.7c-.1.2-.3.5-.8.4 0 0-1.2-.3-1.2-.3l-.8 1.9 2.2.5c.4.1.8.2 1.2.3l-.7 2.8 1.7.4.7-2.8c.5.1.9.2 1.4.3l-.7 2.8 1.7.4.7-2.8c2.9.5 5.1.3 6-2.3.7-2.1-.04-3.3-1.5-4 1.1-.2 1.9-1.1 2.1-2.6zm-3.8 5.3c-.5 2.1-4.1 1-5.3.7l.9-3.8c1.1.3 4.9.8 4.4 3.1zm.5-5.4c-.5 1.9-3.5.9-4.4.7l.8-3.4c1 .2 4.1.7 3.6 2.7z" fill="#fff"/></svg>;
    case 'eth':
      return <svg width={sz} height={sz} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#627EEA"/><path d="M16.5 4v8.9l7.5 3.3L16.5 4z" fill="#fff" fillOpacity=".6"/><path d="M16.5 4L9 16.2l7.5-3.3V4z" fill="#fff"/><path d="M16.5 21.9v6.1l7.5-10.4-7.5 4.3z" fill="#fff" fillOpacity=".6"/><path d="M16.5 28V21.9L9 17.6l7.5 10.4z" fill="#fff"/><path d="M16.5 20.6l7.5-4.4-7.5-3.3v7.7z" fill="#fff" fillOpacity=".2"/><path d="M9 16.2l7.5 4.4v-7.7L9 16.2z" fill="#fff" fillOpacity=".5"/></svg>;
    case 'eur':
      return <svg width={sz} height={sz} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#003399"/><path d="M20.5 23.5c-1.2.6-2.5 1-3.9 1-3.8 0-7-2.5-8-6h8.5v-2h-9c0-.3-.1-.7-.1-1s0-.7.1-1h8.9v-2h-8.5c1-3.4 4.2-6 8-6 1.4 0 2.7.3 3.9 1l1.1-2c-1.5-.8-3.2-1.3-5-1.3-5.1 0-9.4 3.5-10.6 8.3H5v2h2.1c0 .3-.1.7-.1 1s0 .7.1 1H5v2h2.4c1.2 4.7 5.5 8.3 10.6 8.3 1.8 0 3.5-.4 5-1.3l-1.1-2z" fill="#fff" fillOpacity=".9"/></svg>;
    case 'gbp':
      return <svg width={sz} height={sz} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#1A237E"/><path d="M11 24v-2h2v-4h-2v-2h2c0-1.5-.3-2.8.5-4 .8-1.3 2.2-2 3.7-2 1.2 0 2.3.4 3.2 1.1l-1.2 1.8c-.6-.5-1.2-.7-1.9-.7-.7 0-1.3.3-1.6.8-.3.5-.3 1.3-.3 2h3.1v2h-3.1v4H21v2H11z" fill="#fff" fillOpacity=".9"/></svg>;
    case 'jpy':
      return <svg width={sz} height={sz} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#C62828"/><path d="M10 8l6 8 6-8h-2.8l-3.2 4.3L12.8 8H10zm1 12h3v4h4v-4h3v-2h-3v-1.5h3v-2h-2.3L16 18l-2.7-3.5H11v2h3V18h-3v2z" fill="#fff" fillOpacity=".9"/></svg>;
    case 'nasdaq':
      return <svg width={sz} height={sz} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#0D47A1"/><path d="M7 22l4-6 3 3 5-8 4 4" stroke="#4FC3F7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/><circle cx="23" cy="15" r="2" fill="#4FC3F7"/></svg>;
    case 'dow':
      return <svg width={sz} height={sz} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#1565C0"/><rect x="7" y="17" width="4" height="7" rx="1" fill="#90CAF9" opacity=".6"/><rect x="14" y="12" width="4" height="12" rx="1" fill="#90CAF9" opacity=".8"/><rect x="21" y="8" width="4" height="16" rx="1" fill="#90CAF9"/></svg>;
    case 'oil':
      return <svg width={sz} height={sz} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#212121"/><path d="M16 6s-6 8-6 13a6 6 0 0012 0c0-5-6-13-6-13z" fill="#424242" stroke="#757575" strokeWidth="1"/><path d="M16 10s-3.5 5-3.5 9a3.5 3.5 0 007 0c0-4-3.5-9-3.5-9z" fill="#616161"/></svg>;
    case 'spy':
      return <svg width={sz} height={sz} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#1B5E20"/><path d="M8 22l3.5-5 3 2.5 4-6 3 2 2.5-4" stroke="#66BB6A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/><circle cx="24" cy="11.5" r="2" fill="#66BB6A"/></svg>;
    default:
      return <svg width={sz} height={sz} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#424242"/><path d="M8 20l5-5 4 3 7-8" stroke="#aaa" strokeWidth="2" strokeLinecap="round" fill="none"/></svg>;
  }
}

// Watchlist icon SVGs (authentic brand logos)
export function WatchIcon({ type }: { type: string }) {
  const s = 14;
  switch (type) {
    case 'gold':
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M4 20h16l-3-8H7L4 20z" fill="#FFD700"/><path d="M7 12h10l-2-6H9L7 12z" fill="#FFC107"/><path d="M9 6h6l-1.5-4h-3L9 6z" fill="#FFB300"/></svg>;
    case 'btc':
      return <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#F7931A"/><path d="M22.5 14.2c.3-2.1-1.3-3.2-3.4-4l.7-2.8-1.7-.4-.7 2.7c-.4-.1-.9-.2-1.4-.3l.7-2.7-1.7-.4-.7 2.8c-.4-.1-.7-.2-1-.2l-2.3-.6-.5 1.8s1.3.3 1.2.3c.7.2.8.6.8 1l-.8 3.3c0 .1.1.1.1.1l-.1 0-1.2 4.7c-.1.2-.3.5-.8.4 0 0-1.2-.3-1.2-.3l-.8 1.9 2.2.5c.4.1.8.2 1.2.3l-.7 2.8 1.7.4.7-2.8c.5.1.9.2 1.4.3l-.7 2.8 1.7.4.7-2.8c2.9.5 5.1.3 6-2.3.7-2.1-.04-3.3-1.5-4 1.1-.2 1.9-1.1 2.1-2.6zm-3.8 5.3c-.5 2.1-4.1 1-5.3.7l.9-3.8c1.1.3 4.9.8 4.4 3.1zm.5-5.4c-.5 1.9-3.5.9-4.4.7l.8-3.4c1 .2 4.1.7 3.6 2.7z" fill="#fff"/></svg>;
    case 'eth':
      return <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#627EEA"/><path d="M16.5 4v8.9l7.5 3.3L16.5 4z" fill="#fff" fillOpacity=".6"/><path d="M16.5 4L9 16.2l7.5-3.3V4z" fill="#fff"/><path d="M16.5 21.9v6.1l7.5-10.4-7.5 4.3z" fill="#fff" fillOpacity=".6"/><path d="M16.5 28V21.9L9 17.6l7.5 10.4z" fill="#fff"/><path d="M16.5 20.6l7.5-4.4-7.5-3.3v7.7z" fill="#fff" fillOpacity=".2"/><path d="M9 16.2l7.5 4.4v-7.7L9 16.2z" fill="#fff" fillOpacity=".5"/></svg>;
    case 'eur':
      return <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#003399"/><path d="M20.5 23.5c-1.2.6-2.5 1-3.9 1-3.8 0-7-2.5-8-6h8.5v-2h-9c0-.3-.1-.7-.1-1s0-.7.1-1h8.9v-2h-8.5c1-3.4 4.2-6 8-6 1.4 0 2.7.3 3.9 1l1.1-2c-1.5-.8-3.2-1.3-5-1.3-5.1 0-9.4 3.5-10.6 8.3H5v2h2.1c0 .3-.1.7-.1 1s0 .7.1 1H5v2h2.4c1.2 4.7 5.5 8.3 10.6 8.3 1.8 0 3.5-.4 5-1.3l-1.1-2z" fill="#fff" fillOpacity=".9"/></svg>;
    case 'gbp':
      return <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#1A237E"/><path d="M11 24v-2h2v-4h-2v-2h2c0-1.5-.3-2.8.5-4 .8-1.3 2.2-2 3.7-2 1.2 0 2.3.4 3.2 1.1l-1.2 1.8c-.6-.5-1.2-.7-1.9-.7-.7 0-1.3.3-1.6.8-.3.5-.3 1.3-.3 2h3.1v2h-3.1v4H21v2H11z" fill="#fff" fillOpacity=".9"/></svg>;
    case 'jpy':
      return <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#C62828"/><path d="M10 8l6 8 6-8h-2.8l-3.2 4.3L12.8 8H10zm1 12h3v4h4v-4h3v-2h-3v-1.5h3v-2h-2.3L16 18l-2.7-3.5H11v2h3V18h-3v2z" fill="#fff" fillOpacity=".9"/></svg>;
    case 'nasdaq':
      return <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#0D47A1"/><path d="M7 22l4-6 3 3 5-8 4 4" stroke="#4FC3F7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/><circle cx="23" cy="15" r="2" fill="#4FC3F7"/></svg>;
    case 'dow':
      return <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#1565C0"/><rect x="7" y="17" width="4" height="7" rx="1" fill="#90CAF9" opacity=".6"/><rect x="14" y="12" width="4" height="12" rx="1" fill="#90CAF9" opacity=".8"/><rect x="21" y="8" width="4" height="16" rx="1" fill="#90CAF9"/></svg>;
    case 'oil':
      return <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#212121"/><path d="M16 6s-6 8-6 13a6 6 0 0012 0c0-5-6-13-6-13z" fill="#424242" stroke="#757575" strokeWidth="1"/><path d="M16 10s-3.5 5-3.5 9a3.5 3.5 0 007 0c0-4-3.5-9-3.5-9z" fill="#616161"/></svg>;
    case 'spy':
      return <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#1B5E20"/><path d="M8 22l3.5-5 3 2.5 4-6 3 2 2.5-4" stroke="#66BB6A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/><circle cx="24" cy="11.5" r="2" fill="#66BB6A"/></svg>;
    default:
      return <svg width={s} height={s} viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#424242"/><path d="M8 20l5-5 4 3 7-8" stroke="#aaa" strokeWidth="2" strokeLinecap="round" fill="none"/></svg>;
  }
}
