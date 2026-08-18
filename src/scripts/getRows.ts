import { Client } from 'pg';

const CONNECTION_STRING = 'postgres://postgres:heropips_secure_pw_123@103.209.146.169:5432/historical_data';

async function getRows() {
  const client = new Client({ connectionString: CONNECTION_STRING });
  try {
    await client.connect();
    console.log("Connected. Counting rows for each table...");
    
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name LIKE 'xauusd_%'
      ORDER BY table_name
    `);
    
    const results = [];
    
    for (const row of tablesRes.rows) {
      process.stdout.write(`Counting ${row.table_name}... `);
      const countRes = await client.query(`SELECT COUNT(*) as exact_count FROM ${row.table_name}`);
      const count = countRes.rows[0].exact_count;
      console.log(count);
      
      results.push({
        Table: row.table_name,
        Rows: parseInt(count, 10).toLocaleString()
      });
    }
    
    console.log("\nSummary:");
    console.table(results);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

getRows();
