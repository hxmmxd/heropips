const fs = require('fs');
const path = require('path');

try {
  const htmlPath = path.join(__dirname, '..', '12gates_demo.html');
  const content = fs.readFileSync(htmlPath, 'utf8');
  
  // Extract content between <script> and </script>
  const scriptRegex = /<script>([\s\S]*?)<\/script>/g;
  let match;
  let idx = 1;
  while ((match = scriptRegex.exec(content)) !== null) {
    const jsCode = match[1];
    try {
      // Validate by creating a new Function
      new Function(jsCode);
      console.log(`Script tag ${idx} is valid JavaScript.`);
    } catch (e) {
      console.error(`Syntax error in script tag ${idx}:`, e);
      process.exit(1);
    }
    idx++;
  }
  console.log("All scripts validated successfully.");
} catch (err) {
  console.error("Failed to validate:", err);
  process.exit(1);
}
