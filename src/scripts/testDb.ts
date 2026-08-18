import { Client } from 'pg';

const CONNECTION_STRING = 'postgres://postgres:heropips_secure_pw_123@103.209.146.169:5432/historical_data';

async function test() {
  const client = new Client({ connectionString: CONNECTION_STRING });
  try {
    await client.connect();
    console.log("Connected to DB.");
    
    // Check tables
    const tablesRes = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log("Tables:", tablesRes.rows.map(r => r.table_name).join(', '));
    
    // Test time_bucket aggregation
    const aggRes = await client.query(`
      SELECT 
        time_bucket('1 day', time) AS time,
        first(open, time) AS open,
        max(high) AS high,
        min(low) AS low,
        last(close, time) AS close,
        sum(volume) AS volume
      FROM xauusd_1m
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT 5
    `);
    console.log("Aggregated 1d rows:", aggRes.rows);
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

test();
