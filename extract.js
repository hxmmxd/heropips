const fs = require('fs');
const html = fs.readFileSync('public/design-system.html', 'utf8');
const scriptMatch = html.match(/<script>(.*?)<\/script>/s);
if (scriptMatch) {
  const scriptContent = scriptMatch[1];
  // The script probably defines an object like: const assets = { "id": "data:image/png;base64,..." };
  // Let's use regex to find all "data:..." strings associated with IDs.
  const regex = /"([^"]+)":"(data:image\/[^;]+;base64,[^"]+)"/g;
  let match;
  while ((match = regex.exec(scriptContent)) !== null) {
    const id = match[1];
    const dataUri = match[2];
    const extension = dataUri.match(/data:image\/([^;]+);/)[1] === 'svg+xml' ? 'svg' : dataUri.match(/data:image\/([^;]+);/)[1];
    
    // Interesting IDs:
    if (['9b76e87a-ba14-4495-bce5-9d679d35b884', '78d0f6d5-5d29-4927-8c8a-7905dd74a7e6', 'f2502d23-6eef-431f-8c88-ca54069180da'].includes(id)) {
      const base64Data = dataUri.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(`public/logos/${id}.${extension}`, base64Data, 'base64');
      console.log(`Saved ${id}.${extension}`);
    }
  }
} else {
  console.log("No script found");
}
