const { Client } = require('pg');

const CONNECTION_STRING = 'postgres://postgres:heropips_secure_pw_123@103.209.146.169:5432/historical_data';

async function getSchema() {
  const client = new Client({ connectionString: CONNECTION_STRING });
  try {
    await client.connect();
    console.log("Connected. Fetching tables...");
    
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    for (const row of tablesRes.rows) {
      console.log(`\nTable: ${row.table_name}`);
      const colsRes = await client.query(`
        SELECT column_name, data_type, character_maximum_length, is_nullable
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [row.table_name]);
      
      console.table(colsRes.rows);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

getSchema();
