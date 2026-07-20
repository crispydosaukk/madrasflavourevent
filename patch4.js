const fs = require('fs');
let c = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

c = c.replace(/\$\{WHATSAPP_TERMS_TEXT\}\\n\\n\$\{WHATSAPP_TERMS_TEXT\}/g, '${WHATSAPP_TERMS_TEXT}');
c = c.replace(/\$\{WHATSAPP_TERMS_TEXT\}\\n\\n\\n\$\{WHATSAPP_TERMS_TEXT\}/g, '${WHATSAPP_TERMS_TEXT}');

fs.writeFileSync('src/app/admin/page.tsx', c, 'utf8');
