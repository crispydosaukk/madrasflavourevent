const fs = require('fs');
let c = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

c = c.replace('Please let us know if this summary is correct. Once you confirm, we will send our bank details for the deposit payment!',
'${WHATSAPP_TERMS_TEXT}\\n\\nPlease let us know if this summary is correct. Once you confirm, we will send our bank details for the deposit payment!');

c = c.replace('Please reply with your selection!',
'\\n${WHATSAPP_TERMS_TEXT}\\n\\nPlease reply with your selection!');

fs.writeFileSync('src/app/admin/page.tsx', c, 'utf8');
