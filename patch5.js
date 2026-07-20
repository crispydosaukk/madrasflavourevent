const fs = require('fs');

let c = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

const presetArrayCode = `
export const PRESET_EXTRA_CHARGES = [
  { label: 'Extra Time Charge (Per Hour)', amount: 100 },
  { label: 'Indoor Screen Charge', amount: 150 },
  { label: 'Cleaning Charge', amount: 50 },
];
`;

c = c.replace(/const WHATSAPP_TERMS_TEXT = /g, presetArrayCode + '\nconst WHATSAPP_TERMS_TEXT = ');

const togglePresetCode = `
  const togglePresetExtraCharge = async (id: string, label: string, amount: number) => {
    const currentBooking = bookings.find(b => b.id === id);
    if (!currentBooking) return;
    
    let newExtraCharges = currentBooking.extraCharges || [];
    const exists = newExtraCharges.some(c => c.label === label);
    
    if (exists) {
      newExtraCharges = newExtraCharges.filter(c => c.label !== label);
    } else {
      newExtraCharges = [...newExtraCharges, { label, amount, isPreset: true }];
    }

    setBookings(prev => prev.map(b => b.id === id ? { ...b, extraCharges: newExtraCharges } : b));
    setSelectedBooking(prev => prev?.id === id ? { ...prev, extraCharges: newExtraCharges } : prev);

    try {
      await setDoc(doc(db, 'booking_requests', id), { extraCharges: newExtraCharges }, { merge: true });
      const bookingData = {
        ...currentBooking,
        extraCharges: newExtraCharges,
      };
      await addLogEntry(
        id,
        'system',
        'System',
        exists ? \`Removed extra charge: \${label}\` : \`Added extra charge: \${label}\`,
        \`Extra charge (\${label}) was \${exists ? 'removed from' : 'added to'} the booking.\`,
        bookingData,
        'activity'
      );
    } catch (error) {
      console.error('Error toggling preset extra charge:', error);
      alert('Error updating extra charges.');
    }
  };
`;

c = c.replace(/const addExtraCharge = async \(id: string\) => \{/, togglePresetCode + '\n  const addExtraCharge = async (id: string) => {');

const uiHtml = `
                  <details className="mt-3 bg-white border border-teal-200 rounded-lg group">
                    <summary className="px-3 py-2 text-sm font-semibold text-teal-700 cursor-pointer list-none flex justify-between items-center outline-none">
                      Add Standard Extra Charges
                      <Icon name="ChevronDownIcon" size={16} className="group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="p-3 border-t border-teal-100 flex flex-col gap-2">
                      {PRESET_EXTRA_CHARGES.map((preset, idx) => {
                        const isChecked = selectedBooking.extraCharges.some(c => c.label === preset.label);
                        return (
                          <label key={idx} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 hover:bg-gray-50 px-2 py-1.5 rounded-md transition-colors">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                              checked={isChecked}
                              onChange={() => togglePresetExtraCharge(selectedBooking.id, preset.label, preset.amount)}
                            />
                            <span className="flex-1">{preset.label}</span>
                            <span className="font-medium text-gray-900">+£{preset.amount}</span>
                          </label>
                        );
                      })}
                    </div>
                  </details>
`;

c = c.replace(/(<button onClick=\{.*?addExtraCharge\(selectedBooking.id\)\}[\s\S]*?<\/button>\s*<\/div>)/, '$1\n' + uiHtml);

fs.writeFileSync('src/app/admin/page.tsx', c, 'utf8');
