-- ============================================================
-- Risk Management Schema: Gates 13–15
-- Run this in your Supabase SQL Editor (Dashboard → SQL → New Query)
-- ============================================================

-- 1. Core Risk State Table
-- Tracks equity curve, daily loss, drawdown, and risk zone per account
CREATE TABLE IF NOT EXISTS portfolio_risk_states (
    account_id          VARCHAR(50) PRIMARY KEY,
    user_id             UUID NOT NULL,
    
    -- Equity tracking
    current_equity      NUMERIC(14, 2) NOT NULL DEFAULT 0,
    peak_equity         NUMERIC(14, 2) NOT NULL DEFAULT 0,
    daily_start_equity  NUMERIC(14, 2) NOT NULL DEFAULT 0,
    daily_start_balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
    
    -- Computed risk metrics (updated by Sentinel / pre-trade checks)
    daily_loss_pct      NUMERIC(6, 3) NOT NULL DEFAULT 0,
    drawdown_pct        NUMERIC(6, 3) NOT NULL DEFAULT 0,
    consecutive_losses  INT NOT NULL DEFAULT 0,
    consecutive_wins    INT NOT NULL DEFAULT 0,
    
    -- Gate 13: Equity Curve Protection
    equity_sma_50       NUMERIC(14, 2) DEFAULT NULL,
    equity_ema_20       NUMERIC(14, 2) DEFAULT NULL,
    ecp_status          VARCHAR(10) DEFAULT 'GREEN' CHECK (ecp_status IN ('GREEN', 'AMBER', 'RED')),
    
    -- Gate 14: Daily Circuit Breaker
    daily_tier          VARCHAR(10) DEFAULT 'NORMAL' CHECK (daily_tier IN ('NORMAL', 'CAUTION', 'WARNING', 'TERMINAL')),
    is_daily_halted     BOOLEAN DEFAULT FALSE,
    daily_halt_time     TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    
    -- Gate 15: Drawdown Governor
    drawdown_zone       VARCHAR(10) DEFAULT 'GREEN' CHECK (drawdown_zone IN ('GREEN', 'YELLOW', 'ORANGE', 'RED', 'BLACK')),
    recovery_wins       INT NOT NULL DEFAULT 0,
    is_trading_enabled  BOOLEAN DEFAULT TRUE,
    shutdown_time       TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    
    -- Portfolio heat
    portfolio_heat_pct  NUMERIC(6, 3) NOT NULL DEFAULT 0,
    
    -- Metadata
    trades_today        INT NOT NULL DEFAULT 0,
    last_updated        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Shadow Trades Table (Gate 13 RED mode — paper trades)
CREATE TABLE IF NOT EXISTS shadow_trades (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id          VARCHAR(50) NOT NULL,
    symbol              VARCHAR(20) NOT NULL,
    direction           VARCHAR(4) NOT NULL CHECK (direction IN ('BUY', 'SELL')),
    entry_price         NUMERIC(14, 6) NOT NULL,
    stop_loss           NUMERIC(14, 6),
    take_profit         NUMERIC(14, 6),
    theoretical_volume  NUMERIC(6, 2) NOT NULL,
    
    -- Outcome tracking
    exit_price          NUMERIC(14, 6) DEFAULT NULL,
    theoretical_pnl     NUMERIC(14, 2) DEFAULT NULL,
    status              VARCHAR(10) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'stopped')),
    
    -- Gate snapshot at time of signal
    gate_score          INT NOT NULL,
    signal_grade        VARCHAR(5) NOT NULL,
    confluence_pct      INT NOT NULL,
    
    opened_at           TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    closed_at           TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- 3. Daily Risk Reports
CREATE TABLE IF NOT EXISTS daily_risk_reports (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id          VARCHAR(50) NOT NULL,
    report_date         DATE NOT NULL,
    
    -- Equity snapshots
    start_equity        NUMERIC(14, 2) NOT NULL,
    end_equity          NUMERIC(14, 2) NOT NULL,
    high_water_mark     NUMERIC(14, 2) NOT NULL,
    low_water_mark      NUMERIC(14, 2) NOT NULL,
    
    -- Risk metrics
    max_daily_loss_pct  NUMERIC(6, 3) NOT NULL,
    max_drawdown_pct    NUMERIC(6, 3) NOT NULL,
    trades_executed     INT NOT NULL DEFAULT 0,
    trades_won          INT NOT NULL DEFAULT 0,
    trades_lost         INT NOT NULL DEFAULT 0,
    
    -- Gate statistics
    gate14_caution_hits INT DEFAULT 0,
    gate14_warning_hits INT DEFAULT 0,
    gate14_terminal_hit BOOLEAN DEFAULT FALSE,
    gate15_zone_reached VARCHAR(10) DEFAULT 'GREEN',
    
    -- P&L
    realized_pnl        NUMERIC(14, 2) NOT NULL DEFAULT 0,
    unrealized_pnl      NUMERIC(14, 2) NOT NULL DEFAULT 0,
    
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(account_id, report_date)
);

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_risk_states_user ON portfolio_risk_states(user_id);
CREATE INDEX IF NOT EXISTS idx_shadow_trades_account ON shadow_trades(account_id);
CREATE INDEX IF NOT EXISTS idx_shadow_trades_status ON shadow_trades(status);
CREATE INDEX IF NOT EXISTS idx_daily_reports_account ON daily_risk_reports(account_id, report_date);

-- 5. RLS Policies (Row Level Security)
ALTER TABLE portfolio_risk_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE shadow_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_risk_reports ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (used by backend)
CREATE POLICY "Service role full access" ON portfolio_risk_states
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON shadow_trades
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON daily_risk_reports
    FOR ALL USING (true) WITH CHECK (true);
