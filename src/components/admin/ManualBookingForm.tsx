'use client';
import React, { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';

export default function ManualBookingForm({ setCustomAlert, packages = [], extras = [], onBookingCreated, depositPercentage = 30, timeSlots = [] }: { setCustomAlert: any, packages?: any[], extras?: any[], onBookingCreated?: (booking: any) => void, depositPercentage?: number, timeSlots?: string[] }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    eventType: 'Wedding',
    date: '',
    time: '',
    guests: '',
    notes: '',
    package: 'Classic Buffet',
    baseAmount: '',
    deposit: '',
    postCode: '',
    address: '',
  });

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

    const dep = (base * (depositPercentage / 100));
    
    setForm(prev => {
      if (prev.baseAmount !== base.toString() || prev.deposit !== dep.toFixed(2)) {
        return {
          ...prev,
          baseAmount: base.toString(),
          deposit: dep.toFixed(2)
        };
      }
      return prev;
    });
  }, [form.package, form.guests, packages, extras, depositPercentage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.date) {
      setCustomAlert({ message: 'Name, Phone, and Date are required.', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const bookingData = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        eventType: form.eventType,
        date: form.date,
        timeOfDay: form.time,
        guests: parseInt(form.guests) || 0,
        message: form.notes,
        package: form.package,
        baseAmount: parseFloat(form.baseAmount) || 0,
        deposit: parseFloat(form.deposit) || 0,
        status: 'new_enquiry',
        depositPaid: false,
        finalPaymentPaid: false,
        postCode: form.postCode,
        address: form.address,
        createdAt: new Date().toISOString(),
      };

      // Add to booking_requests
      const docRef = await addDoc(collection(db, 'booking_requests'), bookingData);

      // Add to bookings
      await setDoc(doc(db, 'bookings', docRef.id), bookingData);

      setCustomAlert({ message: 'Manual booking created successfully!', type: 'success' });
      setForm({
        name: '', email: '', phone: '', eventType: 'Wedding', date: '', time: '', guests: '', notes: '', package: 'Classic Buffet', baseAmount: '', deposit: '', postCode: '', address: ''
      });
      if (onBookingCreated) {
        onBookingCreated({ ...bookingData, id: docRef.id });
      }
    } catch (error: any) {
      console.error(error);
      setCustomAlert({ message: `Error creating booking: ${error.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 w-full">
      <div className="border-b border-gray-100 pb-4 mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Icon name="PlusCircleIcon" size={24} style={{ color: '#ED1C24' }} />
            Direct Booking Entry
          </h2>
          <p className="text-sm text-gray-500 mt-1">Create a new booking manually from phone or walk-in.</p>
        </div>
      </div>

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
                  {timeSlots.length > 0 ? timeSlots.map(slot => (
                    <option key={slot} value={slot}>{slot}</option>
                  )) : (
                    <>
                      <option value="Lunch (12:00pm - 4:00pm)">Lunch (12:00pm - 4:00pm)</option>
                      <option value="Dinner (6:00pm - 11:30pm)">Dinner (6:00pm - 11:30pm)</option>
                    </>
                  )}
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
              <label className="block text-xs font-semibold text-gray-600 mb-1">Deposit (£)</label>
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
            {loading ? 'Creating...' : 'Create Booking'}
          </button>
        </div>
      </form>
    </div>
  );
}
