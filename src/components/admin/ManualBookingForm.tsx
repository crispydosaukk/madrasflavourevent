'use client';
import React, { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, doc, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function ManualBookingForm({ setCustomAlert, packages = [], extras = [], onBookingCreated, depositPercentage = 30, timeSlots = [], partyHallTimeSlots = [], outdoorTimeSlots = [], initialData, onUpdate, renderMenuSelectionUI, downloadInvoicePDF, downloadMenuPDF, onClose }: { setCustomAlert: any, packages?: any[], extras?: any[], onBookingCreated?: (booking: any) => void, depositPercentage?: number, timeSlots?: string[], partyHallTimeSlots?: string[], outdoorTimeSlots?: string[], initialData?: any, onUpdate?: (booking: any) => void, renderMenuSelectionUI?: () => React.ReactNode, downloadInvoicePDF?: (booking: any, isDeposit?: boolean) => void, downloadMenuPDF?: (booking: any) => void, onClose?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [depositPreview, setDepositPreview] = useState<string | null>(null);
  const [finalPreview, setFinalPreview] = useState<string | null>(null);
  const [internalId, setInternalId] = useState<string | null>(null);
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);
  const [form, setForm] = useState({
    name: initialData?.name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    eventType: initialData?.eventType || 'Wedding',
    serviceType: initialData?.serviceType || 'Party Hall Booking',
    date: initialData?.date || '',
    time: initialData?.timeOfDay || initialData?.time || '',
    guests: initialData?.guests?.toString() || '',
    notes: initialData?.message || initialData?.notes || '',
    package: initialData?.package || initialData?.selectedMenu || 'Classic Buffet',
    baseAmount: initialData?.baseAmount?.toString() || '',
    deposit: initialData?.deposit?.toString() || '',
    depositPaid: initialData?.depositPaid || false,
    finalPaymentPaid: initialData?.finalPaymentPaid || false,
    postCode: initialData?.postCode || '',
    address: initialData?.address || '',
    vatRate: initialData?.vatRate || 0,
    paymentProofDeposit: initialData?.paymentProofDeposit || '',
    paymentProofFinal: initialData?.paymentProofFinal || '',
    paymentMethodDeposit: initialData?.paymentMethodDeposit || 'Bank',
    paymentMethodFinal: initialData?.paymentMethodFinal || 'Bank',
    extraCharges: initialData?.extraCharges || [],
  });

  // Keep track of if we're in edit mode
  const isEditMode = !!initialData || !!internalId;
  const editingId = initialData?.id || internalId;
  const [viewMode, setViewMode] = useState<'form' | 'tracker'>(initialData ? 'tracker' : 'form');

  // Switch to tracker view automatically when booking is newly created
  useEffect(() => {
    if (internalId && !initialData) {
      setViewMode('tracker');
    }
  }, [internalId, initialData]);

  const handleFileUpload = async (file: File, type: 'deposit' | 'final') => {
    if (!editingId) return;
    try {
      setLoading(true);

      const reader = new FileReader();
      reader.readAsDataURL(file);
      await new Promise((resolve, reject) => {
        reader.onload = resolve;
        reader.onerror = reject;
      });

      const img = new window.Image();
      img.src = reader.result as string;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 800;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        // Add date stamp
        const dateText = `Uploaded: ${new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}`;
        ctx.font = 'bold 14px sans-serif';
        const textWidth = ctx.measureText(dateText).width;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(10, height - 34, textWidth + 20, 24);

        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'middle';
        ctx.fillText(dateText, 20, height - 22);
      }

      const url = canvas.toDataURL('image/jpeg', 0.7);

      setForm(prev => ({ ...prev, [type === 'deposit' ? 'paymentProofDeposit' : 'paymentProofFinal']: url }));
      
      // Auto-save the URL to firestore immediately
      await setDoc(doc(db, 'booking_requests', editingId), { 
        [type === 'deposit' ? 'paymentProofDeposit' : 'paymentProofFinal']: url,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      await setDoc(doc(db, 'bookings', editingId), { 
        [type === 'deposit' ? 'paymentProofDeposit' : 'paymentProofFinal']: url,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      if (onUpdate) {
        onUpdate({ ...initialData, [type === 'deposit' ? 'paymentProofDeposit' : 'paymentProofFinal']: url, id: editingId });
      }
      
    } catch (error) {
      console.error('Error uploading file:', error);
      setCustomAlert({ message: 'Error uploading screenshot.', type: 'error' });
      if (type === 'deposit') setDepositPreview(null);
      if (type === 'final') setFinalPreview(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const selectedPkg = packages.find(p => p.name === form.package);
    let base = 0;
    
    if (selectedPkg && selectedPkg.pricePerPerson && form.guests) {
      const guests = parseInt(form.guests) || 0;
      base = guests * selectedPkg.pricePerPerson;
    } else if (form.package === 'Outdoor Live Dosa Party') {
      const guests = parseInt(form.guests) || 0;
      let dosaPrice = 11.00;
      if (form.date) {
        const d = new Date(form.date);
        const day = d.getDay();
        if (day === 0 || day === 6) {
          dosaPrice = 12.00;
        }
      }
      base = guests * dosaPrice;
    } else {
      const selectedExtra = extras.find(e => e.name === form.package);
      if (selectedExtra && selectedExtra.price) {
        base = selectedExtra.price;
      } else {
        return;
      }
    }

    const dep = base > 0 ? Math.min(base, depositPercentage) : 0;
    
    setForm(prev => {
      // Don't auto-calculate if we are in edit mode to prevent overwriting saved values,
      // unless they are explicitly changing the package or guests after initial load.
      // But for simplicity, we can let it auto-calculate if base amount is empty.
      if (prev.baseAmount !== base.toString() || prev.deposit !== dep.toFixed(2)) {
        // If editing and they haven't manually changed the package/guests, maybe don't overwrite.
        // We'll trust the user to adjust if they want to.
        return {
          ...prev,
          baseAmount: base.toString(),
          deposit: dep.toFixed(2)
        };
      }
      return prev;
    });
  }, [form.package, form.guests, packages, extras, depositPercentage]);

  const handleSubmit = async (e?: React.FormEvent, directUpdates?: Partial<typeof form>) => {
    e?.preventDefault();
    const currentForm = directUpdates ? { ...form, ...directUpdates } : form;
    if (!currentForm.name || !currentForm.phone || !currentForm.date) {
      setCustomAlert({ message: 'Name, Phone, and Date are required.', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const bookingData = {
        name: currentForm.name,
        email: currentForm.email,
        phone: currentForm.phone,
        eventType: currentForm.eventType,
        serviceType: currentForm.serviceType,
        date: currentForm.date,
        timeOfDay: currentForm.time,
        guests: parseInt(currentForm.guests) || 0,
        message: currentForm.notes,
        package: currentForm.package,
        selectedMenu: currentForm.package,
        baseAmount: parseFloat(currentForm.baseAmount) || 0,
        deposit: parseFloat(currentForm.deposit) || 0,
        status: currentForm.finalPaymentPaid ? 'completed' : (currentForm.depositPaid ? 'deposit_confirmed' : 'new_enquiry'),
        depositPaid: currentForm.depositPaid,
        finalPaymentPaid: currentForm.finalPaymentPaid,
        postCode: currentForm.postCode,
        address: currentForm.address,
        vatRate: currentForm.vatRate,
        paymentProofDeposit: currentForm.paymentProofDeposit,
        paymentProofFinal: currentForm.paymentProofFinal,
        paymentMethodDeposit: currentForm.paymentMethodDeposit,
        paymentMethodFinal: currentForm.paymentMethodFinal,
        paymentMethodExtra: currentForm.paymentMethodFinal, // Extras are paid with final payment in manual booking
        extraCharges: currentForm.extraCharges,
        source: initialData?.source || 'direct_booking',
        ...(isEditMode ? { updatedAt: new Date().toISOString() } : { createdAt: new Date().toISOString() })
      };

      if (isEditMode && editingId) {
        // Update existing booking
        await setDoc(doc(db, 'booking_requests', editingId), bookingData, { merge: true });
        await setDoc(doc(db, 'bookings', editingId), bookingData, { merge: true });
        setCustomAlert({ message: 'Booking updated successfully!', type: 'success' });
        if (onUpdate) {
          onUpdate({ ...initialData, ...bookingData, id: editingId });
        }
      } else {
        // Add to booking_requests
        const docRef = await addDoc(collection(db, 'booking_requests'), bookingData);

        // Add to bookings
        await setDoc(doc(db, 'bookings', docRef.id), bookingData);

        setCustomAlert({ message: 'Manual booking created successfully!', type: 'success' });
        setInternalId(docRef.id);
        
        if (onBookingCreated) {
          onBookingCreated({ ...bookingData, id: docRef.id });
        }
      }
    } catch (error: any) {
      console.error(error);
      setCustomAlert({ message: `Error ${isEditMode ? 'updating' : 'creating'} booking: ${error.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 w-full">
      <div className="border-b border-gray-100 pb-4 mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Icon name={isEditMode ? "PencilIcon" : "PlusCircleIcon"} size={24} style={{ color: '#ED1C24' }} />
            {isEditMode ? 'Edit Direct Booking' : 'Direct Booking Entry'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {isEditMode ? 'Manage booking payments and status.' : 'Create a new booking manually from phone or walk-in.'}
          </p>
        </div>
        {isEditMode && (
          <button onClick={() => setViewMode(prev => prev === 'form' ? 'tracker' : 'form')} className="px-4 py-2 border rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors text-gray-700">
            {viewMode === 'form' ? 'View Summary & Tracker' : 'Edit Booking Details'}
          </button>
        )}
      </div>

      {viewMode === 'tracker' ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* 3-Step Tracker */}
          <div className="relative">
             <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -translate-y-1/2 rounded-full" />
             <div className="absolute top-1/2 left-0 h-1 rounded-full transition-all duration-500" style={{ width: form.finalPaymentPaid ? '100%' : form.depositPaid ? '50%' : '0%', background: 'linear-gradient(90deg, #ED1C24, #F5A623)' }} />
             
             <div className="relative flex justify-between">
               <div className="flex flex-col items-center">
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ring-4 ring-white transition-colors duration-300 bg-emerald-500 text-white`}>
                    <Icon name="CheckIcon" size={16} />
                 </div>
                 <div className="mt-2 text-xs font-bold text-gray-900">Create Booking</div>
               </div>
               
               <div className="flex flex-col items-center">
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ring-4 ring-white transition-colors duration-300 ${form.depositPaid ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white ring-amber-100 scale-110'}`}>
                    {form.depositPaid ? <Icon name="CheckIcon" size={16} /> : '2'}
                 </div>
                 <div className={`mt-2 text-xs font-bold ${form.depositPaid ? 'text-gray-900' : 'text-amber-600'}`}>Deposit Payment</div>
               </div>

               <div className="flex flex-col items-center">
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ring-4 ring-white transition-colors duration-300 ${form.finalPaymentPaid ? 'bg-emerald-500 text-white' : (form.depositPaid ? 'bg-amber-500 text-white ring-amber-100 scale-110' : 'bg-gray-200 text-gray-500')}`}>
                    {form.finalPaymentPaid ? <Icon name="CheckIcon" size={16} /> : '3'}
                 </div>
                 <div className={`mt-2 text-xs font-bold ${form.finalPaymentPaid ? 'text-gray-900' : (form.depositPaid ? 'text-amber-600' : 'text-gray-400')}`}>{form.finalPaymentPaid ? 'Final Payment' : (form.depositPaid ? 'Pending Final Payment' : 'Final Payment')}</div>
               </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Menu Summary */}
            <div className="p-5 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-4">
               <h3 className="font-bold text-gray-900 flex items-center gap-2">
                 <Icon name="ClipboardDocumentListIcon" size={18} style={{ color: '#ED1C24' }} />
                 Menu Selection & Details
               </h3>
               <div className="space-y-2">
                 <div className="flex justify-between text-sm">
                   <span className="text-gray-500">Service Type</span>
                   <span className="font-semibold text-gray-900 text-right">{form.serviceType || 'Not Selected'}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-gray-500">Selected Package</span>
                   <span className="font-semibold text-gray-900 text-right">{form.package}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-gray-500">Event Date</span>
                   <span className="font-semibold text-gray-900">{form.date} {form.time && `at ${form.time}`}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-gray-500">Number of Guests</span>
                   <span className="font-semibold text-gray-900">{form.guests} Guests</span>
                 </div>
                 {renderMenuSelectionUI && renderMenuSelectionUI()}
               </div>
            </div>

            {/* Payment Summary */}
            <div className="p-5 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-4">
               <h3 className="font-bold text-gray-900 flex items-center gap-2">
                 <Icon name="BanknotesIcon" size={18} style={{ color: '#ED1C24' }} />
                 Payment Summary
               </h3>
               <div className="space-y-2">
                 <div className="flex justify-between text-sm">
                   <span className="text-gray-500">Base Amount</span>
                   <span className="font-semibold text-gray-900">£{parseFloat(form.baseAmount || '0').toFixed(2)}</span>
                 </div>
                 {form.vatRate > 0 && (
                 <div className="flex justify-between text-sm">
                   <span className="text-gray-500">VAT ({form.vatRate}%)</span>
                   <span className="font-semibold text-gray-900">£{(parseFloat(form.baseAmount || '0') * (form.vatRate / 100)).toFixed(2)}</span>
                 </div>
                 )}
                 <div className="flex justify-between text-sm font-semibold pb-2 border-b border-gray-200">
                   <span className="text-gray-900">Total Payment</span>
                   <span className="text-gray-900">£{(parseFloat(form.baseAmount || '0') * (1 + form.vatRate / 100)).toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-sm pt-2">
                   <span className="text-gray-500">Deposit Due</span>
                   <span className="font-semibold text-gray-900">£{parseFloat(form.deposit || '0').toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-sm font-bold pt-1">
                   <span className="text-gray-900">Remaining Balance</span>
                   <span className="text-gray-900">£{form.finalPaymentPaid ? '0.00' : (((parseFloat(form.baseAmount || '0') * (1 + form.vatRate / 100)) - parseFloat(form.deposit || '0')) + form.extraCharges.reduce((sum: number, c: any) => sum + (c.amount || 0), 0)).toFixed(2)}</span>
                 </div>
               </div>

               <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
                 {/* Deposit Section */}
                 {!form.depositPaid ? (
                   <div className="w-full max-w-sm mx-auto space-y-4">
                     <div>
                       <label className="block text-xs font-bold mb-2 text-center text-gray-700 uppercase tracking-wide">Deposit Payment Method *</label>
                       <select
                         value={form.paymentMethodDeposit}
                         onChange={(e) => setForm({ ...form, paymentMethodDeposit: e.target.value })}
                         className="block w-full text-sm text-gray-700 px-4 py-2 border border-gray-200 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                       >
                         <option value="Bank">Bank Transfer</option>
                         <option value="Cash">Cash</option>
                         <option value="Online">Online / Card</option>
                       </select>
                     </div>
                     {!form.paymentProofDeposit && !depositPreview ? (
                       <div>
                         <label className="block text-xs font-bold mb-2 text-center text-gray-700 uppercase tracking-wide">Upload Deposit Screenshot *</label>
                         <input type="file" accept="image/*,.pdf" onChange={e => { 
                           if (e.target.files?.[0]) {
                             const file = e.target.files[0];
                             if (file.type.startsWith('image/')) setDepositPreview(URL.createObjectURL(file));
                             handleFileUpload(file, 'deposit'); 
                           }
                         }} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-white file:text-gray-700 hover:file:bg-gray-100 cursor-pointer border border-gray-200 rounded-lg" />
                       </div>
                     ) : (
                       <div className="flex flex-col items-center gap-2">
                         {depositPreview && !form.paymentProofDeposit ? (
                           <div className="flex flex-col items-center gap-2 w-full">
                             <div className="text-sm font-semibold text-amber-600 animate-pulse bg-amber-50 px-4 py-2 rounded-lg border border-amber-100 w-full text-center">Uploading screenshot...</div>
                             <img src={depositPreview} className="w-full h-auto max-h-48 object-contain border border-gray-200 rounded-lg opacity-50 bg-white" />
                           </div>
                         ) : (
                           <>
                             <div className="flex items-center justify-center gap-2 text-emerald-600 text-sm font-bold bg-emerald-50 px-4 py-3 rounded-lg border border-emerald-100 w-full">
                               <Icon name="CheckCircleIcon" size={18} /> Deposit Screenshot Uploaded
                             </div>
                             {(form.paymentProofDeposit?.startsWith('http') || form.paymentProofDeposit?.startsWith('data:image')) && (
                               <img src={form.paymentProofDeposit} alt="Deposit Proof" className="w-full h-auto max-h-48 object-contain border border-gray-200 rounded-lg shadow-sm bg-white" />
                             )}
                           </>
                         )}
                       </div>
                     )}
                   </div>
                 ) : (
                   <div className="w-full max-w-sm mx-auto">
                      <div className="flex flex-col items-center gap-2 mb-4">
                        <div className="flex items-center justify-center gap-2 text-emerald-600 text-sm font-bold bg-emerald-50 px-4 py-3 rounded-lg border border-emerald-100 w-full">
                          <Icon name="CheckCircleIcon" size={18} /> Deposit Screenshot Uploaded
                        </div>
                        {(form.paymentProofDeposit?.startsWith('http') || form.paymentProofDeposit?.startsWith('data:image')) && (
                          <img src={form.paymentProofDeposit} alt="Deposit Proof" className="w-full h-auto max-h-48 object-contain border border-gray-200 rounded-lg shadow-sm bg-white" />
                        )}
                      </div>
                   </div>
                 )}

                 {/* Final Payment Section */}
                 {form.depositPaid && !form.finalPaymentPaid ? (
                   <div className="w-full max-w-sm mx-auto mt-4 pt-4 border-t border-gray-100 space-y-4">
                     
                     {/* Extras Section */}
                     <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-3">
                       <label className="block text-xs font-bold text-amber-900 uppercase tracking-wide">Add Extra Charges</label>
                       {form.extraCharges.map((extra: any, idx: number) => (
                         <div key={idx} className="flex gap-2 items-center">
                           <input type="text" placeholder="Description" value={extra.label} onChange={e => {
                             const newExtras = [...form.extraCharges];
                             newExtras[idx].label = e.target.value;
                             setForm({ ...form, extraCharges: newExtras });
                           }} className="flex-1 text-sm border-gray-300 rounded px-2 py-1" />
                           <input type="number" placeholder="£ Amount" value={extra.amount || ''} onChange={e => {
                             const newExtras = [...form.extraCharges];
                             newExtras[idx].amount = parseFloat(e.target.value) || 0;
                             setForm({ ...form, extraCharges: newExtras });
                           }} className="w-20 text-sm border-gray-300 rounded px-2 py-1" />
                           <button type="button" onClick={() => {
                             const newExtras = form.extraCharges.filter((_: any, i: number) => i !== idx);
                             setForm({ ...form, extraCharges: newExtras });
                           }} className="text-red-500 hover:text-red-700">
                             <Icon name="TrashIcon" size={16} />
                           </button>
                         </div>
                       ))}
                       <button type="button" onClick={() => setForm({ ...form, extraCharges: [...form.extraCharges, { label: '', amount: 0 }] })} className="text-sm font-semibold text-amber-700 flex items-center gap-1 hover:text-amber-900">
                         <Icon name="PlusCircleIcon" size={16} /> Add Line Item
                       </button>
                       <div className="pt-2 border-t border-amber-200/50 flex justify-between font-bold text-amber-900">
                         <span>Total Extras Amount:</span>
                         <span>£{form.extraCharges.reduce((sum: number, c: any) => sum + (c.amount || 0), 0).toFixed(2)}</span>
                       </div>
                     </div>

                     <div>
                       <label className="block text-xs font-bold mb-2 text-center text-gray-700 uppercase tracking-wide">Final Payment Method *</label>
                       <select
                         value={form.paymentMethodFinal}
                         onChange={(e) => setForm({ ...form, paymentMethodFinal: e.target.value })}
                         className="block w-full text-sm text-gray-700 px-4 py-2 border border-gray-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                       >
                         <option value="Bank">Bank Transfer</option>
                         <option value="Cash">Cash</option>
                         <option value="Online">Online / Card</option>
                       </select>
                     </div>

                     {!form.paymentProofFinal && !finalPreview ? (
                       <div>
                         <label className="block text-xs font-bold mb-2 text-center text-gray-700 uppercase tracking-wide">Upload Final Payment Screenshot *</label>
                         <input type="file" accept="image/*,.pdf" onChange={e => { 
                           if (e.target.files?.[0]) {
                             const file = e.target.files[0];
                             if (file.type.startsWith('image/')) setFinalPreview(URL.createObjectURL(file));
                             handleFileUpload(file, 'final'); 
                           }
                         }} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-white file:text-gray-700 hover:file:bg-gray-100 cursor-pointer border border-gray-200 rounded-lg" />
                       </div>
                     ) : (
                       <div className="flex flex-col items-center gap-2">
                         {finalPreview && !form.paymentProofFinal ? (
                           <div className="flex flex-col items-center gap-2 w-full">
                             <div className="text-sm font-semibold text-amber-600 animate-pulse bg-amber-50 px-4 py-2 rounded-lg border border-amber-100 w-full text-center">Uploading screenshot...</div>
                             <img src={finalPreview} className="w-full h-auto max-h-48 object-contain border border-gray-200 rounded-lg opacity-50 bg-white" />
                           </div>
                         ) : (
                           <>
                             <div className="flex items-center justify-center gap-2 text-emerald-600 text-sm font-bold bg-emerald-50 px-4 py-3 rounded-lg border border-emerald-100 w-full">
                               <Icon name="CheckCircleIcon" size={18} /> Final Screenshot Uploaded
                             </div>
                             {(form.paymentProofFinal?.startsWith('http') || form.paymentProofFinal?.startsWith('data:image')) && (
                               <img src={form.paymentProofFinal} alt="Final Proof" className="w-full h-auto max-h-48 object-contain border border-gray-200 rounded-lg shadow-sm bg-white" />
                             )}
                           </>
                         )}
                       </div>
                     )}
                   </div>
                 ) : form.finalPaymentPaid ? (
                   <div className="w-full max-w-sm mx-auto mt-4 pt-4 border-t border-gray-100">
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center justify-center gap-2 text-emerald-600 text-sm font-bold bg-emerald-50 px-4 py-3 rounded-lg border border-emerald-100 w-full">
                          <Icon name="CheckCircleIcon" size={18} /> Final Screenshot Uploaded
                        </div>
                        {(form.paymentProofFinal?.startsWith('http') || form.paymentProofFinal?.startsWith('data:image')) && (
                          <img src={form.paymentProofFinal} alt="Final Proof" className="w-full h-auto max-h-48 object-contain border border-gray-200 rounded-lg shadow-sm bg-white" />
                        )}
                      </div>
                   </div>
                 ) : null}
               </div>
            </div>
          </div>

          {/* Action Area */}
          <div className="flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-2xl shadow-sm mt-4 gap-4">
             {!form.depositPaid ? (
               <div className="w-full flex flex-col items-center gap-3">
                 <button type="button" disabled={loading || !form.paymentProofDeposit} onClick={() => { setForm({...form, depositPaid: true}); handleSubmit(undefined, { depositPaid: true }); }} className="w-full text-white font-bold py-3.5 px-8 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-105 shadow-md disabled:opacity-50 disabled:hover:scale-100" style={{ background: 'linear-gradient(135deg, #ED1C24, #F5A623)' }} title={!form.paymentProofDeposit ? "Please upload a screenshot first" : ""}>
                    <Icon name="BanknotesIcon" size={20} />
                    {loading ? 'Updating...' : 'Mark Deposit as Paid & Continue'}
                 </button>
               </div>
             ) : !form.finalPaymentPaid ? (
               <div className="w-full flex flex-col items-center gap-3">
                 {downloadMenuPDF && initialData && (
                   <button type="button" onClick={() => downloadMenuPDF(initialData)} className="w-full flex items-center gap-1.5 text-sm font-semibold px-4 py-3 rounded-xl justify-center text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 shadow-sm transition-colors mb-2">
                     <Icon name="ArrowDownTrayIcon" size={18} />
                     Download Menu PDF
                   </button>
                 )}
                 {downloadInvoicePDF && initialData && (
                   <button type="button" onClick={() => downloadInvoicePDF(initialData, true)} className="w-full flex items-center gap-1.5 text-sm font-semibold px-4 py-3 rounded-xl justify-center text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 shadow-sm transition-colors mb-2">
                     <Icon name="ArrowDownTrayIcon" size={18} />
                     Download Deposit Invoice PDF
                   </button>
                 )}
                 <button type="button" disabled={loading} onClick={() => handleSubmit()} className="w-full text-gray-700 font-bold py-3.5 px-8 rounded-xl flex items-center justify-center gap-2 transition-all hover:bg-gray-50 border border-gray-300 shadow-sm disabled:opacity-50 mt-4 mb-2">
                    <Icon name="CheckIcon" size={20} />
                    {loading ? 'Saving...' : 'Save & Update Booking Details'}
                 </button>

                 <div className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Or complete final step:</div>

                 <button type="button" disabled={loading} onClick={async () => { 
                   setForm({...form, finalPaymentPaid: true}); 
                   await handleSubmit(undefined, { finalPaymentPaid: true }); 
                   setShowCompletionPopup(true); 
                 }} className="w-full text-white font-bold py-3.5 px-8 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-105 shadow-md disabled:opacity-50 disabled:hover:scale-100" style={{ background: 'linear-gradient(135deg, #ED1C24, #F5A623)' }} title={!form.paymentProofFinal ? "Please upload a screenshot first" : ""}>
                    <Icon name="CheckCircleIcon" size={20} />
                    {loading ? 'Updating...' : 'Submit Final Payment & Complete'}
                 </button>
               </div>
             ) : (
               <div className="w-full flex flex-col items-center gap-3">
                 <div className="text-emerald-600 font-bold flex flex-col items-center gap-2 mb-2">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Icon name="CheckCircleIcon" size={24} className="text-emerald-600" />
                    </div>
                    <div className="text-lg">Booking Completed & Fully Paid!</div>
                 </div>
                 {downloadMenuPDF && initialData && (
                   <button type="button" onClick={() => downloadMenuPDF(initialData)} className="w-full flex items-center gap-1.5 text-sm font-semibold px-4 py-3 rounded-xl justify-center text-blue-800 bg-white border border-blue-300 hover:bg-blue-50 shadow-sm transition-colors">
                     <Icon name="ArrowDownTrayIcon" size={18} />
                     Download Menu PDF
                   </button>
                 )}
                 {downloadInvoicePDF && initialData && (
                   <button type="button" onClick={() => downloadInvoicePDF(initialData, true)} className="w-full flex items-center gap-1.5 text-sm font-semibold px-4 py-3 rounded-xl justify-center text-amber-800 bg-white border border-amber-300 hover:bg-amber-50 shadow-sm transition-colors">
                     <Icon name="ArrowDownTrayIcon" size={18} />
                     Download Deposit Invoice PDF
                   </button>
                 )}
                 {downloadInvoicePDF && initialData && (
                   <button type="button" onClick={() => downloadInvoicePDF(initialData)} className="w-full flex items-center gap-1.5 text-sm font-semibold px-4 py-3 rounded-xl justify-center text-emerald-800 bg-white border border-emerald-300 hover:bg-emerald-50 shadow-sm transition-colors">
                     <Icon name="ArrowDownTrayIcon" size={18} />
                     Download Final Invoice PDF
                   </button>
                 )}
                 <button type="button" onClick={() => onClose && onClose()} className="w-full mt-2 flex items-center gap-1.5 text-sm font-bold px-4 py-3 rounded-xl justify-center text-gray-700 bg-gray-100 hover:bg-gray-200 shadow-sm transition-colors uppercase tracking-wide">
                   Close Event
                 </button>
               </div>
             )}
          </div>
        </div>
      ) : (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b pb-2">Customer Details</h3>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name *</label>
              <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ED1C24]" placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Phone Number *</label>
              <input type="tel" required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ED1C24]" placeholder="+44 7700 900000" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Email Address</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ED1C24]" placeholder="john@example.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Post Code *</label>
              <input type="text" required value={form.postCode} onChange={e => setForm({...form, postCode: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ED1C24]" placeholder="SW1A 1AA" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Address *</label>
              <input type="text" required value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ED1C24]" placeholder="Full Address" />
            </div>
          </div>

          {/* Event Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b pb-2">Event Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Event Type</label>
                <select value={form.eventType} onChange={e => setForm({...form, eventType: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ED1C24] bg-white">
                  <option>Wedding</option>
                  <option>Birthday</option>
                  <option>Corporate</option>
                  <option>Anniversary</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Service Type *</label>
                <select required value={form.serviceType} onChange={e => setForm({...form, serviceType: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ED1C24] bg-white">
                  <option value="">Select Service Type</option>
                  <option value="Party Hall Booking">In-House Party Hall Booking</option>
                  <option value="Outdoor Catering">Outdoor Catering (At your location)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Number of Guests</label>
                <input type="number" value={form.guests} onChange={e => setForm({...form, guests: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ED1C24]" placeholder="100" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Event Date *</label>
                <input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ED1C24]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Event Time</label>
                <select value={form.time} onChange={e => setForm({...form, time: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ED1C24] bg-white">
                  <option value="">Select time</option>
                  {(() => {
                    const activeSlots = form.serviceType === 'Party Hall Booking' && partyHallTimeSlots && partyHallTimeSlots.length > 0 ? partyHallTimeSlots : (form.serviceType === 'Outdoor Catering' && outdoorTimeSlots && outdoorTimeSlots.length > 0 ? outdoorTimeSlots : timeSlots);
                    return activeSlots.length > 0 ? activeSlots.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    )) : (
                      <>
                        <option value="Lunch (12:00pm - 4:00pm)">Lunch (12:00pm - 4:00pm)</option>
                        <option value="Dinner (6:00pm - 11:30pm)">Dinner (6:00pm - 11:30pm)</option>
                      </>
                    );
                  })()}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing & Package */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b pb-2">Pricing & Package</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Package / Menu</label>
              <select value={form.package} onChange={e => setForm({...form, package: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ED1C24] bg-white">
                <option value="">Select a package...</option>
                <optgroup label="── Outdoor Catering Packages ──">
                  {packages.map((pkg, i) => (
                    <option key={pkg.id || i} value={pkg.name}>{pkg.name}</option>
                  ))}
                </optgroup>
                <optgroup label="── Live Dosa Party ──">
                  <option value="Outdoor Live Dosa Party">Outdoor Live Dosa Party</option>
                </optgroup>
                <optgroup label="── Extras ──">
                  {extras.filter(extra => extra.name === 'Gazebo Hire (Flat Fee)').map((extra, idx) => (
                    <option key={`extra-${idx}`} value={extra.name}>{extra.name}</option>
                  ))}
                </optgroup>
                <optgroup label="── Custom ──">
                  <option value="custom">Custom Price Package</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Base Amount (£)</label>
              <input type="number" step="0.01" value={form.baseAmount} onChange={e => setForm({...form, baseAmount: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ED1C24]" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">VAT Rate</label>
              <select value={form.vatRate} onChange={e => setForm({...form, vatRate: Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ED1C24] bg-white">
                <option value={0}>No VAT (0%)</option>
                <option value={20}>Standard (20%)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Deposit Due (£)</label>
              <input type="number" step="0.01" value={form.deposit} onChange={e => setForm({...form, deposit: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ED1C24]" placeholder="0.00" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Additional Notes</label>
          <textarea rows={3} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ED1C24]" placeholder="Any special requests or details..." />
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-100">
          <button type="submit" disabled={loading} className="bg-[#ED1C24] hover:bg-[#C1161B] text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed">
            {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Save Edits' : 'Create Booking')}
          </button>
        </div>
      </form>
      )}

      {/* Professional Completion Popup */}
      {showCompletionPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center animate-in zoom-in-95 duration-500 flex flex-col items-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
              <Icon name="CheckCircleIcon" size={40} className="text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Closed Successfully</h2>
            <p className="text-gray-500 mb-8">The final payment has been processed and the booking is now fully complete.</p>
            
            <div className="w-full space-y-3 mb-6">
              {downloadMenuPDF && initialData && (
                <button type="button" onClick={() => downloadMenuPDF(initialData)} className="w-full flex items-center gap-2 text-sm font-semibold px-4 py-3 rounded-xl justify-center text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors">
                  <Icon name="ArrowDownTrayIcon" size={18} />
                  Download Menu PDF
                </button>
              )}
              {downloadInvoicePDF && initialData && (
                <button type="button" onClick={() => downloadInvoicePDF(initialData, true)} className="w-full flex items-center gap-2 text-sm font-semibold px-4 py-3 rounded-xl justify-center text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors">
                  <Icon name="ArrowDownTrayIcon" size={18} />
                  Download Deposit Invoice
                </button>
              )}
              {downloadInvoicePDF && initialData && (
                <button type="button" onClick={() => downloadInvoicePDF(initialData)} className="w-full flex items-center gap-2 text-sm font-semibold px-4 py-3 rounded-xl justify-center text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors">
                  <Icon name="ArrowDownTrayIcon" size={18} />
                  Download Final Invoice
                </button>
              )}
            </div>

            <button type="button" onClick={() => {
              setShowCompletionPopup(false);
              if (onClose) onClose();
            }} className="w-full py-3.5 px-6 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl shadow-md transition-colors uppercase tracking-wide text-sm">
              Close Window
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
