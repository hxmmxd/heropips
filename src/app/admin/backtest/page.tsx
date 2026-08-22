'use client';

import React, { useState, useEffect } from 'react';
import { Play, TrendingUp, TrendingDown, DollarSign, Activity, AlertTriangle, FileText, BarChart2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export default function BacktestPage() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'archives'>('simulator');
  
  // Simulator State
  const [loading, setLoading] = useState(false);
  const [params, setParams] = useState({
    symbol: 'EUR/USD',
    timeframe: '1h',
    initialBalance: 10000,
    preset: 'full_15_gates',
    riskPercent: 1.5,
    startDate: '',
    endDate: '',
    minConfluence: 50,
    spreadPips: 1.5,
  });
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Archives State
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [loadingReports, setLoadingReports] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);

  // Fetch reports list on mount
  useEffect(() => {
    if (activeTab === 'archives' && reports.length === 0) {
      fetchReports();
    }
  }, [activeTab]);

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const res = await fetch('/api/backtest/reports');
      const data = await res.json();
      setReports(data.reports || []);
    } catch (err) {
      console.error('Failed to fetch reports', err);
    } finally {
      setLoadingReports(false);
    }
  };

  const loadReport = async (id: string) => {
    setLoadingReports(true);
    try {
      const res = await fetch(`/api/backtest/reports/${id}`);
      const data = await res.json();
      setSelectedReport(data);
      
      // Generate equity curve data
      let balance = 10000; // default assumption for chart if not specified
      if (data.trades && data.trades.length > 0) {
         // rough estimation to back-calculate initial balance if we wanted, but let's just plot cumulative PnL
         let currentPnL = 0;
         const curve = data.trades.filter((t: any) => t.status === 'WIN' || t.status === 'LOSS').map((t: any, index: number) => {
           currentPnL += t.pnl;
           return {
             index,
             time: new Date(t.exitTime || t.triggerTime).toLocaleDateString(),
             pnl: currentPnL
           };
         });
         setChartData(curve);
      }
    } catch (err) {
      console.error('Failed to load report', err);
    } finally {
      setLoadingReports(false);
    }
  };

  const runBacktest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      // Clean up empty dates before sending
      const payload = { ...params };
      if (!payload.startDate) delete (payload as any).startDate;
      if (!payload.endDate) delete (payload as any).endDate;
      else {
        // append time to end date so it includes the whole day
        (payload as any).endDate = payload.endDate + 'T23:59:59Z';
      }
      if (payload.startDate) {
        (payload as any).startDate = payload.startDate + 'T00:00:00Z';
      }

      const res = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to run backtest');
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
              12-Gate Confluence Backtester
            </h1>
            <p className="text-gray-400 mt-2">Simulate historical performance or review deep CLI scans.</p>
          </div>
          
          <div className="flex bg-white/5 border border-white/10 rounded-lg p-1">
            <button 
              onClick={() => setActiveTab('simulator')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'simulator' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Live Simulator
            </button>
            <button 
              onClick={() => setActiveTab('archives')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'archives' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Deep Scan Archives
            </button>
          </div>
        </div>
        
        {activeTab === 'simulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Configuration Panel */}
            <div className="col-span-1 bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
              <h2 className="text-xl font-semibold border-b border-white/10 pb-4">Configuration</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Symbol</label>
                  <input type="text" value={params.symbol} onChange={(e) => setParams({ ...params, symbol: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Timeframe</label>
                  <select value={params.timeframe} onChange={(e) => setParams({ ...params, timeframe: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500">
                    <option value="1m">1m</option>
                    <option value="5m">5m</option>
                    <option value="15m">15m</option>
                    <option value="1h">1h</option>
                    <option value="4h">4h</option>
                    <option value="1d">1d</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Start Date</label>
                    <input type="date" value={params.startDate} onChange={(e) => setParams({ ...params, startDate: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">End Date</label>
                    <input type="date" value={params.endDate} onChange={(e) => setParams({ ...params, endDate: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm text-gray-400">Min Confluence %</label>
                    <span className="text-xs font-bold text-blue-400">{params.minConfluence || 50}%</span>
                  </div>
                  <input type="range" min="0" max="100" step="5" value={params.minConfluence || 50} onChange={(e) => setParams({ ...params, minConfluence: Number(e.target.value) })} className="w-full accent-blue-500" />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm text-gray-400">Spread Penalty (Pips)</label>
                    <span className="text-xs font-bold text-red-400">{params.spreadPips !== undefined ? params.spreadPips : 1.5}</span>
                  </div>
                  <input type="range" min="0" max="10" step="0.1" value={params.spreadPips !== undefined ? params.spreadPips : 1.5} onChange={(e) => setParams({ ...params, spreadPips: Number(e.target.value) })} className="w-full accent-red-500" />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Strategy Preset</label>
                  <select value={params.preset} onChange={(e) => setParams({ ...params, preset: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500">
                    <option value="full_15_gates">15-Gate Quant Consensus</option>
                    <option value="tech_only">12 Technical Gates Only</option>
                    <option value="smc_only">Pure SMC Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Initial Balance ($)</label>
                  <input type="number" value={params.initialBalance} onChange={(e) => setParams({ ...params, initialBalance: Number(e.target.value) })} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Risk Per Trade (%)</label>
                  <input type="number" step="0.1" value={params.riskPercent} onChange={(e) => setParams({ ...params, riskPercent: Number(e.target.value) })} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <button onClick={runBacktest} disabled={loading} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-xl transition-all disabled:opacity-50">
                {loading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white"></div> : <><Play size={18} /> Run Backtest</>}
              </button>
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 flex items-start gap-2 text-sm">
                  <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}
            </div>
            
            {/* Results Panel */}
            <div className="col-span-1 lg:col-span-3 space-y-6">
              {!result && !loading && (
                <div className="h-full flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-2xl p-12 text-center text-gray-500">
                  <Activity size={48} className="mb-4 opacity-50" />
                  <h3 className="text-xl font-medium text-white mb-2">Ready to Simulate</h3>
                  <p className="max-w-md">Configure your parameters on the left and hit Run Backtest to evaluate the 12-Gate Engine against historical data.</p>
                </div>
              )}
              
              {result && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                      <div className="text-gray-400 text-sm mb-1 flex items-center gap-2"><DollarSign size={14} /> Total Return</div>
                      <div className={`text-2xl font-bold ${result.totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {result.totalReturn > 0 ? '+' : ''}{result.totalReturn.toFixed(2)}%
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Final: ${result.finalBalance.toFixed(2)}</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                      <div className="text-gray-400 text-sm mb-1 flex items-center gap-2"><Activity size={14} /> Win Rate</div>
                      <div className="text-2xl font-bold text-white">{result.winRate.toFixed(1)}%</div>
                      <div className="text-xs text-gray-500 mt-1">Out of {result.totalTrades} trades</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                      <div className="text-gray-400 text-sm mb-1 flex items-center gap-2"><TrendingDown size={14} /> Max Drawdown</div>
                      <div className="text-2xl font-bold text-red-400">-{result.maxDrawdown.toFixed(2)}%</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                      <div className="text-gray-400 text-sm mb-1 flex items-center gap-2"><Activity size={14} /> Avg R:R</div>
                      <div className="text-2xl font-bold text-blue-400">
                        1 : {(result.averageRR || 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                      <div className="text-gray-400 text-sm mb-1 flex items-center gap-2"><Activity size={14} /> Trades/Day</div>
                      <div className="text-2xl font-bold text-purple-400">
                        {(result.tradesPerDay || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-white/10 bg-white/5"><h3 className="font-semibold text-lg">Trade Ledger</h3></div>
                    <div className="overflow-auto max-h-[600px] relative">
                      <table className="w-full text-left text-sm">
                        <thead className="text-gray-400 bg-[#111111] sticky top-0 z-10 shadow-md">
                          <tr>
                            <th className="px-4 py-3">ID</th>
                            <th className="px-4 py-3">Time</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Entry</th>
                            <th className="px-4 py-3">Exit</th>
                            <th className="px-4 py-3">PnL</th>
                            <th className="px-4 py-3">Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {result.trades.map((trade: any) => (
                            <tr key={trade.id} className="hover:bg-white/5 transition-colors">
                              <td className="px-4 py-3 text-gray-400">#{trade.id}</td>
                              <td className="px-4 py-3">
                                <div className="flex flex-col">
                                  <span>{trade.openTime ? new Date(trade.openTime).toLocaleString() : 'Pending'}</span>
                                  {trade.closeTime && <span className="text-xs text-gray-500">→ {new Date(trade.closeTime).toLocaleString()}</span>}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${trade.direction === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{trade.direction}</span>
                              </td>
                              <td className="px-4 py-3 font-mono text-gray-300">{trade.entryPrice || trade.orderPrice}</td>
                              <td className="px-4 py-3">
                                <div className="flex flex-col text-xs font-mono">
                                  <span className="text-emerald-400">TP: {trade.takeProfit}</span>
                                  <span className="text-red-400">SL: {trade.stopLoss}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {trade.status.startsWith('CLOSED') ? (
                                  <div className={`flex items-center gap-1 font-medium ${trade.pnl > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {trade.pnl > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}${Math.abs(trade.pnl).toFixed(2)}
                                  </div>
                                ) : (
                                  <span className="text-amber-400 flex items-center gap-1"><Activity size={14} /> OPEN</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate" title={trade.reason}>{trade.reason}</td>
                            </tr>
                          ))}
                          {result.trades.length === 0 && (
                            <tr>
                              <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No trades generated during this period. Try adjusting the parameters.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'archives' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="col-span-1 bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4 h-[calc(100vh-200px)] overflow-y-auto">
              <div className="flex flex-col gap-3 px-2 mb-4">
                <h2 className="text-lg font-semibold">Generated Reports</h2>
                <button 
                  onClick={async () => {
                    const btn = document.getElementById('gen-mt5-btn');
                    if (btn) btn.innerHTML = '<span class="animate-pulse">Starting...</span>';
                    await fetch('/api/admin/run-deep-scan', { method: 'POST' });
                    setTimeout(() => {
                      if (btn) btn.innerHTML = 'Generate New MT5 Signals';
                      alert('Deep scan started in the background on Utho. It takes ~30-60 seconds. Refresh the page after a minute to see the new report!');
                    }, 1000);
                  }}
                  id="gen-mt5-btn"
                  className="w-full text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Generate New MT5 Signals
                </button>
              </div>
              {loadingReports && !reports.length && <div className="p-4 text-center text-gray-500">Loading...</div>}
              {reports.map((report) => (
                <div 
                  key={report.id} 
                  onClick={() => loadReport(report.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedReport?.summary === report.summary ? 'bg-blue-600/20 border-blue-500' : 'bg-white/5 border-white/10 hover:border-white/30'}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={16} className={selectedReport?.summary === report.summary ? 'text-blue-400' : 'text-gray-400'} />
                    <span className="font-medium text-sm truncate">{report.filename}</span>
                  </div>
                  <div className="text-xs text-gray-400 mb-3">{new Date(report.createdAt).toLocaleString()}</div>
                  {report.summary && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-black/30 p-2 rounded">
                        <div className="text-gray-500">Return</div>
                        <div className={report.summary.totalReturn?.startsWith('-') ? 'text-red-400' : 'text-emerald-400'}>{report.summary.totalReturn}</div>
                      </div>
                      <div className="bg-black/30 p-2 rounded">
                        <div className="text-gray-500">Win Rate</div>
                        <div className="text-white">{report.summary.winRate}</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {reports.length === 0 && !loadingReports && (
                <div className="text-center p-6 text-sm text-gray-500">
                  No deep scan reports found. Run `npm run backtest:deep` to generate one.
                </div>
              )}
            </div>
            
            <div className="col-span-1 lg:col-span-3 space-y-6">
              {!selectedReport && (
                <div className="h-full flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-2xl p-12 text-center text-gray-500">
                  <BarChart2 size={48} className="mb-4 opacity-50" />
                  <h3 className="text-xl font-medium text-white mb-2">Select a Report</h3>
                  <p className="max-w-md">Click a report on the left to view the massive equity curve and trade ledger from your CLI scans.</p>
                </div>
              )}
              
              {selectedReport && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <div className="text-gray-400 text-xs mb-1">Period</div>
                      <div className="text-sm font-medium">{selectedReport.summary?.period || '-'}</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <div className="text-gray-400 text-xs mb-1">Symbol</div>
                      <div className="text-sm font-medium">{selectedReport.summary?.symbol || '-'}</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <div className="text-gray-400 text-xs mb-1">Trades</div>
                      <div className="text-sm font-medium">{selectedReport.summary?.executedTrades || 0}</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <div className="text-gray-400 text-xs mb-1">Win Rate</div>
                      <div className="text-sm font-medium">{selectedReport.summary?.winRate || '-'}</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <div className="text-gray-400 text-xs mb-1">Net Return</div>
                      <div className={`text-sm font-bold ${selectedReport.summary?.totalReturn?.startsWith('-') ? 'text-red-400' : 'text-emerald-400'}`}>
                        {selectedReport.summary?.totalReturn || '-'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h3 className="font-semibold text-lg mb-6">Cumulative PnL Curve</h3>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                          <XAxis dataKey="index" stroke="#ffffff50" tick={{fontSize: 12}} tickFormatter={(val: any) => `#${val}`} />
                          <YAxis stroke="#ffffff50" tick={{fontSize: 12}} tickFormatter={(val: any) => `$${val}`} />
                          <RechartsTooltip 
                            contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }}
                            itemStyle={{ color: '#fff' }}
                            formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Cumulative PnL']}
                            labelFormatter={(label, payload) => payload?.[0]?.payload?.time || label}
                          />
                          <Line type="monotone" dataKey="pnl" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 6, fill: '#3b82f6' }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                      <h3 className="font-semibold text-lg">Trade Ledger ({selectedReport.trades?.length || 0})</h3>
                      <span className="text-xs text-gray-500">Scroll to view all</span>
                    </div>
                    <div className="overflow-x-auto max-h-96">
                      <table className="w-full text-left text-sm relative">
                        <thead className="text-gray-400 bg-black/80 sticky top-0 backdrop-blur-md">
                          <tr>
                            <th className="px-4 py-3">ID</th>
                            <th className="px-4 py-3">Time</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Entry</th>
                            <th className="px-4 py-3">Exit</th>
                            <th className="px-4 py-3">PnL</th>
                            <th className="px-4 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {selectedReport.trades?.map((trade: any) => (
                            <tr key={trade.id} className="hover:bg-white/5 transition-colors">
                              <td className="px-4 py-3 text-gray-400">#{trade.id}</td>
                              <td className="px-4 py-3">
                                <div className="flex flex-col">
                                  <span>{trade.entryTime ? new Date(trade.entryTime).toLocaleString() : 'Pending'}</span>
                                  {trade.exitTime && <span className="text-xs text-gray-500">→ {new Date(trade.exitTime).toLocaleString()}</span>}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${trade.direction === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{trade.direction}</span>
                              </td>
                              <td className="px-4 py-3 font-mono text-gray-300">{trade.orderPrice}</td>
                              <td className="px-4 py-3 font-mono text-gray-300">{trade.exitPrice || '-'}</td>
                              <td className="px-4 py-3">
                                {trade.status === 'WIN' || trade.status === 'LOSS' ? (
                                  <div className={`flex items-center gap-1 font-medium ${trade.pnl > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    ${Math.abs(trade.pnl).toFixed(2)}
                                  </div>
                                ) : (
                                  <span className="text-gray-500">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-xs font-semibold ${trade.status === 'WIN' ? 'text-emerald-400' : trade.status === 'LOSS' ? 'text-red-400' : 'text-gray-400'}`}>
                                  {trade.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
