'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Icon from '@/components/ui/AppIcon';
import {
  NEW_PACKAGES as DEFAULT_NEW_PACKAGES,
  MENU_CATEGORIES as DEFAULT_MENU_CATEGORIES,
  LIVE_DOSA_PARTY_MENU as DEFAULT_LIVE_DOSA_PARTY_MENU,
  EXTRAS as DEFAULT_EXTRAS,
  VENUE_HALL_CHARGES as DEFAULT_VENUE_HALL_CHARGES,
  TABLE_SERVICE as DEFAULT_TABLE_SERVICE,
  KIDS_PRICING as DEFAULT_KIDS_PRICING,
  STANDARD_SETUP as DEFAULT_STANDARD_SETUP,
  TERMS_AND_CONDITIONS as DEFAULT_TERMS_AND_CONDITIONS,
  DRY_HIRE_PRICES as DEFAULT_DRY_HIRE_PRICES,
} from '@/app/data/menuData';

const EVENT_TYPES = ['Wedding', 'Birthday', 'Corporate', 'Anniversary', 'Graduation', 'Other'];

type MenuTab = 'packages' | 'menu' | 'live' | 'extras';

export default function HomePage() {
  const [menus, setMenus] = useState({
    NEW_PACKAGES: DEFAULT_NEW_PACKAGES,
    MENU_CATEGORIES: DEFAULT_MENU_CATEGORIES,
    LIVE_DOSA_PARTY_MENU: DEFAULT_LIVE_DOSA_PARTY_MENU,
    EXTRAS: DEFAULT_EXTRAS,
    VENUE_HALL_CHARGES: DEFAULT_VENUE_HALL_CHARGES,
    TABLE_SERVICE: DEFAULT_TABLE_SERVICE,
    KIDS_PRICING: DEFAULT_KIDS_PRICING,
    STANDARD_SETUP: DEFAULT_STANDARD_SETUP,
    TERMS_AND_CONDITIONS: DEFAULT_TERMS_AND_CONDITIONS,
    DRY_HIRE_PRICES: DEFAULT_DRY_HIRE_PRICES,
  });

  const [blockedDates] = useState<string[]>([]);

  const [pricingDetails] = useState({
    depositPercentage: 30,
  });

  const { NEW_PACKAGES, MENU_CATEGORIES, LIVE_DOSA_PARTY_MENU, EXTRAS, VENUE_HALL_CHARGES, TABLE_SERVICE, KIDS_PRICING, STANDARD_SETUP, TERMS_AND_CONDITIONS, DRY_HIRE_PRICES } = menus;

  const [bookingForm, setBookingForm] = useState({
    name: '', email: '', phone: '', eventType: '', date: '', timeOfDay: '', guests: '', message: '', selectedPackage: '',
  });

  const handleEnquireNow = (packageName: string) => {
    setBookingForm(prev => ({ ...prev, selectedPackage: packageName }));
    const el = document.getElementById('book');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const [submitted, setSubmitted] = useState(false);
  const [activeMenuTab, setActiveMenuTab] = useState<MenuTab>('packages');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customHomeAlert, setCustomHomeAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [phoneError, setPhoneError] = useState('');

  // UK phone validation: 07xxxxxxxxx (11 digits) or +447xxxxxxxxx
  const validateUKPhone = (digits: string) => {
    const cleaned = digits.replace(/\s/g, '');
    // Accept: 07XXXXXXXXX (10 local digits starting with 07) or 7XXXXXXXXX (9 local digits starting with 7)
    return /^(07\d{9}|7\d{9})$/.test(cleaned) || cleaned === '';
  };

  const handlePhoneChange = (digits: string) => {
    // Only allow digits and spaces
    const sanitized = digits.replace(/[^\d\s]/g, '');
    setBookingForm({ ...bookingForm, phone: sanitized });
    if (sanitized && !validateUKPhone(sanitized)) {
      setPhoneError('Enter a valid UK number (e.g. 07700 900000)');
    } else {
      setPhoneError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bookingForm.phone && !validateUKPhone(bookingForm.phone)) {
      setPhoneError('Enter a valid UK number (e.g. 07700 900000)');
      return;
    }
    setIsSubmitting(true);
    if (blockedDates.includes(bookingForm.date)) {
      setCustomHomeAlert({
        message: "This date is unfortunately fully booked or unavailable. Please choose another date.",
        type: 'error'
      });
      setIsSubmitting(false);
      return;
    }
    try {
      // Prototype mode: store locally without database
      setSubmitted(true);
      setPhoneError('');
      setBookingForm({ name: '', email: '', phone: '', eventType: '', date: '', timeOfDay: '', guests: '', message: '', selectedPackage: '' });
    } catch (error) {
      console.error("Error submitting request: ", error);
      setCustomHomeAlert({
        message: "There was an error submitting your request. Please try again.",
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSection = (key: string) => {
    setExpandedSection(prev => prev === key ? null : key);
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <Header onOpenModal={() => {}} />

      {/* Hero — two-column layout */}
      <section className="pt-24 pb-0 px-6" style={{ background: 'linear-gradient(135deg, #1A0F00 0%, #2C1A00 60%, #3D2800 100%)' }}>
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-10 lg:gap-16 py-12">

          {/* ── Left: Text content ── */}
          <div className="flex-1 text-center lg:text-left">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-5" style={{ background: 'rgba(237, 28, 36,0.2)', color: '#F5A623' }}>
              Banquet &amp; Catering
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
              Make Your Event<br />
              <span style={{ color: '#F5A623' }}>Unforgettable</span>
            </h1>
            <p className="text-lg mb-8 max-w-xl lg:mx-0 mx-auto" style={{ color: '#A08060' }}>
              Authentic Indian &amp; Sri Lankan cuisine. Elegant banquet hall. Unforgettable events.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <a href="#menus" className="text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl" style={{ background: 'linear-gradient(135deg, #ED1C24, #F5A623)' }}>
                View Menus &amp; Packages
              </a>
              <a href="#book" className="border font-semibold px-8 py-3.5 rounded-xl transition-colors hover:text-white" style={{ borderColor: '#3D2800', color: '#A08060' }}>
                Book Now
              </a>
            </div>
          </div>

          {/* ── Right: Booking form card ── */}
          <div id="book" className="w-full lg:w-[480px] flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-7">
              <h2 className="text-xl font-bold text-gray-900 text-center mb-1">Request a Booking</h2>
              <p className="text-sm text-gray-500 text-center mb-5">Fill in your details and we'll get back to you within 24 hours</p>

              {submitted ? (
                <div className="text-center py-10 rounded-2xl border" style={{ background: 'rgba(237, 28, 36,0.04)', borderColor: 'rgba(237, 28, 36,0.2)' }}>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(237, 28, 36,0.1)' }}>
                    <Icon name="CheckCircleIcon" size={28} style={{ color: '#ED1C24' }} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Request Received!</h3>
                  <p className="text-gray-500 text-sm">We'll contact you within 24 hours to confirm your booking.</p>
                  <button onClick={() => setSubmitted(false)} className="mt-5 text-sm font-medium hover:underline" style={{ color: '#ED1C24' }}>
                    Submit another request
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
                      <input type="text" required value={bookingForm.name} onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-yellow-500" placeholder="Your name" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                      <input type="email" required value={bookingForm.email} onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-yellow-500" placeholder="your@email.com" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                        <svg viewBox="0 0 24 24" fill="#25D366" className="w-3.5 h-3.5 flex-shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.859L.057 23.428a.75.75 0 0 0 .921.921l5.684-1.47A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.694 9.694 0 0 1-4.946-1.356l-.355-.211-3.676.95.974-3.578-.231-.368A9.693 9.693 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/></svg>
                        WhatsApp Number
                      </label>
                      <div className={`flex items-center rounded-xl overflow-hidden border ${phoneError ? 'border-red-400' : 'border-gray-300'} focus-within:ring-2 focus-within:ring-yellow-400 focus-within:border-yellow-500`}>
                        <span className="px-3 py-2.5 bg-gray-50 text-sm font-semibold text-gray-600 border-r border-gray-300 select-none whitespace-nowrap">+44</span>
                        <input
                          type="tel"
                          value={bookingForm.phone}
                          onChange={(e) => handlePhoneChange(e.target.value)}
                          className="flex-1 px-3 py-2.5 text-sm focus:outline-none bg-white"
                          placeholder="07700 900000"
                          maxLength={12}
                        />
                      </div>
                      {phoneError && <p className="text-red-500 text-xs mt-1">{phoneError}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Event Type *</label>
                      <select required value={bookingForm.eventType} onChange={(e) => setBookingForm({ ...bookingForm, eventType: e.target.value })} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-yellow-500 bg-white">
                        <option value="">Select type</option>
                        {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  {/* Preferred Package */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                      <span style={{ color: '#ED1C24' }}>🎁</span> Preferred Package
                      {bookingForm.selectedPackage && (
                        <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(237, 28, 36,0.12)', color: '#ED1C24' }}>Auto-selected</span>
                      )}
                    </label>
                    <select
                      value={bookingForm.selectedPackage}
                      onChange={(e) => setBookingForm({ ...bookingForm, selectedPackage: e.target.value })}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-yellow-500 bg-white"
                      style={bookingForm.selectedPackage ? { borderColor: '#ED1C24', boxShadow: '0 0 0 1px rgba(237, 28, 36,0.3)' } : {}}
                    >
                      <option value="">No specific package – help me choose</option>
                      <optgroup label="── Buffet Packages ──">
                        {NEW_PACKAGES.map((pkg) => (
                          <option key={pkg.id} value={pkg.name}>
                            {pkg.name} — £{pkg.pricePerPerson}/person
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="── Venue & Hire ──">
                        <option value="Venue Hall">Venue Hall</option>
                        <option value="Dry Hire">Dry Hire</option>
                        <option value="Kids Pricing">Kids Pricing</option>
                      </optgroup>
                      <optgroup label="── Extras ──">
                        {(EXTRAS || []).map((extra, idx) => (
                          <option key={idx} value={extra.name}>
                            {extra.name} — £{extra.price}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Event Date *</label>
                      <input
                        type="date"
                        required
                        min={new Date().toISOString().split('T')[0]}
                        value={bookingForm.date}
                        onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                        className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-yellow-500 ${blockedDates.includes(bookingForm.date) ? 'border-red-500 ring-2 ring-red-100 bg-red-50/10' : 'border-gray-300'}`}
                      />
                      {blockedDates.includes(bookingForm.date) && (
                        <span className="text-red-500 text-xs font-semibold mt-1 flex items-center gap-1">
                          <Icon name="ExclamationTriangleIcon" size={12} className="text-red-500 flex-shrink-0" />
                          Unavailable
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Time of Day *</label>
                      <select required value={bookingForm.timeOfDay} onChange={(e) => setBookingForm({ ...bookingForm, timeOfDay: e.target.value })} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-yellow-500 bg-white">
                        <option value="">Select time</option>
                        <option value="Lunch (12:00pm – 4:00pm)">Lunch (12:00pm – 4:00pm)</option>
                        <option value="Dinner (6:00pm – 11:30pm)">Dinner (6:00pm – 11:30pm)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Guests *</label>
                      <input type="number" required min={1} max={500} value={bookingForm.guests} onChange={(e) => setBookingForm({ ...bookingForm, guests: e.target.value })} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-yellow-500" placeholder="e.g. 100" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Additional Notes</label>
                    <textarea rows={2} value={bookingForm.message} onChange={(e) => setBookingForm({ ...bookingForm, message: e.target.value })} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-yellow-500 resize-none" placeholder="Special requests, preferred menu, décor ideas..." />
                  </div>
                  <button type="submit" disabled={isSubmitting} className="w-full text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-70 cursor-pointer disabled:cursor-not-allowed" style={{ background: 'linear-gradient(135deg, #ED1C24, #F5A623)' }}>
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                        Submitting...
                      </span>
                    ) : (
                      <>
                        <Icon name="CalendarDaysIcon" size={16} />
                        Submit Booking Request
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* Quick Stats */}
      <div className="py-6 px-6" style={{ background: 'linear-gradient(135deg, #ED1C24, #F5A623)' }}>
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4 text-center">
          {[
            { value: '500+', label: 'Events Hosted' },
            { value: '500', label: 'Guest Capacity' },
            { value: '4.9★', label: 'Customer Rating' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-white/70 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── MENUS & PACKAGES SECTION ─── */}
      <section id="menus" className="py-16 px-4 md:px-6" style={{ background: '#FAFAF8' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-3" style={{ background: 'rgba(237, 28, 36,0.1)', color: '#ED1C24' }}>
              Our Menus
            </span>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Menus &amp; Packages</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Authentic flavours, carefully crafted packages. Choose your menu and let us handle the rest.</p>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {([
              { id: 'packages', label: '🎁 Packages' },
              { id: 'menu', label: '🍛 Menu Items' },
              { id: 'live', label: '🎪 Live Dosa Party' },
              { id: 'extras', label: '✨ Extras' },
            ] as { id: MenuTab; label: string }[]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveMenuTab(tab.id)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeMenuTab === tab.id ? 'text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:border-yellow-400'}`}
                style={activeMenuTab === tab.id ? { background: 'linear-gradient(135deg, #ED1C24, #F5A623)' } : {}}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ─── PACKAGES ─── */}
          {activeMenuTab === 'packages' && (
            <div className="space-y-8">
              {/* Package Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {NEW_PACKAGES.map((pkg: any) => (
                  <div key={pkg.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col p-6 hover:shadow-md transition-shadow">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{pkg.name}</h3>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl font-bold" style={{ color: pkg.color }}>£{pkg.pricePerPerson}</span>
                      <span className="text-xs font-semibold text-gray-500">{pkg.guestLabel}</span>
                    </div>
                    <div className="text-xs font-bold text-red-600 mb-4">{pkg.tag}</div>
                    
                    <ul className="space-y-2 mb-4 flex-grow">
                      {pkg.items.map((item: string, i: number) => (
                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-orange-500 mt-0.5">🍳</span> {item}
                        </li>
                      ))}
                    </ul>
                    <div className="text-xs text-gray-500 italic mb-4">
                      {pkg.complimentary}
                    </div>
                    <button onClick={() => handleEnquireNow(pkg.name)} className="w-full py-2.5 rounded-xl font-semibold text-white shadow-sm hover:shadow-md transition-all" style={{ background: 'linear-gradient(135deg, #ED1C24, #F5A623)' }}>
                      Enquire Now
                    </button>
                  </div>
                ))}
              </div>

              {/* Venue Hall Charges */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">"Venue" Hall Charges</h3>
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-100">
                      {VENUE_HALL_CHARGES.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="py-3 pr-4 font-semibold text-gray-800">{row.day}</td>
                          <td className="py-3 font-bold text-right text-red-600">{row.charge}</td>
                          {row.note && <td className="py-3 text-gray-500 italic text-xs text-right pl-2">({row.note})</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── MENU ITEMS ─── */}
          {activeMenuTab === 'menu' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { title: 'STATERS', items: MENU_CATEGORIES.staters, bg: '#E06D43' },
                  { title: 'VEG MAINS', items: MENU_CATEGORIES.vegMains, bg: '#E06D43' },
                  { title: 'RICE & NOODLES', items: MENU_CATEGORIES.riceAndNoodles, bg: '#E06D43' },
                  { title: 'PANEER MAINS', items: MENU_CATEGORIES.paneerMains, bg: '#E06D43' },
                  { title: 'BREADS', items: MENU_CATEGORIES.breads, bg: '#E06D43' },
                  { title: 'DHAL', items: MENU_CATEGORIES.dhal, bg: '#E06D43' },
                  { title: 'DESSERT', items: MENU_CATEGORIES.dessert, bg: '#E06D43' },
                ].map((category) => (
                  <div key={category.title} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 text-white text-center font-bold text-lg" style={{ background: category.bg }}>
                      {category.title}
                    </div>
                    <ul className="p-4 space-y-2">
                      {category.items.map((item: string, idx: number) => (
                        <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-gray-400 mt-0.5">🍳</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── LIVE DOSA PARTY ─── */}
          {activeMenuTab === 'live' && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 max-w-4xl mx-auto">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{LIVE_DOSA_PARTY_MENU.title}</h3>
                {LIVE_DOSA_PARTY_MENU.pricing.map((p: string, i: number) => (
                  <p key={i} className="text-sm font-semibold text-gray-700 mb-1">{p}</p>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-yellow-500 rounded-xl p-4">
                  <ul className="space-y-2">
                    {LIVE_DOSA_PARTY_MENU.items.slice(0, 6).map((item: string, idx: number) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-center gap-2">
                        <span className="text-gray-400">🍳</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border border-yellow-500 rounded-xl p-4">
                  <ul className="space-y-2">
                    {LIVE_DOSA_PARTY_MENU.items.slice(6).map((item: string, idx: number) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-center gap-2">
                        <span className="text-gray-400">🍳</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="text-center mt-6 text-sm font-bold text-gray-800">
                MINIMUM 2 HRS SERVICE
              </div>
            </div>
          )}

          {/* ─── EXTRAS ─── */}
          {activeMenuTab === 'extras' && (
            <div className="bg-white rounded-2xl border border-yellow-500 shadow-sm p-6 max-w-4xl mx-auto">
              <div className="text-center mb-4 text-sm font-bold text-gray-800">
                MINIMUM 2 HRS SERVICE<br/>
                Extras Are Charged Per Person Basis
              </div>
              <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-700">
                {EXTRAS.map((extra: any, idx: number) => (
                  <span key={idx} className="font-medium">
                    {extra.name} £{extra.price.toFixed(2)}
                    {idx < EXTRAS.length - 1 && <span className="mx-2 text-yellow-500">|</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      </section>
      <Footer />
      {/* ─── CUSTOM ALERT MODAL ─── */}
      {customHomeAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-100 flex flex-col items-center text-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${customHomeAlert.type === 'success' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
              <Icon name={customHomeAlert.type === 'success' ? 'CheckIcon' : 'ExclamationTriangleIcon'} size={24} />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">{customHomeAlert.type === 'success' ? 'Success' : 'Notice'}</h3>
            <p className="text-sm text-gray-500 mb-5">{customHomeAlert.message}</p>
            <button
              onClick={() => setCustomHomeAlert(null)}
              className="px-6 py-2 rounded-xl text-sm font-semibold text-white transition-all shadow-md active:scale-95 hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #ED1C24, #F5A623)' }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}