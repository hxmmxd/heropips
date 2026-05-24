import sys
import json
import pandas as pd
import numpy as np

def calculate_indicators(candles):
    if len(candles) < 50:
        return {
            "price": 0,
            "rsi": None,
            "macd": None,
            "ema50": None,
            "atr": None
        }

    # Load candles into DataFrame
    df = pd.DataFrame(candles)
    df['open'] = df['open'].astype(float)
    df['high'] = df['high'].astype(float)
    df['low'] = df['low'].astype(float)
    df['close'] = df['close'].astype(float)

    # 1. Price
    current_price = float(df['close'].iloc[-1])

    # 2. RSI (14)
    delta = df['close'].diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    
    # Wilder's smoothing (RSI standard)
    avg_gain = gain.ewm(alpha=1/14, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1/14, adjust=False).mean()
    
    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi_series = 100 - (100 / (1 + rs))
    rsi_series = rsi_series.fillna(50) # Neutral default
    rsi = float(rsi_series.iloc[-1])

    # 3. MACD (12, 26, 9)
    ema12 = df['close'].ewm(span=12, adjust=False).mean()
    ema26 = df['close'].ewm(span=26, adjust=False).mean()
    macd_line = ema12 - ema26
    signal_line = macd_line.ewm(span=9, adjust=False).mean()
    histogram = macd_line - signal_line
    
    macd_data = {
        "value": float(macd_line.iloc[-1]),
        "signal": float(signal_line.iloc[-1]),
        "histogram": float(histogram.iloc[-1])
    }

    # 4. EMA50
    ema50_series = df['close'].ewm(span=50, adjust=False).mean()
    ema50 = float(ema50_series.iloc[-1])

    # 5. ATR (14)
    hl = df['high'] - df['low']
    hpc = (df['high'] - df['close'].shift(1)).abs()
    lpc = (df['low'] - df['close'].shift(1)).abs()
    
    tr = pd.concat([hl, hpc, lpc], axis=1).max(axis=1)
    atr_series = tr.ewm(alpha=1/14, adjust=False).mean()
    atr = float(atr_series.iloc[-1]) if not pd.isna(atr_series.iloc[-1]) else float(hl.iloc[-1])

    return {
        "price": current_price,
        "rsi": rsi,
        "macd": macd_data,
        "ema50": ema50,
        "atr": atr
    }

if __name__ == "__main__":
    try:
        # Read JSON from stdin
        input_data = sys.stdin.read()
        candles_list = json.loads(input_data)
        
        result = calculate_indicators(candles_list)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)
