const fs = require('fs');
const path = require('path');
const dir = path.join(process.cwd(), 'examples/react-live-demo/src/components');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));
for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/===\s*'validating'/g, "=== 'checking_ai'");
  content = content.replace(/validating:\s*'Analyzing…',/g, "checking_ai: 'Analyzing…',");
  fs.writeFileSync(filePath, content);
}
console.log('done');
