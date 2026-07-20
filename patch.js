const fs = require('fs');
let c = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

// 1. Add Service Type
c = c.replace(/<span class="details-label">Event Type<\/span>\s*<span class="details-value">\$\{booking\.eventType \|\| 'N\/A'\}<\/span>\s*<\/div>/g, 
`<span class="details-label">Event Type</span>
              <span class="details-value">\${booking.eventType || 'N/A'}</span>
            </div>
            <div class="details-row">
              <span class="details-label">Service Type</span>
              <span class="details-value">\${booking.serviceType || 'Not Selected'}</span>
            </div>`);

// 2. Add Terms constant
const termsConst = `export const WHATSAPP_TERMS_TEXT = \`*Important Terms & Conditions:*
• AFTER TIME SLOT PER HOUR £100 WILL BE CHARGED EXTRA
• Regarding the venue if the total costs come below £600 there will be a hall charge same as an event price.
• If it's indoor the screen costs will be £150.
• For cleaning there will be a charge of £50.
• If it's indoor we won't provide any decoration; guests should hire by themselves.
• We provide table clothes, one designated Waiter for buffet service and tabletops.
• The hall capacity is 70 people; if there are more people we would setup the same setting outside with Gazebo and Marquee. There will be a separate charge for the setup based on the count of customers.\`;

export default function AdminPage() {`;

c = c.replace(/export default function AdminPage\(\) \{/, termsConst);

// 3. Add to Step 2 Message
c = c.replace(/Extras Available:\\\*\\[\s\S]*?Please reply with your selection!/g, (match) => {
    return match.replace(/Please reply with your selection!/, `\\n\${WHATSAPP_TERMS_TEXT}\\n\\nPlease reply with your selection!`);
});

// 4. Add to Step 3 Message
c = c.replace(/Deposit Required: \\\*£\\\$\\{booking\.deposit\.toLocaleString\(\)\}\\\*\\n\\nPlease let us know if this summary is correct/g, (match) => {
    return `Deposit Required: *£\${booking.deposit.toLocaleString()}*\\n\\n\${WHATSAPP_TERMS_TEXT}\\n\\nPlease let us know if this summary is correct`;
});

fs.writeFileSync('src/app/admin/page.tsx', c, 'utf8');
