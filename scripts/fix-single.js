const fs = require('fs');
const path = require('path');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.name === 'route.ts') {
      let content = fs.readFileSync(full, 'utf8');
      const orig = content;
      const oldStr = ".from('staff_users').select('role').eq('id', session.user.id).single()";
      const newStr = ".from('staff_users').select('role').eq('id', session.user.id).maybeSingle()";
      content = content.replaceAll(oldStr, newStr);
      if (content !== orig) {
        fs.writeFileSync(full, content);
        console.log('Fixed:', full);
      }
    }
  }
}
walk('app/api');
console.log('Done');
