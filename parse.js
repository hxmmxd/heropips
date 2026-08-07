const fs = require('fs');
const zlib = require('zlib');
const html = fs.readFileSync('public/design-system.html', 'utf8');

const manifestMatch = html.match(/<script type="__bundler\/manifest">\s*(\{[\s\S]*?\})\s*<\/script>/);
if (manifestMatch) {
  const manifest = JSON.parse(manifestMatch[1]);
  
  const targetIds = ['9b76e87a-ba14-4495-bce5-9d679d35b884', '78d0f6d5-5d29-4927-8c8a-7905dd74a7e6', 'f2502d23-6eef-431f-8c88-ca54069180da'];
  
  for (const [key, value] of Object.entries(manifest)) {
    if (targetIds.includes(key)) {
      if (value.mime === 'image/svg+xml' && value.compressed && value.data) {
        const buffer = Buffer.from(value.data, 'base64');
        const unzipped = zlib.gunzipSync(buffer).toString('utf8');
        fs.writeFileSync(`public/logos/${key}.svg`, unzipped, 'utf8');
        console.log(`Saved public/logos/${key}.svg`);
      }
    }
  }
}
