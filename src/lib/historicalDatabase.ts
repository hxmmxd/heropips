import { Client } from 'pg';
import { Candle } from './scanner';

const CONNECTION_STRING = process.env.HISTORICAL_DB_URL || 'postgres://postgres:heropips_secure_pw_123@103.209.146.169:5432/historical_data';

export async function fetchHistoricalCandlesPG(
  symbol: string,
  timeframe: string,
  limit: number = 1000,
  startDate?: string,
  endDate?: string
): Promise<Candle[]> {
  // Normalize symbol and timeframe to match table names (e.g., XAU/USD -> xauusd_1h)
  const cleanSymbol = symbol.toLowerCase().replace(/[^a-z0-9]/g, '');
  const tableName = `${cleanSymbol}_${timeframe.toLowerCase()}`;

  const client = new Client({
    connectionString: CONNECTION_STRING,
  });

  try {
    await client.connect();

    // Ensure table name is safe to prevent SQL injection (basic check)
    if (!/^[a-z0-9_]+$/.test(tableName)) {
      throw new Error(`Invalid table name structure: ${tableName}`);
    }

    let dateFilter = '';
    const queryParams: any[] = [limit];
    let paramIndex = 2;

    if (startDate) {
      dateFilter += ` AND time >= $${paramIndex}`;
      queryParams.push(startDate);
      paramIndex++;
    }
    if (endDate) {
      dateFilter += ` AND time <= $${paramIndex}`;
      queryParams.push(endDate);
      paramIndex++;
    }

    const whereClause = dateFilter ? `WHERE 1=1 ${dateFilter}` : '';

    // Fetch oldest to newest by ordering by time DESC, limiting, then reversing in memory
    const query = `
      SELECT time, open, high, low, close, volume 
      FROM ${tableName}
      ${whereClause}
      ORDER BY time DESC
      LIMIT $1
    `;
    
    let res = await client.query(query, queryParams);
    
    // Fallback if materialized view is empty (not yet refreshed)
    if (res.rows.length === 0 && timeframe.toLowerCase() !== '1m') {
      const intervalMap: Record<string, string> = {
        '5m': '5 minutes',
        '15m': '15 minutes',
        '1h': '1 hour',
        '4h': '4 hours',
        '1d': '1 day'
      };
      const pgInterval = intervalMap[timeframe.toLowerCase()] || '1 hour'; // fallback
      const baseTableName = `${cleanSymbol}_1m`;
      
      const fallbackQueryParams: any[] = [pgInterval, limit];
      let fallbackDateFilter = '';
      let fbParamIndex = 3;

      if (startDate) {
        fallbackDateFilter += ` AND time >= $${fbParamIndex}`;
        fallbackQueryParams.push(startDate);
        fbParamIndex++;
      }
      if (endDate) {
        fallbackDateFilter += ` AND time <= $${fbParamIndex}`;
        fallbackQueryParams.push(endDate);
        fbParamIndex++;
      }
      const fbWhereClause = fallbackDateFilter ? `WHERE 1=1 ${fallbackDateFilter}` : '';

      const fallbackQuery = `
        SELECT 
          time_bucket($1::interval, time) AS time,
          first(open, time) AS open,
          max(high) AS high,
          min(low) AS low,
          last(close, time) AS close,
          sum(volume) AS volume
        FROM ${baseTableName}
        ${fbWhereClause}
        GROUP BY 1
        ORDER BY 1 DESC
        LIMIT $2
      `;
      res = await client.query(fallbackQuery, fallbackQueryParams);
    }
    
    // Reverse so it's chronologically ordered (oldest first) as expected by the engine
    const candles: Candle[] = res.rows.reverse().map((row: any) => ({
      time: new Date(row.time).toISOString(), // Ensure ISO string format
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      volume: row.volume ? Number(row.volume) : undefined
    }));

    return candles;
  } catch (err: any) {
    console.error('[Historical DB Error]', err);
    throw new Error(`Failed to fetch historical data from PG: ${err.message}`);
  } finally {
    await client.end();
  }
}
