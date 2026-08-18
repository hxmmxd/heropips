import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

const CONNECTION_STRING = process.env.HISTORICAL_DB_URL || 'postgres://postgres:heropips_secure_pw_123@103.209.146.169:5432/historical_data';
const TABLE = 'xauusd_1m';
const START_YEAR = 2014;
const END_YEAR = 2027;
const SPREAD = 20; // 2.0 pips fixed spread

function padZero(num: number): string {
    return num < 10 ? '0' + num : num.toString();
}

async function runExporter() {
    console.log(`Starting MT5 Custom Symbol Export for ${TABLE} (${START_YEAR}-${END_YEAR})...`);
    
    const client = new Client({ connectionString: CONNECTION_STRING });
    await client.connect();
    
    const exportDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
    }
    
    const filePath = path.join(exportDir, 'XAUUSD_AI_1M.csv');
    // Header for MT5 standard
    fs.writeFileSync(filePath, '<DATE>,<TIME>,<OPEN>,<HIGH>,<LOW>,<CLOSE>,<TICKVOL>,<VOL>,<SPREAD>\n');

    let totalRows = 0;

    for (let year = START_YEAR; year < END_YEAR; year++) {
        console.log(`Exporting year ${year}...`);
        const chunkStart = `${year}-01-01`;
        const chunkEnd = `${year + 1}-01-01`;

        const res = await client.query(`
            SELECT time, open, high, low, close, volume
            FROM ${TABLE}
            WHERE time >= $1 AND time < $2
            ORDER BY time ASC
        `, [chunkStart, chunkEnd]);

        let chunkCsv = '';
        for (const row of res.rows) {
            const dateObj = new Date(row.time);
            
            // Extract raw UTC date parts to exactly match the AI Signal generated timestamps
            const yyyy = dateObj.getUTCFullYear();
            const mm = padZero(dateObj.getUTCMonth() + 1);
            const dd = padZero(dateObj.getUTCDate());
            const hh = padZero(dateObj.getUTCHours());
            const min = padZero(dateObj.getUTCMinutes());
            const ss = padZero(dateObj.getUTCSeconds());

            const dateStr = `${yyyy}.${mm}.${dd}`;
            const timeStr = `${hh}:${min}:${ss}`;

            // <DATE>,<TIME>,<OPEN>,<HIGH>,<LOW>,<CLOSE>,<TICKVOL>,<VOL>,<SPREAD>
            chunkCsv += `${dateStr},${timeStr},${row.open},${row.high},${row.low},${row.close},${Math.round(row.volume)},0,${SPREAD}\n`;
            totalRows++;
        }

        if (chunkCsv.length > 0) {
            fs.appendFileSync(filePath, chunkCsv);
        }
        
        if (global.gc) global.gc();
    }

    console.log(`\nExport Complete! Total Rows: ${totalRows}`);
    console.log(`Saved to: ${filePath}`);
    
    await client.end();
}

runExporter().catch(console.error);
