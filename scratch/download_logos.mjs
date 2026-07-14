import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logos = {
  metatrader5: 'https://logo.clearbit.com/metaquotes.net',
  tradingview: 'https://logo.clearbit.com/tradingview.com',
  binance: 'https://logo.clearbit.com/binance.com',
  bybit: 'https://logo.clearbit.com/bybit.com',
  ctrader: 'https://logo.clearbit.com/ctrader.com',
  primexm: 'https://logo.clearbit.com/primexm.com',
  matchtrader: 'https://logo.clearbit.com/match-trader.com'
};

const outputDir = path.join(__dirname, '../public/logos');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function download(name, url) {
  const outputPath = path.join(outputDir, `${name}.png`);
  console.log(`Downloading ${name} from ${url}...`);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);
    console.log(`Saved ${name}.png successfully.`);
  } catch (err) {
    console.error(`Failed to download ${name}:`, err.message);
  }
}

async function main() {
  for (const [name, url] of Object.entries(logos)) {
    await download(name, url);
  }
  console.log('All downloads finished.');
}

main();
