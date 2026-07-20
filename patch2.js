const fs = require('fs');
let c = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

c = c.replace(/\\n\\nPlease reply with your selection! 🙏`\)\}/g, '\\n\\n\${WHATSAPP_TERMS_TEXT}\\n\\nPlease reply with your selection! 🙏`)}');
c = c.replace(/\\n\\nPlease let us know if this summary is correct\. Once you confirm, we will send our bank details for the deposit payment! 🙏`\);/g, '\\n\\n\${WHATSAPP_TERMS_TEXT}\\n\\nPlease let us know if this summary is correct. Once you confirm, we will send our bank details for the deposit payment! 🙏`);');

fs.writeFileSync('src/app/admin/page.tsx', c, 'utf8');
