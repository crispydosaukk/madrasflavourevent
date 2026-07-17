'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Icon from '@/components/ui/AppIcon';
import { collection, addDoc, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  NEW_PACKAGES as DEFAULT_NEW_PACKAGES,
  MENU_CATEGORIES as DEFAULT_MENU_CATEGORIES,
  LIVE_DOSA_PARTY_MENU as DEFAULT_LIVE_DOSA_PARTY_MENU,
  EXTRAS as DEFAULT_EXTRAS,
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
    TABLE_SERVICE: DEFAULT_TABLE_SERVICE,
    KIDS_PRICING: DEFAULT_KIDS_PRICING,
    STANDARD_SETUP: DEFAULT_STANDARD_SETUP,
    TERMS_AND_CONDITIONS: DEFAULT_TERMS_AND_CONDITIONS,
    DRY_HIRE_PRICES: DEFAULT_DRY_HIRE_PRICES,
  });

  const [blockedDates, setBlockedDates] = useState<string[]>([]);

  React.useEffect(() => {
    return onSnapshot(doc(db, 'site_data', 'menus'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMenus({
          NEW_PACKAGES: data.NEW_PACKAGES || data.BANQUET_PACKAGES || DEFAULT_NEW_PACKAGES,
          MENU_CATEGORIES: data.MENU_CATEGORIES || DEFAULT_MENU_CATEGORIES,
          LIVE_DOSA_PARTY_MENU: data.LIVE_DOSA_PARTY_MENU || DEFAULT_LIVE_DOSA_PARTY_MENU,
          EXTRAS: data.EXTRAS || DEFAULT_EXTRAS,
          TABLE_SERVICE: data.TABLE_SERVICE || DEFAULT_TABLE_SERVICE,
          KIDS_PRICING: data.KIDS_PRICING || DEFAULT_KIDS_PRICING,
          STANDARD_SETUP: data.STANDARD_SETUP || DEFAULT_STANDARD_SETUP,
          TERMS_AND_CONDITIONS: data.TERMS_AND_CONDITIONS || DEFAULT_TERMS_AND_CONDITIONS,
          DRY_HIRE_PRICES: data.DRY_HIRE_PRICES || DEFAULT_DRY_HIRE_PRICES,
        });
      }
    });
  }, []);

  const [pricingDetails, setPricingDetails] = useState({
    depositPercentage: 30,
  });

  React.useEffect(() => {
    return onSnapshot(doc(db, 'site_data', 'pricing_details'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPricingDetails({
          depositPercentage: data.depositPercentage !== undefined ? data.depositPercentage : 30,
        });
      }
    });
  }, []);

  const [formSettings, setFormSettings] = useState({
    timeSlots: ['Lunch (12:00pm - 4:00pm)', 'Dinner (6:00pm - 11:30pm)']
  });

  React.useEffect(() => {
    return onSnapshot(doc(db, 'site_data', 'form_settings'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFormSettings({
          timeSlots: data.timeSlots || ['Lunch (12:00pm - 4:00pm)', 'Dinner (6:00pm - 11:30pm)']
        });
      }
    });
  }, []);

  const [minGuests, setMinGuests] = useState(100);
  React.useEffect(() => {
    return onSnapshot(doc(db, 'site_data', 'venue_details'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMinGuests(Number(data.minGuests) || 100);
      }
    });
  }, []);

  React.useEffect(() => {
    return onSnapshot(collection(db, 'blocked_dates'), (snapshot) => {
      const dates = snapshot.docs.map(doc => doc.id);
      setBlockedDates(dates);
    });
  }, []);

  const { NEW_PACKAGES, MENU_CATEGORIES, LIVE_DOSA_PARTY_MENU, EXTRAS, TABLE_SERVICE, KIDS_PRICING, STANDARD_SETUP, TERMS_AND_CONDITIONS, DRY_HIRE_PRICES } = menus;

  const faqs = [
    {
      question: "Do you bring all the cooking equipment for live dosa catering?",
      answer: "Yes, we bring all the necessary cooking equipment, including the dosa tawa (griddle), gas burners, and cooking utensils. You do not need to provide any kitchen setup for cooking."
    },
    {
      question: "Do you provide plates, spoons, and napkins?",
      answer: "Yes, we provide standard disposable plates, spoons, and napkins as part of our package. For an upgraded premium experience, you can also opt for eco-friendly Palm Plates from our Extras list at £0.99 per person."
    },
    {
      question: "How are the charges calculated for dosa catering?",
      answer: "Charges are calculated on a per-person basis with a minimum guest requirement. Our weekday package (Monday to Friday) is £11.00 per person with a minimum of 35 guests. Our weekend and bank holiday package is £12.00 per person with a minimum of 40 guests."
    },
    {
      question: "Is there a transportation fee for catering services?",
      answer: "Yes, transportation charges may apply depending on the location of the event. Please share your event postcode when submitting your enquiry, and we will provide a precise transport quote."
    },
    {
      question: "How long do you serve food at an event?",
      answer: "Our standard live dosa counter service is for 2 hours. If you require food to be served for a longer duration, extra hours can be arranged in advance."
    },
    {
      question: "What do customers need to provide for the setup?",
      answer: "Customers must provide two serving tables (4ft x 4ft) and one power point."
    },
    {
      question: "What is the payment policy for booking live dosa catering?",
      answer: "We require a 30% deposit to secure your booking date. The remaining balance can be settled on or before the day of your event."
    },
    {
      question: "Can I customize the menu with additional items?",
      answer: "Absolutely! You can choose additional starters, mains, or desserts from our refined Extras list to customize the menu to your preference. These are charged on a per-person basis (unless stated otherwise)."
    },
    {
      question: "Do you provide tents or gazebos for outdoor catering?",
      answer: "Yes, we offer Gazebo Hire for a flat fee of £100.00 to protect the live counter setup from weather elements."
    },
    {
      question: "Do your dishes contain allergens such as nuts or sesame?",
      answer: "Some of our dishes may contain nuts, sesame, dairy, or other allergens. Please inform us of any severe food allergies or dietary restrictions when submitting your booking enquiry so we can prepare accordingly."
    }
  ];

  const [bookingForm, setBookingForm] = useState({
    name: '', email: '', phone: '', eventType: '', date: '', timeOfDay: '', guests: '', message: '', selectedPackage: '', postCode: '', address: ''
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

  const validateUKPhone = (digits: string) => {
    const cleaned = digits.replace(/\s/g, '');
    if (cleaned === '') return true;
    if (/[^\d]/.test(cleaned)) return false;
    // Accept: 07XXXXXXXXX (10 local digits starting with 07) or 7XXXXXXXXX (9 local digits starting with 7)
    return /^(07\d{9}|7\d{9})$/.test(cleaned);
  };

  const handlePhoneChange = (digits: string) => {
    setBookingForm({ ...bookingForm, phone: digits });
    if (digits && !validateUKPhone(digits)) {
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
      const fullPhone = bookingForm.phone ? `+44${bookingForm.phone.replace(/^0/, '').replace(/\s/g, '')}` : '';
      const guestCount = Number(bookingForm.guests) || 0;
      
      if (guestCount < minGuests) {
        setCustomHomeAlert({
          message: `The minimum number of guests required is ${minGuests}. We cannot accept orders below this amount.`,
          type: 'error'
        });
        setIsSubmitting(false);
        return;
      }
      
      const selectedPkg = NEW_PACKAGES.find(p => p.name === bookingForm.selectedPackage);
      const isLiveDosa = bookingForm.selectedPackage === 'Outdoor Live Dosa Party';
      let selectedExtra = null;
      if (!selectedPkg && !isLiveDosa) {
         selectedExtra = EXTRAS?.find((e: any) => e.name === bookingForm.selectedPackage);
      }
      
      let baseAmount = 0;
      if (selectedPkg) {
        baseAmount = selectedPkg.pricePerPerson * guestCount;
      } else if (isLiveDosa) {
        // live dosa party base estimation
        let dosaPrice = 11.00;
        if (bookingForm.date) {
          const d = new Date(bookingForm.date);
          const day = d.getDay();
          if (day === 0 || day === 6) {
            dosaPrice = 12.00;
          }
        }
        baseAmount = dosaPrice * guestCount;
      } else if (selectedExtra) {
        baseAmount = selectedExtra.price;
      }
      
      const deposit = (baseAmount * pricingDetails.depositPercentage) / 100;
      
      await addDoc(collection(db, 'booking_requests'), {
        name: bookingForm.name,
        email: bookingForm.email,
        phone: fullPhone,
        eventType: bookingForm.eventType,
        date: bookingForm.date,
        timeOfDay: bookingForm.timeOfDay,
        guests: guestCount,
        message: bookingForm.message,
        package: bookingForm.selectedPackage || 'Not Selected',
        postCode: bookingForm.postCode,
        address: bookingForm.address,
        baseAmount,
        deposit,
        extraCharges: [],
        createdAt: new Date().toISOString()
      });

      setSubmitted(true);
      setPhoneError('');
      setBookingForm({ name: '', email: '', phone: '', eventType: '', date: '', timeOfDay: '', guests: '', message: '', selectedPackage: '', postCode: '', address: '' });
    } catch (error: any) {
      console.error("Error submitting request: ", error);
      setCustomHomeAlert({
        message: "Error submitting: " + (error?.message || "Unknown error"),
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
              Outdoor Catering
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
              Make Your Event<br />
              <span style={{ color: '#F5A623' }}>Unforgettable</span>
            </h1>
            <p className="text-lg mb-8 max-w-xl lg:mx-0 mx-auto" style={{ color: '#A08060' }}>
              Experience authentic 100% pure vegetarian catering for all occasions
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
                <div className="text-center py-10 rounded-2xl border" style={{ background: 'rgba(34, 197, 94, 0.04)', borderColor: 'rgba(34, 197, 94, 0.2)' }}>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                    <Icon name="CheckCircleIcon" size={28} style={{ color: '#22c55e' }} />
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Post Code *</label>
                      <input type="text" required value={bookingForm.postCode} onChange={(e) => setBookingForm({ ...bookingForm, postCode: e.target.value })} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-yellow-500" placeholder="e.g. SW1A 1AA" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Address *</label>
                      <input type="text" required value={bookingForm.address} onChange={(e) => setBookingForm({ ...bookingForm, address: e.target.value })} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-yellow-500" placeholder="Full Address" />
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
                      <optgroup label="── Outdoor Catering Packages ──">
                        {NEW_PACKAGES.map((pkg) => (
                          <option key={pkg.id} value={pkg.name}>
                            {pkg.name} — £{pkg.pricePerPerson}/person
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="── Live Dosa Party ──">
                        <option value="Outdoor Live Dosa Party">Outdoor Live Dosa Party</option>
                      </optgroup>
                      <optgroup label="── Extras ──">
                        {(EXTRAS || [])
                          .filter((extra) => extra.name === 'Gazebo Hire (Flat Fee)')
                          .map((extra, idx) => (
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
                        {formSettings.timeSlots.length > 0 ? formSettings.timeSlots.map(slot => (
                          <option key={slot} value={slot}>{slot}</option>
                        )) : (
                          <>
                            <option value="Lunch (12:00pm - 4:00pm)">Lunch (12:00pm - 4:00pm)</option>
                            <option value="Dinner (6:00pm - 11:30pm)">Dinner (6:00pm - 11:30pm)</option>
                          </>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Guests *</label>
                      <input type="number" required min={minGuests} max={500} value={bookingForm.guests} onChange={(e) => setBookingForm({ ...bookingForm, guests: e.target.value })} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-yellow-500" placeholder={`e.g. ${minGuests}`} />
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
              { id: 'live', label: '🍳 Live Dosa Menu' },
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
            </div>
          )}

          {/* ─── LIVE DOSA MENU ─── */}
          {activeMenuTab === 'live' && (
            <div className="space-y-8">
              {/* ─── LIVE DOSA PARTY ─── */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 max-w-4xl mx-auto w-full">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Live Dosa Menu</h3>
                  {LIVE_DOSA_PARTY_MENU.pricing.map((p: string, i: number) => (
                    <p key={i} className="text-sm font-semibold text-gray-700 mb-1">{p}</p>
                  ))}
                  <p className="text-sm font-semibold text-gray-700 mb-1">Gazebo Hire (Flat Fee) £100.00</p>
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

              {/* ─── EXTRAS ─── */}
              <div className="bg-white rounded-2xl border border-yellow-500 shadow-sm p-6 max-w-4xl mx-auto w-full mt-8">
                <div className="text-center mb-4 text-sm font-bold text-gray-800">
                  MINIMUM 2 HRS SERVICE<br/>
                  Extras Are Charged Per Person Basis (Unless Stated Otherwise)
                </div>
                <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-700">
                  {EXTRAS.filter((e: any) => e.name !== 'Gazebo Hire (Flat Fee)').map((extra: any, idx: number, arr: any[]) => (
                    <span key={idx} className="font-medium">
                      {extra.name} £{extra.price.toFixed(2)}
                      {idx < arr.length - 1 && <span className="mx-2 text-yellow-500">|</span>}
                    </span>
                  ))}
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

        </div>
      </section>

      {/* ─── FAQ SECTION ─── */}
      <section id="faqs" className="py-16 px-4 md:px-6 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-3" style={{ background: 'rgba(237, 28, 36,0.1)', color: '#ED1C24' }}>
              Got Questions?
            </span>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Everything you need to know about our outdoor live dosa catering and booking policies.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = expandedSection === `faq-${index}`;
              return (
                <div key={index} className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm transition-all duration-200 hover:shadow-md">
                  <button
                    onClick={() => toggleSection(`faq-${index}`)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left font-semibold text-gray-800 hover:text-red-600 transition-colors"
                  >
                    <span>{faq.question}</span>
                    <span className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180 text-red-600' : 'text-gray-400'}`}>
                      <Icon name="ChevronDownIcon" size={20} />
                    </span>
                  </button>
                  <div
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${
                      isOpen ? 'max-h-[500px] border-t border-gray-100' : 'max-h-0'
                    }`}
                  >
                    <div className="px-6 py-5 text-sm text-gray-600 leading-relaxed bg-gray-50/50">
                      {faq.answer}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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