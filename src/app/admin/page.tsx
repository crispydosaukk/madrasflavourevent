'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Icon from '@/components/ui/AppIcon';
import { INDIAN_MENU, SRI_LANKAN_MENU, LIVE_COUNTER_PACKAGE, BANQUET_PACKAGES, VENUE_HALL_CHARGES, TABLE_SERVICE, KIDS_PRICING, DRY_HIRE_PRICES } from '@/app/data/menuData';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db, storage } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// ─── TYPES ───────────────────────────────────────────────────────────────────

type BookingStatus =
  | 'new_enquiry' |'menu_sent' |'menu_selected' |'deposit_pending' |'deposit_confirmed' |'event_scheduled' |'event_completed' |'final_invoice_sent' |'final_payment_received' |'completed';

interface ExtraCharge {
  label: string;
  amount: number;
}

interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string;
  eventType: string;
  date: string;
  time: string;
  guests: number;
  status: BookingStatus;
  notes: string;
  baseAmount: number;
  deposit: number;
  depositPaid: boolean;
  finalPaymentPaid: boolean;
  package: string;
  selectedMenu?: string;
  extraCharges: ExtraCharge[];
  paymentProofDeposit?: string;
  paymentProofFinal?: string;
  enquiryDate: string;
  updatedAt?: string;
  createdAt?: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalBookings: number;
  totalSpent: number;
  lastEvent: string;
  status: 'active' | 'inactive';
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const STATUS_FLOW: BookingStatus[] = [
  'new_enquiry',
  'menu_sent',
  'menu_selected',
  'deposit_pending',
  'deposit_confirmed',
  'event_scheduled',
  'event_completed',
  'final_invoice_sent',
  'final_payment_received',
  'completed',
];

const STATUS_LABELS: Record<BookingStatus, string> = {
  new_enquiry: 'New Enquiry',
  menu_sent: 'Menu Sent',
  menu_selected: 'Menu Selected',
  deposit_pending: 'Deposit Pending',
  deposit_confirmed: 'Deposit Confirmed',
  event_scheduled: 'Event Scheduled',
  event_completed: 'Event Completed',
  final_invoice_sent: 'Final Invoice Sent',
  final_payment_received: 'Final Payment Received',
  completed: 'Completed',
};

const STATUS_COLORS: Record<BookingStatus, string> = {
  new_enquiry: 'bg-blue-50 text-blue-700 border border-blue-200',
  menu_sent: 'bg-purple-50 text-purple-700 border border-purple-200',
  menu_selected: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  deposit_pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  deposit_confirmed: 'bg-orange-50 text-orange-700 border border-orange-200',
  event_scheduled: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
  event_completed: 'bg-teal-50 text-teal-700 border border-teal-200',
  final_invoice_sent: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  final_payment_received: 'bg-lime-50 text-lime-700 border border-lime-200',
  completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

const STATUS_DOT: Record<BookingStatus, string> = {
  new_enquiry: 'bg-blue-500',
  menu_sent: 'bg-purple-500',
  menu_selected: 'bg-indigo-500',
  deposit_pending: 'bg-amber-400',
  deposit_confirmed: 'bg-orange-500',
  event_scheduled: 'bg-cyan-500',
  event_completed: 'bg-teal-500',
  final_invoice_sent: 'bg-yellow-500',
  final_payment_received: 'bg-lime-500',
  completed: 'bg-emerald-500',
};

const MENU_PACKAGES = [
  {
    name: 'Classic Buffet',
    price: 38,
    tag: 'Most Popular',
    items: ['Garden Salad', 'Grilled Chicken', 'Pasta Primavera', 'Seasonal Vegetables', 'Dinner Rolls', 'Dessert Station'],
  },
  {
    name: 'Premium Plated',
    price: 62,
    tag: 'Best Value',
    items: ['Soup or Salad', 'Choice of Entrée (Beef/Fish/Veg)', 'Sides', 'Bread Service', 'Plated Dessert', 'Coffee & Tea'],
  },
  {
    name: 'Cocktail Reception',
    price: 45,
    tag: '',
    items: ["Passed Hors d'Oeuvres (6 varieties)", 'Cheese & Charcuterie Board', 'Mini Desserts', 'Soft Drinks', 'Bartender Service'],
  },
  {
    name: 'Continental Breakfast',
    price: 22,
    tag: '',
    items: ['Assorted Pastries', 'Fresh Fruit Platter', 'Yogurt Parfait', 'Juice & Coffee', 'Bagels & Cream Cheese'],
  },
];

const SAMPLE_BOOKINGS: Booking[] = [
  {
    id: 'BK001', name: 'Sarah Johnson', email: 'sarah@email.com', phone: '+447700900101',
    eventType: 'Wedding', date: '2026-06-15', time: '4:00 PM', guests: 200,
    status: 'deposit_confirmed', notes: 'Floral décor, DJ required. Bride prefers white roses.',
    baseAmount: 12500, deposit: 3750, depositPaid: true, finalPaymentPaid: false,
    package: 'Premium Plated', selectedMenu: 'Premium Plated', extraCharges: [],
    paymentProofDeposit: 'proof_attached', enquiryDate: '2026-04-10',
  },
  {
    id: 'BK002', name: 'Michael Chen', email: 'mchen@corp.com', phone: '+447700900102',
    eventType: 'Corporate', date: '2026-05-20', time: '12:00 PM', guests: 80,
    status: 'menu_sent', notes: 'AV setup, buffet lunch. Projector needed.',
    baseAmount: 4800, deposit: 1200, depositPaid: false, finalPaymentPaid: false,
    package: 'Classic Buffet', selectedMenu: undefined, extraCharges: [],
    enquiryDate: '2026-04-22',
  },
  {
    id: 'BK003', name: 'Emily Rodriguez', email: 'emily@email.com', phone: '+447700900103',
    eventType: 'Birthday', date: '2026-05-28', time: '6:00 PM', guests: 50,
    status: 'new_enquiry', notes: 'Custom cake, cocktail style. 30th birthday.',
    baseAmount: 2750, deposit: 825, depositPaid: false, finalPaymentPaid: false,
    package: 'Cocktail Reception', selectedMenu: undefined, extraCharges: [],
    enquiryDate: '2026-05-01',
  },
  {
    id: 'BK004', name: 'David Park', email: 'dpark@email.com', phone: '+447700900104',
    eventType: 'Anniversary', date: '2026-07-04', time: '7:00 PM', guests: 120,
    status: 'event_scheduled', notes: 'Plated dinner, open bar. 25th anniversary.',
    baseAmount: 8200, deposit: 2460, depositPaid: true, finalPaymentPaid: false,
    package: 'Premium Plated', selectedMenu: 'Premium Plated', extraCharges: [],
    paymentProofDeposit: 'proof_attached', enquiryDate: '2026-03-15',
  },
  {
    id: 'BK005', name: 'James Wilson', email: 'jwilson@email.com', phone: '+447700900106',
    eventType: 'Wedding', date: '2026-08-22', time: '5:00 PM', guests: 180,
    status: 'deposit_pending', notes: 'Garden theme, outdoor ceremony. Backup plan needed.',
    baseAmount: 15000, deposit: 4500, depositPaid: false, finalPaymentPaid: false,
    package: 'Premium Plated', selectedMenu: 'Premium Plated', extraCharges: [],
    enquiryDate: '2026-04-05',
  },
  {
    id: 'BK006', name: 'Priya Sharma', email: 'priya@email.com', phone: '+447700900107',
    eventType: 'Corporate', date: '2026-05-30', time: '9:00 AM', guests: 60,
    status: 'event_completed', notes: 'Morning conference, continental breakfast.',
    baseAmount: 3200, deposit: 960, depositPaid: true, finalPaymentPaid: false,
    package: 'Classic Buffet', selectedMenu: 'Classic Buffet',
    extraCharges: [{ label: 'Extra 10 guests', amount: 380 }, { label: 'AV Equipment', amount: 150 }],
    paymentProofDeposit: 'proof_attached', enquiryDate: '2026-03-20',
  },
  {
    id: 'BK007', name: 'Carlos Mendez', email: 'carlos@email.com', phone: '+447700900108',
    eventType: 'Birthday', date: '2026-04-08', time: '7:00 PM', guests: 40,
    status: 'completed', notes: 'Surprise party. All went well.',
    baseAmount: 2200, deposit: 2200, depositPaid: true, finalPaymentPaid: true,
    package: 'Cocktail Reception', selectedMenu: 'Cocktail Reception', extraCharges: [],
    paymentProofDeposit: 'proof_attached', paymentProofFinal: 'proof_attached',
    enquiryDate: '2026-02-28',
  },
  {
    id: 'BK008', name: 'Aisha Patel', email: 'aisha@email.com', phone: '+447700900109',
    eventType: 'Wedding', date: '2026-09-12', time: '3:00 PM', guests: 250,
    status: 'menu_selected', notes: 'Traditional ceremony, halal menu required.',
    baseAmount: 18500, deposit: 5550, depositPaid: false, finalPaymentPaid: false,
    package: 'Premium Plated', selectedMenu: 'Premium Plated', extraCharges: [],
    enquiryDate: '2026-04-30',
  },
];



const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function buildWhatsAppLink(phone: string, message: string) {
  const cleaned = phone.replace(/\D/g, '');
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

type AdminTab = 'overview' | 'enquiries' | 'bookings' | 'calendar' | 'customers' | 'payments' | 'menus' | 'history' | 'settings';

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [bookings, setBookings] = useState<Booking[]>(SAMPLE_BOOKINGS);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isEditingBookingDate, setIsEditingBookingDate] = useState(false);
  const [isEditingEventType, setIsEditingEventType] = useState(false);
  const [isEditingPackage, setIsEditingPackage] = useState(false);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [isEditingGuests, setIsEditingGuests] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'booking_requests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveBookings: Booking[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || 'Unknown',
          email: data.email || 'N/A',
          phone: data.phone || 'N/A',
          eventType: data.eventType || 'N/A',
          date: data.date || 'N/A',
          time: data.timeOfDay || 'N/A',
          guests: data.guests || 0,
          status: data.status || 'new_enquiry',
          notes: data.message || '',
          baseAmount: data.baseAmount || 0,
          deposit: data.deposit || 0,
          depositPaid: data.depositPaid || false,
          finalPaymentPaid: data.finalPaymentPaid || false,
          package: data.package || 'Not Selected',
          selectedMenu: data.selectedMenu,
          extraCharges: data.extraCharges || [],
          paymentProofDeposit: data.paymentProofDeposit,
          paymentProofFinal: data.paymentProofFinal,
          enquiryDate: data.createdAt ? new Date(data.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          updatedAt: data.updatedAt,
          createdAt: data.createdAt,
        } as Booking;
      });
      setBookings(liveBookings);
    });
    return () => unsubscribe();
  }, []);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterEvent, setFilterEvent] = useState<string>('all');
  const [loggedIn, setLoggedIn] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setLoggedIn(true);
      } else {
        setLoggedIn(false);
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);
  const [calendarMonth, setCalendarMonth] = useState(4);
  const [calendarYear] = useState(2026);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [extraLabel, setExtraLabel] = useState('');
  const [extraAmount, setExtraAmount] = useState('');
  const [showMenuPanel, setShowMenuPanel] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [customAlert, setCustomAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [isUploadingFinalProof, setIsUploadingFinalProof] = useState(false);

  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [blockDateInput, setBlockDateInput] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'blocked_dates'), (snapshot) => {
      const dates = snapshot.docs.map(doc => doc.id);
      setBlockedDates(dates.sort());
    });
    return () => unsubscribe();
  }, []);

  const [bankDetails, setBankDetails] = useState({
    accountName: 'Honeymoon Events Ltd',
    sortCode: '20-00-00',
    accountNumber: '12345678'
  });

  useEffect(() => {
    return onSnapshot(doc(db, 'site_data', 'bank_details'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBankDetails({
          accountName: data.accountName || 'Honeymoon Events Ltd',
          sortCode: data.sortCode || '20-00-00',
          accountNumber: data.accountNumber || '12345678'
        });
      }
    });
  }, []);

  const [venueDetails, setVenueDetails] = useState({
    venueName: 'Honeymoon Banquet Hall',
    maxCapacity: '500',
    contactEmail: 'hello@honeymoon.com',
    phone: '+44 7700 900000',
    whatsapp: '+447700900000',
    address: '123 Event Plaza, London, UK'
  });

  useEffect(() => {
    return onSnapshot(doc(db, 'site_data', 'venue_details'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setVenueDetails({
          venueName: data.venueName || 'Honeymoon Banquet Hall',
          maxCapacity: data.maxCapacity || '500',
          contactEmail: data.contactEmail || 'hello@honeymoon.com',
          phone: data.phone || '+44 7700 900000',
          whatsapp: data.whatsapp || '+447700900000',
          address: data.address || '123 Event Plaza, London, UK'
        });
      }
    });
  }, []);

  // ─── REAL MENU EDITABLE STATE ─────────────────────────────────────────────
  type AdminMenuTab = 'banquet' | 'indian' | 'srilankan' | 'live';
  const [adminMenuTab, setAdminMenuTab] = useState<AdminMenuTab>('banquet');

  // Editable banquet packages
  const [editableBanquetPackages, setEditableBanquetPackages] = useState(
    BANQUET_PACKAGES.map(pkg => ({ ...pkg, desserts: [...pkg.desserts], drinks: [...pkg.drinks] }))
  );
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [editingPackageData, setEditingPackageData] = useState<typeof BANQUET_PACKAGES[0] | null>(null);

  // Editable Indian menu
  const [editableIndianMenu, setEditableIndianMenu] = useState({
    vegStarters: [...INDIAN_MENU.starters.vegetarian],
    nonVegStarters: [...INDIAN_MENU.starters.nonVegetarian],
    vegMains: [...INDIAN_MENU.mains.vegetarian],
    nonVegMains: [...INDIAN_MENU.mains.nonVegetarian],
    sundries: [...INDIAN_MENU.sundries],
    desserts: [...INDIAN_MENU.desserts],
  });

  // Editable Sri Lankan menu
  const [editableSLMenu, setEditableSLMenu] = useState({
    vegStarters: [...SRI_LANKAN_MENU.starters.vegetarian],
    nonVegStarters: [...SRI_LANKAN_MENU.starters.nonVegetarian],
    vegMains: [...SRI_LANKAN_MENU.mains.vegetarian],
    nonVegMains: [...SRI_LANKAN_MENU.mains.nonVegetarian],
    sundries: [...SRI_LANKAN_MENU.sundries],
    desserts: [...SRI_LANKAN_MENU.desserts],
  });

  // Editable live counter
  const [editableLiveCounter, setEditableLiveCounter] = useState({
    srilankanSouthIndian: LIVE_COUNTER_PACKAGE.srilankanSouthIndian.map(i => ({ ...i })),
    northIndian: LIVE_COUNTER_PACKAGE.northIndian.map(i => ({ ...i })),
    extras: LIVE_COUNTER_PACKAGE.extras.map(i => ({ ...i })),
  });

  // Editable venue/table/kids
  const [editableVenueCharges, setEditableVenueCharges] = useState(VENUE_HALL_CHARGES.map(v => ({ ...v })));
  const [editableTableService, setEditableTableService] = useState(TABLE_SERVICE.map(t => ({ ...t })));
  const [editableKidsPricing, setEditableKidsPricing] = useState(KIDS_PRICING.map(k => ({ ...k })));
  const [editableDryHirePrices, setEditableDryHirePrices] = useState(DRY_HIRE_PRICES.map(p => ({ ...p })));

  // New item inputs
  const [newMenuItemInput, setNewMenuItemInput] = useState('');
  const [newLiveItemName, setNewLiveItemName] = useState('');
  const [newLiveItemPrice, setNewLiveItemPrice] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'site_data', 'menus'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.INDIAN_MENU) {
          setEditableIndianMenu({
            vegStarters: data.INDIAN_MENU.starters?.vegetarian || [],
            nonVegStarters: data.INDIAN_MENU.starters?.nonVegetarian || [],
            vegMains: data.INDIAN_MENU.mains?.vegetarian || [],
            nonVegMains: data.INDIAN_MENU.mains?.nonVegetarian || [],
            sundries: data.INDIAN_MENU.sundries || [],
            desserts: data.INDIAN_MENU.desserts || [],
          });
        }
        if (data.SRI_LANKAN_MENU) {
          setEditableSLMenu({
            vegStarters: data.SRI_LANKAN_MENU.starters?.vegetarian || [],
            nonVegStarters: data.SRI_LANKAN_MENU.starters?.nonVegetarian || [],
            vegMains: data.SRI_LANKAN_MENU.mains?.vegetarian || [],
            nonVegMains: data.SRI_LANKAN_MENU.mains?.nonVegetarian || [],
            sundries: data.SRI_LANKAN_MENU.sundries || [],
            desserts: data.SRI_LANKAN_MENU.desserts || [],
          });
        }
        if (data.LIVE_COUNTER_PACKAGE) setEditableLiveCounter(data.LIVE_COUNTER_PACKAGE);
        if (data.BANQUET_PACKAGES) setEditableBanquetPackages(data.BANQUET_PACKAGES);
        if (data.VENUE_HALL_CHARGES) setEditableVenueCharges(data.VENUE_HALL_CHARGES);
        if (data.TABLE_SERVICE) setEditableTableService(data.TABLE_SERVICE);
        if (data.KIDS_PRICING) setEditableKidsPricing(data.KIDS_PRICING);
        if (data.DRY_HIRE_PRICES) setEditableDryHirePrices(data.DRY_HIRE_PRICES);
      }
    });
    return () => unsub();
  }, []);

  const [isSavingMenus, setIsSavingMenus] = useState(false);
  const saveAllMenusToDatabase = async () => {
    setIsSavingMenus(true);
    try {
      await setDoc(doc(db, 'site_data', 'menus'), {
        INDIAN_MENU: {
          name: 'Indian Menu',
          starters: {
            vegetarian: editableIndianMenu.vegStarters,
            nonVegetarian: editableIndianMenu.nonVegStarters,
          },
          mains: {
            vegetarian: editableIndianMenu.vegMains,
            nonVegetarian: editableIndianMenu.nonVegMains,
          },
          sundries: editableIndianMenu.sundries,
          desserts: editableIndianMenu.desserts,
          allergyNotice: 'Food Prepared in our restaurant may contain following ingredients such as Milk, Egg, Wheat, Gluten, Crustaceans, Lupin, Mustard, Nuts, Sulphur',
        },
        SRI_LANKAN_MENU: {
          name: 'Sri Lankan Menu',
          starters: {
            vegetarian: editableSLMenu.vegStarters,
            nonVegetarian: editableSLMenu.nonVegStarters,
          },
          mains: {
            vegetarian: editableSLMenu.vegMains,
            nonVegetarian: editableSLMenu.nonVegMains,
          },
          sundries: editableSLMenu.sundries,
          desserts: editableSLMenu.desserts,
          allergyNotice: 'Food Prepared in our restaurant may contain following ingredients such as Milk, Egg, Wheat, Gluten, Crustaceans, Lupin, Mustard, Nuts, Sulphur',
        },
        LIVE_COUNTER_PACKAGE: editableLiveCounter,
        BANQUET_PACKAGES: editableBanquetPackages,
        VENUE_HALL_CHARGES: editableVenueCharges,
        TABLE_SERVICE: editableTableService,
        KIDS_PRICING: editableKidsPricing,
        DRY_HIRE_PRICES: editableDryHirePrices,
      }, { merge: true });
      setCustomAlert({ message: 'Menus successfully updated on the website!', type: 'success' });
    } catch (error) {
      console.error(error);
      setCustomAlert({ message: 'Error saving menus.', type: 'error' });
    } finally {
      setIsSavingMenus(false);
    }
  };

  const startEditPackage = (pkg: typeof BANQUET_PACKAGES[0]) => {
    setEditingPackageId(pkg.id);
    setEditingPackageData({ ...pkg, desserts: [...pkg.desserts], drinks: [...pkg.drinks] });
  };

  const saveEditPackage = () => {
    if (!editingPackageData) return;
    setEditableBanquetPackages(prev => prev.map(p => p.id === editingPackageData.id ? { ...editingPackageData } : p));
    setEditingPackageId(null);
    setEditingPackageData(null);
  };

  const buildMenuWhatsAppText = (customerName: string, customerPhone: string, menuType: string, guestCount: number) => {
    let text = `Hi ${customerName}, here are our *${menuType}* options from Honeymoon:\n\n`;
    if (menuType === 'Indian Menu') {
      text += `🥗 *Vegetarian Starters:*\n${(editableIndianMenu.vegStarters || []).map(i => `• ${i}`).join('\n')}\n\n`;
      text += `🍗 *Non-Veg Starters:*\n${(editableIndianMenu.nonVegStarters || []).map(i => `• ${i}`).join('\n')}\n\n`;
      text += `🍛 *Vegetarian Mains:*\n${(editableIndianMenu.vegMains || []).map(i => `• ${i}`).join('\n')}\n\n`;
      text += `🍖 *Non-Veg Mains:*\n${(editableIndianMenu.nonVegMains || []).map(i => `• ${i}`).join('\n')}\n\n`;
      text += `🍮 *Desserts:*\n${(editableIndianMenu.desserts || []).map(i => `• ${i}`).join('\n')}\n\n`;
    } else if (menuType === 'Sri Lankan Menu') {
      text += `🥗 *Vegetarian Starters:*\n${(editableSLMenu.vegStarters || []).map(i => `• ${i}`).join('\n')}\n\n`;
      text += `🍗 *Non-Veg Starters:*\n${(editableSLMenu.nonVegStarters || []).map(i => `• ${i}`).join('\n')}\n\n`;
      text += `🍛 *Vegetarian Mains:*\n${(editableSLMenu.vegMains || []).map(i => `• ${i}`).join('\n')}\n\n`;
      text += `🍖 *Non-Veg Mains:*\n${(editableSLMenu.nonVegMains || []).map(i => `• ${i}`).join('\n')}\n\n`;
      text += `🍮 *Desserts:*\n${(editableSLMenu.desserts || []).map(i => `• ${i}`).join('\n')}\n\n`;
    }
    text += `Please reply with your preferred selections. We look forward to serving you! 🙏`;
    return buildWhatsAppLink(customerPhone, text);
  };

  const buildCompletedWhatsAppText = (booking: Booking) => {
    const total = getTotalAmount(booking).toLocaleString();
    const deposit = booking.deposit.toLocaleString();
    const balance = (getTotalAmount(booking) - booking.deposit).toLocaleString();
    
    return `Hi ${booking.name.split(' ')[0]},

Thank you so much for booking with Honeymoon Events! 🎊 Your event was a success and your booking is now fully completed.

*📝 Event Summary:*
• Event: ${booking.eventType}
• Date: ${booking.date}
• Guests: ${booking.guests}

*💰 Final Invoice Details:*
• Total Amount: £${total}
• Deposit Paid: £${deposit}
• Final Balance Paid: £${balance}
• Status: *Paid in Full ✅*

It was an absolute pleasure serving you. We hope you and your guests had a wonderful time! We'd love to host your future events. 🙏✨`;
  };

  const buildFinalInvoiceWhatsAppText = (booking: Booking, bank: typeof bankDetails) => {
    let extrasText = '';
    if (booking.extraCharges && booking.extraCharges.length > 0) {
      extrasText = '\n\n*➕ Additional Adjustments:*\n' + booking.extraCharges.map(c => `• ${c.label}: £${c.amount.toLocaleString()}`).join('\n');
    }

    return `Hi ${booking.name.split(' ')[0]}, thank you for choosing Honeymoon Events for your ${booking.eventType}! 🎉\n\nHere is your final invoice summary:\n\n*📋 Booking Ref:* ${booking.id}\n*💰 Base Amount:* £${booking.baseAmount.toLocaleString()}${extrasText}\n\n*✅ Deposit Paid:* -£${booking.deposit.toLocaleString()}\n\n*⚖️ Balance Due: £${(getTotalAmount(booking) - booking.deposit).toLocaleString()}*\n\nPlease transfer the balance to:\n🏦 Account Name: ${bank.accountName}\n📋 Sort Code: ${bank.sortCode}\n🔢 Account No: ${bank.accountNumber}\n📌 Reference: ${booking.id}\n\nOnce paid, please send a screenshot of the transfer confirmation here. Thank you!`;
  };

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);
      setLoggedIn(true);
      setLoginError('');
    } catch (error) {
      console.error(error);
      setLoginError('Invalid credentials or user not found in Firebase Authentication.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const updateStatus = async (id: string, status: BookingStatus) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
    setSelectedBooking(prev => prev?.id === id ? { ...prev, status } : prev);
    try {
      await setDoc(doc(db, 'booking_requests', id), { status }, { merge: true });
      if (status !== 'new_enquiry') {
        const currentBooking = bookings.find(b => b.id === id);
        if (currentBooking) {
          const bookingData = {
            ...currentBooking,
            status,
            updatedAt: new Date().toISOString()
          };
          const cleanBookingData = Object.fromEntries(
            Object.entries(bookingData).filter(([_, v]) => v !== undefined)
          );
          await setDoc(doc(db, 'bookings', id), cleanBookingData, { merge: true });
        }
      }
    } catch (error) {
      console.error('Error updating status in database:', error);
    }
  };

  const advanceStatus = async (booking: Booking) => {
    const idx = STATUS_FLOW.indexOf(booking.status);
    if (idx < STATUS_FLOW.length - 1) {
      await updateStatus(booking.id, STATUS_FLOW[idx + 1]);
    }
  };

  const handleGoBackStatus = async (id: string) => {
    const currentBooking = bookings.find(b => b.id === id);
    if (!currentBooking) return;
    const idx = STATUS_FLOW.indexOf(currentBooking.status);
    if (idx > 0) {
      const prevStatus = STATUS_FLOW[idx - 1];
      await updateStatus(id, prevStatus);
    }
  };

  const confirmDepositPaid = async (id: string) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, depositPaid: true, status: 'deposit_confirmed' } : b));
    setSelectedBooking(prev => prev?.id === id ? { ...prev, depositPaid: true, status: 'deposit_confirmed' } : prev);
    try {
      await setDoc(doc(db, 'booking_requests', id), { depositPaid: true, status: 'deposit_confirmed' }, { merge: true });
      const currentBooking = bookings.find(b => b.id === id);
      if (currentBooking) {
        const bookingData = {
          ...currentBooking,
          depositPaid: true,
          status: 'deposit_confirmed',
          updatedAt: new Date().toISOString()
        };
        const cleanBookingData = Object.fromEntries(
          Object.entries(bookingData).filter(([_, v]) => v !== undefined)
        );
        await setDoc(doc(db, 'bookings', id), cleanBookingData, { merge: true });
      }
    } catch (error) {
      console.error('Error confirming deposit paid in database:', error);
    }
  };

  const handleUploadProof = async (id: string, file: File) => {
    setIsUploadingProof(true);
    try {
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
      ctx?.drawImage(img, 0, 0, width, height);
      
      const base64String = canvas.toDataURL('image/jpeg', 0.7);

      setBookings(prev => prev.map(b => b.id === id ? { ...b, paymentProofDeposit: base64String } : b));
      setSelectedBooking(prev => prev?.id === id ? { ...prev, paymentProofDeposit: base64String } : prev);

      await setDoc(doc(db, 'booking_requests', id), { paymentProofDeposit: base64String }, { merge: true });
      const currentBooking = bookings.find(b => b.id === id);
      if (currentBooking) {
        const bookingData = {
          ...currentBooking,
          paymentProofDeposit: base64String,
          updatedAt: new Date().toISOString()
        };
        
        // Remove undefined values which Firestore rejects
        const cleanBookingData = Object.fromEntries(
          Object.entries(bookingData).filter(([_, v]) => v !== undefined)
        );
        
        await setDoc(doc(db, 'bookings', id), cleanBookingData, { merge: true });
      }
      setCustomAlert({ message: 'Payment proof uploaded successfully!', type: 'success' });
    } catch (error: any) {
      console.error('Error uploading payment proof:', error);
      setCustomAlert({ message: `Error uploading payment proof: ${error.message || 'Unknown error'}`, type: 'error' });
    } finally {
      setIsUploadingProof(false);
    }
  };

  const handleUploadFinalProof = async (id: string, file: File) => {
    setIsUploadingFinalProof(true);
    try {
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
      ctx?.drawImage(img, 0, 0, width, height);
      
      const base64String = canvas.toDataURL('image/jpeg', 0.7);

      setBookings(prev => prev.map(b => b.id === id ? { ...b, paymentProofFinal: base64String } : b));
      setSelectedBooking(prev => prev?.id === id ? { ...prev, paymentProofFinal: base64String } : prev);

      await setDoc(doc(db, 'booking_requests', id), { paymentProofFinal: base64String }, { merge: true });
      const currentBooking = bookings.find(b => b.id === id);
      if (currentBooking) {
        const bookingData = {
          ...currentBooking,
          paymentProofFinal: base64String,
          updatedAt: new Date().toISOString()
        };
        
        const cleanBookingData = Object.fromEntries(
          Object.entries(bookingData).filter(([_, v]) => v !== undefined)
        );
        
        await setDoc(doc(db, 'bookings', id), cleanBookingData, { merge: true });
      }
      setCustomAlert({ message: 'Final payment proof uploaded successfully!', type: 'success' });
    } catch (error: any) {
      console.error('Error uploading final payment proof:', error);
      setCustomAlert({ message: `Error uploading final payment proof: ${error.message || 'Unknown error'}`, type: 'error' });
    } finally {
      setIsUploadingFinalProof(false);
    }
  };

  const confirmFinalPayment = async (id: string) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, finalPaymentPaid: true, status: 'completed' } : b));
    setSelectedBooking(prev => prev?.id === id ? { ...prev, finalPaymentPaid: true, status: 'completed' } : prev);
    try {
      await setDoc(doc(db, 'booking_requests', id), { finalPaymentPaid: true, status: 'completed' }, { merge: true });
      const currentBooking = bookings.find(b => b.id === id);
      if (currentBooking) {
        const bookingData = {
          ...currentBooking,
          finalPaymentPaid: true,
          status: 'completed',
          updatedAt: new Date().toISOString()
        };
        const cleanBookingData = Object.fromEntries(
          Object.entries(bookingData).filter(([_, v]) => v !== undefined)
        );
        await setDoc(doc(db, 'bookings', id), cleanBookingData, { merge: true });
      }
    } catch (error) {
      console.error('Error confirming final payment in database:', error);
    }
  };

  const addExtraCharge = async (id: string) => {
    if (!extraLabel || !extraAmount) return;
    const charge: ExtraCharge = { label: extraLabel, amount: parseFloat(extraAmount) };
    const currentBooking = bookings.find(b => b.id === id);
    if (!currentBooking) return;
    const newExtraCharges = [...(currentBooking.extraCharges || []), charge];

    setBookings(prev => prev.map(b => b.id === id ? { ...b, extraCharges: newExtraCharges } : b));
    setSelectedBooking(prev => prev?.id === id ? { ...prev, extraCharges: newExtraCharges } : prev);
    setExtraLabel('');
    setExtraAmount('');

    try {
      await setDoc(doc(db, 'booking_requests', id), { extraCharges: newExtraCharges }, { merge: true });
      const bookingData = {
        ...currentBooking,
        extraCharges: newExtraCharges,
        updatedAt: new Date().toISOString()
      };
      const cleanBookingData = Object.fromEntries(
        Object.entries(bookingData).filter(([_, v]) => v !== undefined)
      );
      await setDoc(doc(db, 'bookings', id), cleanBookingData, { merge: true });
    } catch (error) {
      console.error('Error adding extra charge to database:', error);
    }
  };

  const removeExtraCharge = async (bookingId: string, idx: number) => {
    const currentBooking = bookings.find(b => b.id === bookingId);
    if (!currentBooking) return;
    const newExtraCharges = (currentBooking.extraCharges || []).filter((_, i) => i !== idx);

    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, extraCharges: newExtraCharges } : b));
    setSelectedBooking(prev => prev?.id === bookingId ? { ...prev, extraCharges: newExtraCharges } : prev);

    try {
      await setDoc(doc(db, 'booking_requests', bookingId), { extraCharges: newExtraCharges }, { merge: true });
      const bookingData = {
        ...currentBooking,
        extraCharges: newExtraCharges,
        updatedAt: new Date().toISOString()
      };
      const cleanBookingData = Object.fromEntries(
        Object.entries(bookingData).filter(([_, v]) => v !== undefined)
      );
      await setDoc(doc(db, 'bookings', bookingId), cleanBookingData, { merge: true });
    } catch (error) {
      console.error('Error removing extra charge from database:', error);
    }
  };

  const handleBlockDate = async () => {
    if (!blockDateInput) return;
    try {
      await setDoc(doc(db, 'blocked_dates', blockDateInput), { date: blockDateInput });
      setBlockDateInput('');
    } catch (error) {
      console.error('Error blocking date:', error);
    }
  };

  const handleUnblockDate = async (dateStr: string) => {
    try {
      await deleteDoc(doc(db, 'blocked_dates', dateStr));
    } catch (error) {
      console.error('Error unblocking date:', error);
    }
  };

  const updateBankDetail = async (field: string, value: string) => {
    const updated = { ...bankDetails, [field]: value };
    setBankDetails(updated);
    try {
      await setDoc(doc(db, 'site_data', 'bank_details'), updated, { merge: true });
    } catch (error) {
      console.error('Error saving bank details:', error);
    }
  };

  const [isSavingVenueDetails, setIsSavingVenueDetails] = useState(false);

  const saveVenueDetails = async () => {
    setIsSavingVenueDetails(true);
    try {
      await setDoc(doc(db, 'site_data', 'venue_details'), venueDetails, { merge: true });
      setCustomAlert({ message: 'Venue details successfully updated on the website!', type: 'success' });
    } catch (error) {
      console.error('Error saving venue details:', error);
      setCustomAlert({ message: 'Error saving venue details.', type: 'error' });
    } finally {
      setIsSavingVenueDetails(false);
    }
  };

  const getTotalAmount = (b: Booking) => b.baseAmount + b.extraCharges.reduce((s, c) => s + c.amount, 0);

  const enquiries = bookings.filter(b => b.status === 'new_enquiry');
  const activeBookings = bookings.filter(b => b.status !== 'new_enquiry' && b.status !== 'completed');
  const completedBookings = bookings.filter(b => b.status === 'completed').sort((a, b) => {
    const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.date).getTime());
    const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.date).getTime());
    return bTime - aTime;
  });

  // Derive real-time customers dynamically from the live bookings list
  const customers: Customer[] = useMemo(() => {
    const customerMap: Record<string, Customer> = {};

    bookings.forEach((b) => {
      const nameKey = (b.name || 'Unknown').trim().toLowerCase();
      const contactKey = (b.email || b.phone || '').trim().toLowerCase();
      const key = `${nameKey}_${contactKey}`;
      if (!key) return;

      const eventCost = getTotalAmount(b);
      const isDepositPaid = b.depositPaid || b.status === 'deposit_confirmed' || b.status === 'event_scheduled' || b.status === 'event_completed' || b.status === 'final_invoice_sent' || b.status === 'final_payment_received' || b.status === 'completed';
      const spent = isDepositPaid ? eventCost : 0;
      const isActive = b.status !== 'completed';

      if (!customerMap[key]) {
        customerMap[key] = {
          id: key,
          name: b.name || 'Unknown',
          email: b.email || 'N/A',
          phone: b.phone || 'N/A',
          totalBookings: 1,
          totalSpent: spent,
          lastEvent: b.date || 'N/A',
          status: isActive ? 'active' : 'inactive'
        };
      } else {
        const existing = customerMap[key];
        existing.totalBookings += 1;
        existing.totalSpent += spent;
        
        if (b.date && b.date > existing.lastEvent) {
          existing.lastEvent = b.date;
        }
        
        if (isActive) {
          existing.status = 'active';
        }
      }
    });

    return Object.values(customerMap);
  }, [bookings]);

  const stats = {
    total: bookings.length,
    newEnquiries: enquiries.length,
    active: activeBookings.length,
    completed: completedBookings.length,
    revenue: bookings.filter(b => b.status === 'completed').reduce((s, b) => s + getTotalAmount(b), 0),
    depositsCollected: bookings.filter(b => b.depositPaid).reduce((s, b) => s + b.deposit, 0),
    outstanding: bookings.filter(b => b.depositPaid && !b.finalPaymentPaid && b.status !== 'new_enquiry').reduce((s, b) => s + (getTotalAmount(b) - b.deposit), 0),
  };

  const eventTypes = [...new Set(bookings.map(b => b.eventType))];

  const filtered = bookings.filter(b => {
    const statusMatch = filterStatus === 'all' || b.status === filterStatus;
    const eventMatch = filterEvent === 'all' || b.eventType === filterEvent;
    return statusMatch && eventMatch;
  });

  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);
  const calendarBookings = bookings.filter(b => {
    const d = new Date(b.date);
    return d.getFullYear() === calendarYear && d.getMonth() === calendarMonth && b.status !== 'new_enquiry';
  });

  const getBookingsForDay = (day: number) => {
    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return calendarBookings.filter(b => b.date === dateStr);
  };

  const navItems: { id: AdminTab; label: string; icon: string; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: 'Squares2X2Icon' },
    { id: 'enquiries', label: 'Enquiries', icon: 'InboxIcon', badge: stats.newEnquiries },
    { id: 'bookings', label: 'Bookings', icon: 'CalendarDaysIcon', badge: activeBookings.length || undefined },
    { id: 'calendar', label: 'Calendar', icon: 'CalendarIcon' },
    { id: 'customers', label: 'Customers', icon: 'UsersIcon' },
    { id: 'payments', label: 'Payments', icon: 'CreditCardIcon' },
    { id: 'menus', label: 'Menus', icon: 'ClipboardDocumentListIcon' },
    { id: 'history', label: 'History', icon: 'ArchiveBoxIcon' },
    { id: 'settings', label: 'Settings', icon: 'Cog6ToothIcon' },
  ];

  // ─── AUTHENTICATION LOADING ────────────────────────────────────────────────
  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1A0F00 0%, #2C1A00 50%, #3D2800 100%)' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#C8860A] border-t-transparent" />
      </div>
    );
  }

  // ─── LOGIN ────────────────────────────────────────────────────────────────
  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'linear-gradient(135deg, #1A0F00 0%, #2C1A00 50%, #3D2800 100%)' }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #F0A830, transparent)' }} />
          <div className="absolute bottom-20 right-20 w-80 h-80 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #C8860A, transparent)' }} />
        </div>
        <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
          <div className="flex flex-col items-center mb-6">
            <img
              src="/assets/images/oie_gAxqzQFu0Ixw-1777831503416.png"
              alt="Honeymoon logo"
              style={{ maxHeight: '60px', width: 'auto', objectFit: 'contain' }}
              className="mb-1"
            />
            <p className="text-sm text-gray-400 mt-1">Admin Portal</p>
          </div>
          <div className="border-t border-gray-100 mb-6" />
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email Address</label>
              <input type="email" required value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-gray-50" placeholder="honeymoonadmin@gmail.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Password</label>
              <input type="password" required value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-gray-50" placeholder="••••••••" />
            </div>
            {loginError && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-600 text-xs">{loginError}</div>}
            <button type="submit" disabled={isLoggingIn} className="w-full text-white font-semibold py-2.5 rounded-xl transition-all text-sm shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed" style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}>
              {isLoggingIn ? 'Signing In...' : 'Sign In to Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── DASHBOARD ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-60 flex-shrink-0 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`} style={{ background: 'linear-gradient(180deg, #1A0F00 0%, #2C1A00 100%)' }}>
        <div className="px-5 py-4 border-b flex items-center gap-2.5" style={{ borderColor: '#3D2800' }}>
          <div>
            <img
              src="/assets/images/oie_gAxqzQFu0Ixw-1777831503416.png"
              alt="Honeymoon logo"
              style={{ maxHeight: '40px', width: 'auto', objectFit: 'contain' }}
            />
            <div className="text-xs mt-1" style={{ color: '#A08060' }}>Admin Dashboard</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === item.id ? 'text-white shadow-md' : 'hover:text-white'}`}
              style={activeTab === item.id ? { background: 'linear-gradient(135deg, #C8860A, #F0A830)', color: 'white' } : { color: '#A08060' }}>
              <Icon name={item.icon as 'CalendarDaysIcon'} size={17} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge ? <span className="bg-amber-400 text-amber-900 text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{item.badge}</span> : null}
            </button>
          ))}
        </nav>
        <div className="px-3 py-4 border-t" style={{ borderColor: '#3D2800' }}>
          <div className="flex items-center gap-2 px-3 py-2 mb-1">
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(200,134,10,0.2)' }}>
              <Icon name="UserCircleIcon" size={16} style={{ color: '#F0A830' }} />
            </div>
            <div>
              <div className="text-white text-xs font-medium">Admin</div>
              <div className="text-xs" style={{ color: '#A08060' }}>honeymoonadmin@gmail.com</div>
            </div>
          </div>
          <button 
            onClick={async () => {
              try {
                await signOut(auth);
                setLoggedIn(false);
              } catch (error) {
                console.error("Error signing out:", error);
              }
            }} 
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors hover:text-white" 
            style={{ color: '#A08060' }}
          >
            <Icon name="ArrowRightOnRectangleIcon" size={17} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto min-w-0">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button className="md:hidden text-gray-500 hover:text-gray-700" onClick={() => setSidebarOpen(true)}>
              <Icon name="Bars3Icon" size={22} />
            </button>
            <div>
              <h1 className="text-base font-semibold text-gray-900 capitalize">{navItems.find(n => n.id === activeTab)?.label}</h1>
              <p className="text-xs text-gray-400 hidden sm:block">
                {activeTab === 'overview' && 'Business at a glance'}
                {activeTab === 'enquiries' && `${stats.newEnquiries} new enquiries awaiting action`}
                {activeTab === 'bookings' && `${activeBookings.length} active bookings in progress`}
                {activeTab === 'calendar' && `${MONTHS[calendarMonth]} ${calendarYear}`}
                {activeTab === 'customers' && `${customers.length} registered customers`}
                {activeTab === 'payments' && 'Track deposits and balances'}
                {activeTab === 'menus' && 'Manage catering packages'}
                {activeTab === 'history' && `${completedBookings.length} completed bookings`}
                {activeTab === 'settings' && 'Venue configuration'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {stats.newEnquiries > 0 && (
              <button onClick={() => setActiveTab('enquiries')} className="hidden sm:flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                {stats.newEnquiries} new
              </button>
            )}
          </div>
        </div>

        <div className="p-4 md:p-6">

          {/* ─── OVERVIEW ─── */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'New Enquiries', value: stats.newEnquiries, icon: 'InboxIcon', color: 'text-blue-600', bg: 'bg-blue-50', change: 'Awaiting action', onClick: () => setActiveTab('enquiries') },
                  { label: 'Active Bookings', value: stats.active, icon: 'CalendarDaysIcon', color: 'text-amber-600', bg: 'bg-amber-50', change: 'In progress', onClick: () => setActiveTab('bookings') },
                  { label: 'Completed Events', value: stats.completed, icon: 'CheckCircleIcon', color: 'text-emerald-600', bg: 'bg-emerald-50', change: 'All time', onClick: () => setActiveTab('history') },
                  { label: 'Revenue Collected', value: `£${stats.depositsCollected.toLocaleString()}`, icon: 'BanknotesIcon', color: 'text-yellow-700', bg: 'bg-yellow-50', change: `£${stats.outstanding.toLocaleString()} outstanding`, onClick: () => setActiveTab('payments') },
                ].map((stat) => (
                  <button key={stat.label} onClick={stat.onClick} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow text-left">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`${stat.bg} p-2 rounded-lg`}>
                        <Icon name={stat.icon as 'CalendarDaysIcon'} size={18} className={stat.color} />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-0.5">{stat.value}</div>
                    <div className="text-xs font-medium text-gray-500">{stat.label}</div>
                    <div className="text-xs text-gray-400 mt-1">{stat.change}</div>
                  </button>
                ))}
              </div>

              {/* Status pipeline */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-900 text-sm mb-4">Booking Status Pipeline</h2>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {STATUS_FLOW.slice(0, 10).map((s) => {
                    const count = bookings.filter(b => b.status === s).length;
                    return (
                      <div key={s} className={`rounded-xl p-3 border text-center ${count > 0 ? STATUS_COLORS[s] : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                        <div className="text-xl font-bold">{count}</div>
                        <div className="text-xs font-medium mt-0.5 leading-tight">{STATUS_LABELS[s]}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* New enquiries */}
                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900 text-sm">New Enquiries</h2>
                    <button onClick={() => setActiveTab('enquiries')} className="text-xs font-medium hover:underline" style={{ color: '#C8860A' }}>View all</button>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {enquiries.slice(0, 3).map((b) => (
                      <div key={b.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(200,134,10,0.1)' }}>
                          <span className="text-xs font-bold" style={{ color: '#C8860A' }}>{b.name.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{b.name}</div>
                          <div className="text-xs text-gray-400">{b.eventType} · {b.date} · {b.guests} guests</div>
                        </div>
                        <a href={buildWhatsAppLink(b.phone, `Hi ${b.name.split(' ')[0]}, thank you for your enquiry with Honeymoon! We'd love to help with your ${b.eventType}. Could you confirm your preferred date and guest count?`)} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors flex-shrink-0"
                          style={{ background: '#25D366', color: 'white' }}>
                          <Icon name="ChatBubbleLeftRightIcon" size={13} />
                          WhatsApp
                        </a>
                      </div>
                    ))}
                    {enquiries.length === 0 && <div className="px-5 py-8 text-center text-sm text-gray-400">No new enquiries</div>}
                  </div>
                </div>

                {/* Upcoming events */}
                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900 text-sm">Upcoming Events</h2>
                    <button onClick={() => setActiveTab('calendar')} className="text-xs font-medium hover:underline" style={{ color: '#C8860A' }}>Calendar</button>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {bookings.filter(b => b.status === 'event_scheduled').sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4).map((b) => {
                      const d = new Date(b.date);
                      return (
                        <div key={b.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                          <div className="w-10 text-center flex-shrink-0 rounded-lg py-1" style={{ background: 'rgba(200,134,10,0.08)' }}>
                            <div className="text-xs font-medium uppercase" style={{ color: '#C8860A' }}>{MONTHS[d.getMonth()]}</div>
                            <div className="text-lg font-bold leading-tight" style={{ color: '#A06A05' }}>{d.getDate()}</div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{b.name}</div>
                            <div className="text-xs text-gray-400">{b.eventType} · {b.time} · {b.guests} guests</div>
                          </div>
                          <div className="text-sm font-semibold text-gray-700 flex-shrink-0">£{getTotalAmount(b).toLocaleString()}</div>
                        </div>
                      );
                    })}
                    {bookings.filter(b => b.status === 'event_scheduled').length === 0 && (
                      <div className="px-5 py-8 text-center text-sm text-gray-400">No scheduled events</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── ENQUIRIES ─── */}
          {activeTab === 'enquiries' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{enquiries.length} new enquiries awaiting your response</p>
              </div>
              {enquiries.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
                  <Icon name="InboxIcon" size={36} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-400 text-sm">No new enquiries right now</p>
                </div>
              )}
              {enquiries.map((b) => (
                <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(200,134,10,0.1)' }}>
                        <span className="text-base font-bold" style={{ color: '#C8860A' }}>{b.name.charAt(0)}</span>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{b.name}</div>
                        <div className="text-xs text-gray-400">{b.email} · {b.phone}</div>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[b.status]}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[b.status]}`} />
                      {STATUS_LABELS[b.status]}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Event Type', value: b.eventType },
                      { label: 'Date', value: b.date },
                      { label: 'Guests', value: `${b.guests} people` },
                      { label: 'Enquiry Date', value: b.enquiryDate },
                    ].map((f) => (
                      <div key={f.label} className="bg-gray-50 rounded-lg p-2.5">
                        <div className="text-xs text-gray-400 mb-0.5">{f.label}</div>
                        <div className="text-sm font-medium text-gray-800">{f.value}</div>
                      </div>
                    ))}
                  </div>

                  {b.notes && (
                    <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg px-4 py-2.5 text-sm text-amber-800">{b.notes}</div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <a href={buildWhatsAppLink(b.phone, `Hi ${b.name.split(' ')[0]}, thank you for your enquiry with Honeymoon! We'd love to help with your ${b.eventType} on ${b.date}. Let me share our menu packages with you shortly.`)}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                      style={{ background: '#25D366', color: 'white' }}>
                      <Icon name="ChatBubbleLeftRightIcon" size={14} />
                      Reply on WhatsApp
                    </a>
                    <button onClick={() => { updateStatus(b.id, 'menu_sent'); setShowMenuPanel(true); setSelectedBooking(b); }}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors"
                      style={{ borderColor: '#C8860A', color: '#C8860A' }}>
                      <Icon name="ClipboardDocumentListIcon" size={14} />
                      Send Menu & Advance
                    </button>
                    <button onClick={() => setSelectedBooking(b)}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                      <Icon name="EyeIcon" size={14} />
                      Full Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ─── BOOKINGS ─── */}
          {activeTab === 'bookings' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5 flex-wrap">
                  <Icon name="FunnelIcon" size={14} className="text-gray-400" />
                  <span className="text-xs text-gray-500 font-medium">Status:</span>
                  {['all', ...STATUS_FLOW.filter(s => s !== 'new_enquiry' && s !== 'completed')].map((s) => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${filterStatus === s ? 'text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                      style={filterStatus === s ? { background: 'linear-gradient(135deg, #C8860A, #F0A830)' } : {}}>
                      {s === 'all' ? 'All' : STATUS_LABELS[s as BookingStatus]}
                    </button>
                  ))}
                </div>
                <select value={filterEvent} onChange={(e) => setFilterEvent(e.target.value)} className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-600 focus:outline-none">
                  <option value="all">All Event Types</option>
                  {eventTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[750px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Customer</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Event</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Amount</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">WhatsApp</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtered.filter(b => b.status !== 'new_enquiry' && b.status !== 'completed').map((booking) => (
                        <tr key={booking.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(200,134,10,0.1)' }}>
                                <span className="text-xs font-bold" style={{ color: '#C8860A' }}>{booking.name.charAt(0)}</span>
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 text-sm">{booking.name}</div>
                                <div className="text-xs text-gray-400">{booking.phone}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="text-sm text-gray-700">{booking.eventType}</div>
                            <div className="text-xs text-gray-400">{booking.package}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="text-sm text-gray-700">{booking.date}</div>
                            <div className="text-xs text-gray-400">{booking.time}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="text-sm font-semibold text-gray-900">£{getTotalAmount(booking).toLocaleString()}</div>
                            {booking.depositPaid && <div className="text-xs text-emerald-600">Dep. paid</div>}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[booking.status]}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[booking.status]}`} />
                              {STATUS_LABELS[booking.status]}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <a href={buildWhatsAppLink(booking.phone, `Hi ${booking.name.split(' ')[0]}, this is Honeymoon regarding your ${booking.eventType} booking on ${booking.date}.`)}
                              target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                              style={{ background: '#25D366', color: 'white' }}>
                              <Icon name="ChatBubbleLeftRightIcon" size={12} />
                              Chat
                            </a>
                          </td>
                          <td className="px-4 py-3.5">
                            <button onClick={() => setSelectedBooking(booking)} className="text-xs font-semibold flex items-center gap-1 hover:underline" style={{ color: '#C8860A' }}>
                              Manage <Icon name="ChevronRightIcon" size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filtered.filter(b => b.status !== 'new_enquiry' && b.status !== 'completed').length === 0 && (
                    <div className="text-center py-12 text-gray-400 text-sm">
                      <Icon name="CalendarDaysIcon" size={32} className="mx-auto mb-2 text-gray-300" />
                      No bookings match your filters
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─── CALENDAR ─── */}
          {activeTab === 'calendar' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setCalendarMonth(m => m === 0 ? 11 : m - 1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Icon name="ChevronLeftIcon" size={18} className="text-gray-500" />
                  </button>
                  <h2 className="font-semibold text-gray-900">{MONTHS[calendarMonth]} {calendarYear}</h2>
                  <button onClick={() => setCalendarMonth(m => m === 11 ? 0 : m + 1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Icon name="ChevronRightIcon" size={18} className="text-gray-500" />
                  </button>
                </div>
                <div className="grid grid-cols-7 mb-2">
                  {DAYS.map(d => <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="h-20 rounded-lg" />)}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dayBookings = getBookingsForDay(day);
                    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isBlocked = blockedDates.includes(dateStr);
                    return (
                      <div key={day} className={`h-20 rounded-lg border p-1.5 transition-colors ${isBlocked ? 'bg-red-50/40 border-red-100 hover:bg-red-50' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-gray-500">{day}</span>
                          {isBlocked && <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider flex items-center gap-0.5">🚫 Block</span>}
                        </div>
                        <div className="space-y-0.5 overflow-hidden">
                          {dayBookings.slice(0, 2).map((b) => (
                            <button key={b.id} onClick={() => setSelectedBooking(b)}
                              className={`w-full text-left text-xs px-1.5 py-0.5 rounded truncate font-medium ${b.status === 'event_scheduled' ? 'bg-cyan-100 text-cyan-700' : b.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {b.name.split(' ')[0]}
                            </button>
                          ))}
                          {dayBookings.length > 2 && <div className="text-xs text-gray-400 px-1">+{dayBookings.length - 2}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900 text-sm">{MONTHS[calendarMonth]} Events ({calendarBookings.length})</h3>
                </div>
                {calendarBookings.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-gray-400">No events this month</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {calendarBookings.sort((a, b) => a.date.localeCompare(b.date)).map((b) => {
                      const d = new Date(b.date);
                      return (
                        <div key={b.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                          <div className="w-10 text-center flex-shrink-0">
                            <div className="text-xs text-gray-400 uppercase">{MONTHS[d.getMonth()]}</div>
                            <div className="text-xl font-bold text-gray-900 leading-tight">{d.getDate()}</div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm">{b.name} — {b.eventType}</div>
                            <div className="text-xs text-gray-400">{b.time} · {b.guests} guests · {b.package}</div>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${STATUS_COLORS[b.status]}`}>
                            {STATUS_LABELS[b.status]}
                          </span>
                          <a href={buildWhatsAppLink(b.phone, `Hi ${b.name.split(' ')[0]}, just a reminder about your ${b.eventType} at Honeymoon on ${b.date} at ${b.time}. We look forward to seeing you!`)}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg flex-shrink-0"
                            style={{ background: '#25D366', color: 'white' }}>
                            <Icon name="ChatBubbleLeftRightIcon" size={12} />
                            Remind
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── CUSTOMERS ─── */}
          {activeTab === 'customers' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Icon name="MagnifyingGlassIcon" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Search customers..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white" />
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Customer</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Contact</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Bookings</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Spent</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Last Event</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {customers.filter(c => !customerSearch || c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.email.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.toLowerCase().includes(customerSearch.toLowerCase())).map((customer) => (
                        <tr key={customer.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(200,134,10,0.1)' }}>
                                <span className="text-sm font-bold" style={{ color: '#C8860A' }}>{customer.name.charAt(0)}</span>
                              </div>
                              <div className="font-medium text-gray-900">{customer.name}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="text-sm text-gray-600">{customer.email}</div>
                            <div className="text-xs text-gray-400">{customer.phone}</div>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-gray-700 font-medium">{customer.totalBookings}</td>
                          <td className="px-4 py-3.5 text-sm font-semibold text-gray-900">{customer.totalSpent > 0 ? `£${customer.totalSpent.toLocaleString()}` : '—'}</td>
                          <td className="px-4 py-3.5 text-xs text-gray-500">{customer.lastEvent}</td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <a href={buildWhatsAppLink(customer.phone, `Hi ${customer.name.split(' ')[0]}, this is Honeymoon. How can we help you today?`)}
                                target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                                style={{ background: '#25D366', color: 'white' }}>
                                <Icon name="ChatBubbleLeftRightIcon" size={12} />
                                WhatsApp
                              </a>
                              <button onClick={() => setSelectedCustomer(customer)} className="text-xs font-semibold hover:underline" style={{ color: '#C8860A' }}>View</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── PAYMENTS ─── */}
          {activeTab === 'payments' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Deposits Collected', value: `£${stats.depositsCollected.toLocaleString()}`, icon: 'BanknotesIcon', color: 'text-emerald-600', bg: 'bg-emerald-50', sub: 'Confirmed deposits' },
                  { label: 'Outstanding Balance', value: `£${stats.outstanding.toLocaleString()}`, icon: 'ClockIcon', color: 'text-amber-600', bg: 'bg-amber-50', sub: 'Remaining to collect' },
                  { label: 'Total Revenue', value: `£${stats.revenue.toLocaleString()}`, icon: 'CurrencyDollarIcon', color: 'text-yellow-700', bg: 'bg-yellow-50', sub: 'Completed bookings' },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className={`${s.bg} w-10 h-10 rounded-xl flex items-center justify-center mb-3`}>
                      <Icon name={s.icon as 'BanknotesIcon'} size={20} className={s.color} />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                    <div className="text-xs font-medium text-gray-500 mt-0.5">{s.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900 text-sm">Payment Tracker</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Customer</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Event</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Total</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Deposit</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Balance</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Deposit Proof</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Final Proof</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {bookings.filter(b => b.status !== 'new_enquiry').map((b) => {
                        const total = getTotalAmount(b);
                        const balance = total - b.deposit;
                        return (
                          <tr key={b.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="px-4 py-3.5">
                              <div className="font-medium text-gray-900 text-sm">{b.name}</div>
                              <div className="text-xs text-gray-400">{b.id}</div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="text-sm text-gray-700">{b.eventType}</div>
                              <div className="text-xs text-gray-400">{b.date}</div>
                            </td>
                            <td className="px-4 py-3.5 text-sm font-semibold text-gray-900">£{total.toLocaleString()}</td>
                            <td className="px-4 py-3.5">
                              <div className={`text-sm font-medium ${b.depositPaid ? 'text-emerald-700' : 'text-amber-600'}`}>£{b.deposit.toLocaleString()}</div>
                              <div className="text-xs text-gray-400">{b.depositPaid ? '✓ Paid' : 'Pending'}</div>
                            </td>
                            <td className="px-4 py-3.5">
                              {b.finalPaymentPaid ? (
                                <span className="text-sm text-emerald-600 font-semibold">Paid in full</span>
                              ) : (
                                <span className="text-sm font-semibold text-amber-700">£{balance.toLocaleString()}</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5">
                              {b.paymentProofDeposit ? (
                                <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                                  <Icon name="CheckCircleIcon" size={12} /> Received
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">Awaiting</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5">
                              {b.paymentProofFinal ? (
                                <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                                  <Icon name="CheckCircleIcon" size={12} /> Received
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">Awaiting</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5">
                              <button onClick={() => setSelectedBooking(b)} className="text-xs font-semibold hover:underline" style={{ color: '#C8860A' }}>Manage</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── MENUS ─── */}
          {activeTab === 'menus' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm text-gray-500">Edit menus, packages, and prices. Send directly to customers via WhatsApp.</p>
                <button onClick={saveAllMenusToDatabase} disabled={isSavingMenus} className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white shadow-md transition-all hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed" style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}>
                  <Icon name="CloudArrowUpIcon" size={16} />
                  {isSavingMenus ? 'Saving...' : 'Save Changes to Website'}
                </button>
              </div>

              {/* Menu Sub-tabs */}
              <div className="flex flex-wrap gap-2">
                {([
                  { id: 'banquet', label: '🎁 Banquet Packages' },
                  { id: 'indian', label: '🍛 Indian Menu' },
                  { id: 'srilankan', label: '🌴 Sri Lankan Menu' },
                  { id: 'live', label: '🎪 Live Counter' },
                ] as { id: AdminMenuTab; label: string }[]).map((tab) => (
                  <button key={tab.id} onClick={() => setAdminMenuTab(tab.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${adminMenuTab === tab.id ? 'text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:border-yellow-400'}`}
                    style={adminMenuTab === tab.id ? { background: 'linear-gradient(135deg, #C8860A, #F0A830)' } : {}}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ─── BANQUET PACKAGES ─── */}
              {adminMenuTab === 'banquet' && (
                <div className="space-y-4">
                  {editableBanquetPackages.map((pkg) => (
                    <div key={pkg.id} className="bg-white rounded-xl border border-gray-200 p-5">
                      {editingPackageId === pkg.id && editingPackageData ? (
                        /* Edit Mode */
                        <div className="space-y-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                            <div className="flex gap-2">
                              <button onClick={saveEditPackage} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}>Save</button>
                              <button onClick={() => { setEditingPackageId(null); setEditingPackageData(null); }} className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500">Cancel</button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">Price/Person (£)</label>
                              <input type="number" value={editingPackageData.pricePerPerson} onChange={(e) => setEditingPackageData({ ...editingPackageData, pricePerPerson: Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">Veg Starters</label>
                              <input type="number" value={editingPackageData.starters.veg} onChange={(e) => setEditingPackageData({ ...editingPackageData, starters: { ...editingPackageData.starters, veg: Number(e.target.value) } })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">Non-Veg Starters</label>
                              <input type="number" value={editingPackageData.starters.nonVeg} onChange={(e) => setEditingPackageData({ ...editingPackageData, starters: { ...editingPackageData.starters, nonVeg: Number(e.target.value) } })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">Veg Mains</label>
                              <input type="number" value={editingPackageData.mains.veg} onChange={(e) => setEditingPackageData({ ...editingPackageData, mains: { ...editingPackageData.mains, veg: Number(e.target.value) } })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">Non-Veg Mains</label>
                              <input type="number" value={editingPackageData.mains.nonVeg} onChange={(e) => setEditingPackageData({ ...editingPackageData, mains: { ...editingPackageData.mains, nonVeg: Number(e.target.value) } })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">Min Guests</label>
                              {/* @ts-ignore */}
                              <input type="number" value={editingPackageData.minGuests ?? ''} onChange={(e) => setEditingPackageData({ ...editingPackageData, minGuests: e.target.value ? Number(e.target.value) : null })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" placeholder="None" />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">Max Guests</label>
                              {/* @ts-ignore */}
                              <input type="number" value={editingPackageData.maxGuests ?? ''} onChange={(e) => setEditingPackageData({ ...editingPackageData, maxGuests: e.target.value ? Number(e.target.value) : null })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" placeholder="None" />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Desserts (one per line)</label>
                            <textarea rows={3} value={editingPackageData.desserts.join('\n')} onChange={(e) => setEditingPackageData({ ...editingPackageData, desserts: e.target.value.split('\n').filter(Boolean) })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Drinks (one per line)</label>
                            <textarea rows={3} value={editingPackageData.drinks.join('\n')} onChange={(e) => setEditingPackageData({ ...editingPackageData, drinks: e.target.value.split('\n').filter(Boolean) })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Tag / Badge</label>
                            <input type="text" value={editingPackageData.tag} onChange={(e) => setEditingPackageData({ ...editingPackageData, tag: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" placeholder="e.g. Most Popular" />
                          </div>
                        </div>
                      ) : (
                        /* View Mode */
                        <div>
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-0.5">
                                <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                                {pkg.tag && <span className="text-xs font-semibold px-2 py-0.5 rounded-full border" style={{ background: 'rgba(200,134,10,0.08)', color: '#C8860A', borderColor: 'rgba(200,134,10,0.3)' }}>{pkg.tag}</span>}
                              </div>
                              <span className="text-lg font-bold" style={{ color: '#C8860A' }}>£{pkg.pricePerPerson}<span className="text-sm font-normal text-gray-500">/person (Excl. VAT)</span></span>
                              {pkg.guestLabel && <div className="text-xs text-gray-500 mt-0.5">{pkg.guestLabel}</div>}
                            </div>
                            <button onClick={() => startEditPackage(pkg)} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:bg-amber-50" style={{ borderColor: '#C8860A', color: '#C8860A' }}>
                              <Icon name="PencilSquareIcon" size={14} />
                              Edit
                            </button>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                            {'canapes' in pkg && pkg.canapes && (
                              <div className="bg-gray-50 rounded-lg p-2.5">
                                <div className="text-xs text-gray-400 mb-0.5">Canapés</div>
                                <div className="text-xs font-medium text-gray-700">{pkg.canapes.veg}V · {pkg.canapes.nonVeg}NV</div>
                              </div>
                            )}
                            <div className="bg-gray-50 rounded-lg p-2.5">
                              <div className="text-xs text-gray-400 mb-0.5">Starters</div>
                              <div className="text-xs font-medium text-gray-700">{pkg.starters.veg}V · {pkg.starters.nonVeg}NV</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-2.5">
                              <div className="text-xs text-gray-400 mb-0.5">Mains</div>
                              <div className="text-xs font-medium text-gray-700">{pkg.mains.veg}V · {pkg.mains.nonVeg}NV</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-2.5">
                              <div className="text-xs text-gray-400 mb-0.5">Desserts</div>
                              <div className="text-xs font-medium text-gray-700">{pkg.desserts.length} item{pkg.desserts.length !== 1 ? 's' : ''}</div>
                            </div>
                            {pkg.drinks.length > 0 && (
                              <div className="bg-gray-50 rounded-lg p-2.5">
                                <div className="text-xs text-gray-400 mb-0.5">Drinks</div>
                                <div className="text-xs font-medium text-gray-700">{pkg.drinks.length} item{pkg.drinks.length !== 1 ? 's' : ''}</div>
                              </div>
                            )}
                          </div>
                          <div className="border-t border-gray-100 pt-3">
                            <p className="text-xs text-gray-500 mb-2 font-medium">📱 Send this package to a customer via WhatsApp:</p>
                            <div className="flex flex-wrap gap-2">
                              {enquiries.concat(activeBookings).slice(0, 4).map((b) => (
                                <a key={b.id}
                                  href={buildWhatsAppLink(b.phone, `Hi ${b.name.split(' ')[0]}, here is our *${pkg.name}* at *£${pkg.pricePerPerson}/person* (Excl. VAT):\n\n🥗 Starters: ${pkg.starters.veg} Veg + ${pkg.starters.nonVeg} Non-Veg\n🍛 Mains: ${pkg.mains.veg} Veg + ${pkg.mains.nonVeg} Non-Veg\n🍮 Desserts: ${pkg.desserts.join(', ')}\n${pkg.drinks.length > 0 ? `🥤 Drinks: ${pkg.drinks.join(', ')}\n` : ''}${pkg.guestLabel ? `\n👥 ${pkg.guestLabel}` : ''}\n\nFor ${b.guests} guests, estimated total: *£${(pkg.pricePerPerson * b.guests).toLocaleString()}* (Excl. VAT)\n\nWould you like to go ahead with this package? Please reply to confirm! 🙏`)}
                                  target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                                  style={{ background: '#25D366', color: 'white' }}>
                                  <Icon name="ChatBubbleLeftRightIcon" size={12} />
                                  Send to {b.name.split(' ')[0]}
                                </a>
                              ))}
                              {enquiries.concat(activeBookings).length === 0 && (
                                <span className="text-xs text-gray-400 italic">No active customers to send to</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Venue Hall Charges */}
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Icon name="BuildingOffice2Icon" size={16} style={{ color: '#C8860A' }} />
                      Venue Hall Charges
                    </h3>
                    <div className="space-y-2">
                      {editableVenueCharges.map((row, i) => (
                        <div key={i} className="flex items-center gap-3 flex-wrap">
                          <input type="text" value={row.day} onChange={(e) => setEditableVenueCharges(prev => prev.map((r, idx) => idx === i ? { ...r, day: e.target.value } : r))} className="flex-1 min-w-[160px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                          <input type="text" value={row.charge} onChange={(e) => setEditableVenueCharges(prev => prev.map((r, idx) => idx === i ? { ...r, charge: e.target.value } : r))} className="flex-1 min-w-[160px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none font-semibold" style={{ color: '#C8860A' }} />
                          <input type="text" value={row.note} onChange={(e) => setEditableVenueCharges(prev => prev.map((r, idx) => idx === i ? { ...r, note: e.target.value } : r))} className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none text-gray-500" placeholder="Note" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dry Hire Prices */}
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Icon name="BuildingOfficeIcon" size={16} style={{ color: '#C8860A' }} />
                      Dry Hire Prices
                    </h3>
                    <div className="space-y-2">
                      {editableDryHirePrices.map((row, i) => (
                        <div key={i} className="flex items-center gap-3 flex-wrap">
                          <input type="text" value={row.day} onChange={(e) => setEditableDryHirePrices(prev => prev.map((r, idx) => idx === i ? { ...r, day: e.target.value } : r))} className="flex-1 min-w-[160px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" placeholder="Day" />
                          <input type="text" value={row.session} onChange={(e) => setEditableDryHirePrices(prev => prev.map((r, idx) => idx === i ? { ...r, session: e.target.value } : r))} className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" placeholder="Session" />
                          <input type="number" value={row.price} onChange={(e) => setEditableDryHirePrices(prev => prev.map((r, idx) => idx === i ? { ...r, price: Number(e.target.value) } : r))} className="flex-1 min-w-[120px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none font-semibold" style={{ color: '#C8860A' }} placeholder="Price (£)" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Table Service & Kids Pricing */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <h3 className="font-semibold text-gray-900 mb-3">Table Service Charges</h3>
                      <div className="space-y-2">
                        {editableTableService.map((ts, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input type="text" value={ts.service} onChange={(e) => setEditableTableService(prev => prev.map((t, idx) => idx === i ? { ...t, service: e.target.value } : t))} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                            <input type="text" value={ts.price} onChange={(e) => setEditableTableService(prev => prev.map((t, idx) => idx === i ? { ...t, price: e.target.value } : t))} className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none font-semibold" style={{ color: '#C8860A' }} />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <h3 className="font-semibold text-gray-900 mb-3">Kids Pricing</h3>
                      <div className="space-y-2">
                        {editableKidsPricing.map((kp, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input type="text" value={kp.ageRange} onChange={(e) => setEditableKidsPricing(prev => prev.map((k, idx) => idx === i ? { ...k, ageRange: e.target.value } : k))} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                            <input type="text" value={kp.price} onChange={(e) => setEditableKidsPricing(prev => prev.map((k, idx) => idx === i ? { ...k, price: e.target.value } : k))} className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none font-semibold" style={{ color: '#C8860A' }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── INDIAN MENU EDITOR ─── */}
              {adminMenuTab === 'indian' && (
                <div className="space-y-4">
                  {/* Send full Indian menu to customer */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-amber-700 mb-2">📱 Send Full Indian Menu to a Customer:</p>
                    <div className="flex flex-wrap gap-2">
                      {enquiries.concat(activeBookings).slice(0, 5).map((b) => (
                        <a key={b.id}
                          href={buildMenuWhatsAppText(b.name.split(' ')[0], b.phone, 'Indian Menu', b.guests)}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                          style={{ background: '#25D366', color: 'white' }}>
                          <Icon name="ChatBubbleLeftRightIcon" size={12} />
                          Send to {b.name.split(' ')[0]}
                        </a>
                      ))}
                      {enquiries.concat(activeBookings).length === 0 && <span className="text-xs text-gray-400 italic">No active customers</span>}
                    </div>
                  </div>

                  {[
                    { label: 'Vegetarian Starters', key: 'vegStarters' as const },
                    { label: 'Non-Vegetarian Starters', key: 'nonVegStarters' as const },
                    { label: 'Vegetarian Mains', key: 'vegMains' as const },
                    { label: 'Non-Vegetarian Mains', key: 'nonVegMains' as const },
                    { label: 'Sundries', key: 'sundries' as const },
                    { label: 'Desserts', key: 'desserts' as const },
                  ].map((section) => (
                    <div key={section.key} className="bg-white rounded-xl border border-gray-200 p-5">
                      <h3 className="font-semibold text-gray-900 mb-3">{section.label}</h3>
                      <div className="space-y-2 mb-3">
                        {editableIndianMenu[section.key].map((item, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input type="text" value={item} onChange={(e) => setEditableIndianMenu(prev => ({ ...prev, [section.key]: prev[section.key].map((v, idx) => idx === i ? e.target.value : v) }))} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                            <button onClick={() => setEditableIndianMenu(prev => ({ ...prev, [section.key]: prev[section.key].filter((_, idx) => idx !== i) }))} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                              <Icon name="TrashIcon" size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input type="text" placeholder={`Add new ${section.label.toLowerCase()} item...`} value={newMenuItemInput} onChange={(e) => setNewMenuItemInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && newMenuItemInput.trim()) { setEditableIndianMenu(prev => ({ ...prev, [section.key]: [...prev[section.key], newMenuItemInput.trim()] })); setNewMenuItemInput(''); } }}
                          className="flex-1 border border-dashed border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none bg-gray-50" />
                        <button onClick={() => { if (newMenuItemInput.trim()) { setEditableIndianMenu(prev => ({ ...prev, [section.key]: [...prev[section.key], newMenuItemInput.trim()] })); setNewMenuItemInput(''); } }}
                          className="text-white text-sm font-semibold px-3 py-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}>
                          <Icon name="PlusIcon" size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ─── SRI LANKAN MENU EDITOR ─── */}
              {adminMenuTab === 'srilankan' && (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-amber-700 mb-2">📱 Send Full Sri Lankan Menu to a Customer:</p>
                    <div className="flex flex-wrap gap-2">
                      {enquiries.concat(activeBookings).slice(0, 5).map((b) => (
                        <a key={b.id}
                          href={buildMenuWhatsAppText(b.name.split(' ')[0], b.phone, 'Sri Lankan Menu', b.guests)}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                          style={{ background: '#25D366', color: 'white' }}>
                          <Icon name="ChatBubbleLeftRightIcon" size={12} />
                          Send to {b.name.split(' ')[0]}
                        </a>
                      ))}
                      {enquiries.concat(activeBookings).length === 0 && <span className="text-xs text-gray-400 italic">No active customers</span>}
                    </div>
                  </div>

                  {[
                    { label: 'Vegetarian Starters', key: 'vegStarters' as const },
                    { label: 'Non-Vegetarian Starters', key: 'nonVegStarters' as const },
                    { label: 'Vegetarian Mains', key: 'vegMains' as const },
                    { label: 'Non-Vegetarian Mains', key: 'nonVegMains' as const },
                    { label: 'Sundries', key: 'sundries' as const },
                    { label: 'Desserts', key: 'desserts' as const },
                  ].map((section) => (
                    <div key={section.key} className="bg-white rounded-xl border border-gray-200 p-5">
                      <h3 className="font-semibold text-gray-900 mb-3">{section.label}</h3>
                      <div className="space-y-2 mb-3">
                        {editableSLMenu[section.key].map((item, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input type="text" value={item} onChange={(e) => setEditableSLMenu(prev => ({ ...prev, [section.key]: prev[section.key].map((v, idx) => idx === i ? e.target.value : v) }))} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                            <button onClick={() => setEditableSLMenu(prev => ({ ...prev, [section.key]: prev[section.key].filter((_, idx) => idx !== i) }))} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                              <Icon name="TrashIcon" size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input type="text" placeholder={`Add new ${section.label.toLowerCase()} item...`} value={newMenuItemInput} onChange={(e) => setNewMenuItemInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && newMenuItemInput.trim()) { setEditableSLMenu(prev => ({ ...prev, [section.key]: [...prev[section.key], newMenuItemInput.trim()] })); setNewMenuItemInput(''); } }}
                          className="flex-1 border border-dashed border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none bg-gray-50" />
                        <button onClick={() => { if (newMenuItemInput.trim()) { setEditableSLMenu(prev => ({ ...prev, [section.key]: [...prev[section.key], newMenuItemInput.trim()] })); setNewMenuItemInput(''); } }}
                          className="text-white text-sm font-semibold px-3 py-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}>
                          <Icon name="PlusIcon" size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ─── LIVE COUNTER EDITOR ─── */}
              {adminMenuTab === 'live' && (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-amber-700 mb-2">📱 Send Live Counter Package to a Customer:</p>
                    <div className="flex flex-wrap gap-2">
                      {enquiries.concat(activeBookings).slice(0, 5).map((b) => (
                        <a key={b.id}
                          href={buildWhatsAppLink(b.phone, `Hi ${b.name.split(' ')[0]}, here is our *Live Counter Package* from Honeymoon:\n\n🎪 *Sri Lankan & South Indian:*\n${editableLiveCounter.srilankanSouthIndian.map(i => `• ${i.name} — £${i.price.toFixed(2)}/person`).join('\n')}\n\n🎪 *North Indian:*\n${editableLiveCounter.northIndian.map(i => `• ${i.name} — £${i.price.toFixed(2)}/person`).join('\n')}\n\n✨ *Extras:*\n${editableLiveCounter.extras.map(i => `• ${i.name} — £${i.price.toFixed(2)}`).join('\n')}\n\nPlease let us know which items you'd like to add to your event! 🙏`)}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                          style={{ background: '#25D366', color: 'white' }}>
                          <Icon name="ChatBubbleLeftRightIcon" size={12} />
                          Send to {b.name.split(' ')[0]}
                        </a>
                      ))}
                      {enquiries.concat(activeBookings).length === 0 && <span className="text-xs text-gray-400 italic">No active customers</span>}
                    </div>
                  </div>

                  {[
                    { label: 'Sri Lankan & South Indian', key: 'srilankanSouthIndian' as const },
                    { label: 'North Indian', key: 'northIndian' as const },
                    { label: 'Extras', key: 'extras' as const },
                  ].map((section) => (
                    <div key={section.key} className="bg-white rounded-xl border border-gray-200 p-5">
                      <h3 className="font-semibold text-gray-900 mb-3">{section.label}</h3>
                      <div className="space-y-2 mb-3">
                        {editableLiveCounter[section.key].map((item, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input type="text" value={item.name} onChange={(e) => setEditableLiveCounter(prev => ({ ...prev, [section.key]: prev[section.key].map((v, idx) => idx === i ? { ...v, name: e.target.value } : v) }))} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-gray-500">£</span>
                              <input type="number" step="0.01" value={item.price} onChange={(e) => setEditableLiveCounter(prev => ({ ...prev, [section.key]: prev[section.key].map((v, idx) => idx === i ? { ...v, price: parseFloat(e.target.value) || 0 } : v) }))} className="w-20 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none text-right" />
                            </div>
                            <button onClick={() => setEditableLiveCounter(prev => ({ ...prev, [section.key]: prev[section.key].filter((_, idx) => idx !== i) }))} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                              <Icon name="TrashIcon" size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input type="text" placeholder="Item name..." value={newLiveItemName} onChange={(e) => setNewLiveItemName(e.target.value)} className="flex-1 border border-dashed border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none bg-gray-50" />
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-gray-500">£</span>
                          <input type="number" step="0.01" placeholder="0.00" value={newLiveItemPrice} onChange={(e) => setNewLiveItemPrice(e.target.value)} className="w-20 border border-dashed border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none bg-gray-50" />
                        </div>
                        <button onClick={() => { if (newLiveItemName.trim()) { setEditableLiveCounter(prev => ({ ...prev, [section.key]: [...prev[section.key], { name: newLiveItemName.trim(), price: parseFloat(newLiveItemPrice) || 0 }] })); setNewLiveItemName(''); setNewLiveItemPrice(''); } }}
                          className="text-white text-sm font-semibold px-3 py-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}>
                          <Icon name="PlusIcon" size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── HISTORY ─── */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Icon name="MagnifyingGlassIcon" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Search history..." value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white" />
                </div>
                <span className="text-xs text-gray-400">{completedBookings.length} completed</span>
              </div>
              {completedBookings.filter(b => !historySearch || b.name.toLowerCase().includes(historySearch.toLowerCase()) || b.email.toLowerCase().includes(historySearch.toLowerCase()) || b.phone.toLowerCase().includes(historySearch.toLowerCase()) || b.eventType.toLowerCase().includes(historySearch.toLowerCase())).map((b) => (
                <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(200,134,10,0.1)' }}>
                        <span className="text-base font-bold" style={{ color: '#C8860A' }}>{b.name.charAt(0)}</span>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{b.name}</div>
                        <div className="text-xs text-gray-400">{b.email} · {b.phone}</div>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[b.status]}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[b.status]}`} />
                      {STATUS_LABELS[b.status]}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {[
                      { label: 'Event Type', value: b.eventType },
                      { label: 'Event Date', value: b.date },
                      { label: 'Guests', value: `${b.guests} people` },
                      { label: 'Package', value: b.selectedMenu || b.package },
                    ].map((f) => (
                      <div key={f.label} className="bg-gray-50 rounded-lg p-2.5">
                        <div className="text-xs text-gray-400 mb-0.5">{f.label}</div>
                        <div className="text-sm font-medium text-gray-800">{f.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-100 pt-4">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Financial Summary</div>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div><span className="text-gray-500">Base: </span><span className="font-semibold text-gray-900">£{b.baseAmount.toLocaleString()}</span></div>
                      {b.extraCharges.length > 0 && (
                        <div><span className="text-gray-500">Extras: </span><span className="font-semibold text-amber-700">+£{b.extraCharges.reduce((s, c) => s + c.amount, 0).toLocaleString()}</span></div>
                      )}
                      <div><span className="text-gray-500">Total: </span><span className="font-bold" style={{ color: '#C8860A' }}>£{getTotalAmount(b).toLocaleString()}</span></div>
                      <div className="flex items-center gap-1"><Icon name="CheckCircleIcon" size={14} className="text-emerald-500" /><span className="text-emerald-700 font-medium text-xs">Fully Paid</span></div>
                    </div>
                  </div>
                  
                  {/* Payment proofs */}
                  {(b.paymentProofDeposit || b.paymentProofFinal) && (
                    <div className="border-t border-gray-100 pt-4 mt-4">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Payment Proofs</div>
                      <div className="flex gap-3">
                        {b.paymentProofDeposit && (
                          <div 
                            className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 cursor-pointer shadow-sm group bg-gray-50 flex-shrink-0"
                            onClick={() => {
                              if (b.paymentProofDeposit?.startsWith('data:image')) {
                                const w = window.open('');
                                w?.document.write(`<img src="${b.paymentProofDeposit}" style="max-width: 100%; height: auto;"/>`);
                              } else {
                                window.open(b.paymentProofDeposit, '_blank');
                              }
                            }}
                            title="View Deposit Proof"
                          >
                            <img src={b.paymentProofDeposit} alt="Deposit" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Icon name="MagnifyingGlassPlusIcon" size={16} className="text-white" />
                            </div>
                            <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] text-center py-0.5">Deposit</div>
                          </div>
                        )}
                        {b.paymentProofFinal && (
                          <div 
                            className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 cursor-pointer shadow-sm group bg-gray-50 flex-shrink-0"
                            onClick={() => {
                              if (b.paymentProofFinal?.startsWith('data:image')) {
                                const w = window.open('');
                                w?.document.write(`<img src="${b.paymentProofFinal}" style="max-width: 100%; height: auto;"/>`);
                              } else {
                                window.open(b.paymentProofFinal, '_blank');
                              }
                            }}
                            title="View Final Proof"
                          >
                            <img src={b.paymentProofFinal} alt="Final" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Icon name="MagnifyingGlassPlusIcon" size={16} className="text-white" />
                            </div>
                            <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] text-center py-0.5">Final</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {b.notes && <div className="mt-3 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">{b.notes}</div>}
                </div>
              ))}
              {completedBookings.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
                  <Icon name="ArchiveBoxIcon" size={36} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-400 text-sm">No completed bookings yet</p>
                </div>
              )}
            </div>
          )}

          {/* ─── SETTINGS ─── */}
          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
              {/* Left Column */}
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Icon name="BuildingOfficeIcon" size={18} style={{ color: '#C8860A' }} />
                    Venue Details
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Venue Name</label>
                      <input type="text" value={venueDetails.venueName} onChange={(e) => setVenueDetails(prev => ({ ...prev, venueName: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-gray-50" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Max Capacity</label>
                      <input type="number" value={venueDetails.maxCapacity} onChange={(e) => setVenueDetails(prev => ({ ...prev, maxCapacity: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-gray-50" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Contact Email</label>
                      <input type="email" value={venueDetails.contactEmail} onChange={(e) => setVenueDetails(prev => ({ ...prev, contactEmail: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-gray-50" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Phone</label>
                      <input type="tel" value={venueDetails.phone} onChange={(e) => setVenueDetails(prev => ({ ...prev, phone: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-gray-50" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">WhatsApp Business Number</label>
                      <input type="tel" value={venueDetails.whatsapp} onChange={(e) => setVenueDetails(prev => ({ ...prev, whatsapp: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-gray-50" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Address</label>
                      <input type="text" value={venueDetails.address} onChange={(e) => setVenueDetails(prev => ({ ...prev, address: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-gray-50" />
                    </div>
                    <button 
                      onClick={saveVenueDetails} 
                      disabled={isSavingVenueDetails}
                      className="text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all mt-1 shadow-md active:scale-95 disabled:opacity-50" 
                      style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}
                    >
                      {isSavingVenueDetails ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Icon name="CalendarDaysIcon" size={18} style={{ color: '#C8860A' }} />
                    Pricing & Deposits
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Deposit Percentage', value: '30%' },
                      { label: 'Minimum Booking Hours', value: '4' },
                      { label: 'Weekday Rate (per hour)', value: '£350' },
                      { label: 'Weekend Rate (per hour)', value: '£550' },
                    ].map((field) => (
                      <div key={field.label} className="flex items-center justify-between">
                        <label className="text-sm text-gray-600">{field.label}</label>
                        <input type="text" defaultValue={field.value} className="w-28 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none bg-gray-50" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Icon name="CreditCardIcon" size={18} style={{ color: '#C8860A' }} />
                    Bank Account Details
                  </h3>
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Account Name</label>
                      <input type="text" value={bankDetails.accountName} onChange={(e) => updateBankDetail('accountName', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-gray-50" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Sort Code</label>
                      <input type="text" value={bankDetails.sortCode} onChange={(e) => updateBankDetail('sortCode', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-gray-50" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Account Number</label>
                      <input type="text" value={bankDetails.accountNumber} onChange={(e) => updateBankDetail('accountNumber', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-gray-50" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Icon name="NoSymbolIcon" size={18} style={{ color: '#C8860A' }} />
                    Block Dates
                  </h3>
                  <div className="flex items-center gap-2">
                    <input type="date" value={blockDateInput} onChange={(e) => setBlockDateInput(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none bg-gray-50" />
                    <button onClick={handleBlockDate} className="bg-gray-900 hover:bg-gray-700 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors">Block Date</button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {blockedDates.map((d) => (
                      <div key={d} className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-600 text-xs font-medium px-3 py-1.5 rounded-lg">
                        {d}
                        <button onClick={() => handleUnblockDate(d)} className="hover:text-red-800"><Icon name="XMarkIcon" size={12} /></button>
                      </div>
                    ))}
                    {blockedDates.length === 0 && (
                      <span className="text-xs text-gray-400 italic">No blocked dates</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ─── BOOKING DETAIL / WORKFLOW DRAWER ─── */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => { setSelectedBooking(null); setShowMenuPanel(false); setIsEditingBookingDate(false); setIsEditingEventType(false); setIsEditingPackage(false); setIsEditingTime(false); setIsEditingGuests(false); }} />
          <div className="w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-3">
                {/* Back Arrow button to go one step back in workflow status */}
                {STATUS_FLOW.indexOf(selectedBooking.status) > 0 && (
                  <button onClick={() => handleGoBackStatus(selectedBooking.id)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 transition-colors" title="Go one step back">
                    <Icon name="ArrowLeftIcon" size={20} />
                  </button>
                )}
                <div>
                  <h2 className="font-semibold text-gray-900">Booking #{selectedBooking.id}</h2>
                  <p className="text-xs text-gray-400">{selectedBooking.eventType} · {selectedBooking.date}</p>
                </div>
              </div>
              <button onClick={() => { setSelectedBooking(null); setShowMenuPanel(false); setIsEditingBookingDate(false); setIsEditingEventType(false); setIsEditingPackage(false); setIsEditingTime(false); setIsEditingGuests(false); }} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
                <Icon name="XMarkIcon" size={20} />
              </button>
            </div>

            {/* Status badge + progress */}
            <div className="px-5 py-3 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${STATUS_COLORS[selectedBooking.status]}`}>
                  <span className={`w-2 h-2 rounded-full ${STATUS_DOT[selectedBooking.status]}`} />
                  {STATUS_LABELS[selectedBooking.status]}
                </span>
                <span className="text-xs text-gray-400">Step {STATUS_FLOW.indexOf(selectedBooking.status) + 1} of {STATUS_FLOW.length}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${((STATUS_FLOW.indexOf(selectedBooking.status) + 1) / STATUS_FLOW.length) * 100}%`, background: 'linear-gradient(90deg, #C8860A, #F0A830)' }} />
              </div>
            </div>

            <div className="flex-1 overflow-auto p-5 space-y-5">
              {/* Customer info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Customer</div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(200,134,10,0.1)' }}>
                    <span className="text-base font-bold" style={{ color: '#C8860A' }}>{selectedBooking.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{selectedBooking.name}</div>
                    <div className="text-sm text-gray-500">{selectedBooking.email}</div>
                    <div className="text-sm text-gray-500">{selectedBooking.phone}</div>
                  </div>
                  <a href={buildWhatsAppLink(selectedBooking.phone, `Hi ${selectedBooking.name.split(' ')[0]}, this is Honeymoon regarding your ${selectedBooking.eventType} booking.`)}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg"
                    style={{ background: '#25D366', color: 'white' }}>
                    <Icon name="ChatBubbleLeftRightIcon" size={14} />
                    WhatsApp
                  </a>
                </div>
              </div>

              {/* Event details */}
              <div className="grid grid-cols-2 gap-3">
                {!isEditingEventType ? (
                  <div className="bg-gray-50 rounded-xl p-3 flex flex-col justify-between">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center justify-between">
                      <span>Event Type</span>
                      <button 
                        onClick={() => setIsEditingEventType(true)} 
                        className="text-[10px] text-amber-600 hover:text-amber-800 font-semibold transition-colors flex items-center gap-0.5"
                      >
                        <Icon name="PencilIcon" size={10} />
                        Edit
                      </button>
                    </div>
                    <div className="text-sm font-medium text-gray-900">{selectedBooking.eventType}</div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-3 flex flex-col justify-between border border-amber-300">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center justify-between">
                      <span>Event Type</span>
                      <button 
                        onClick={() => setIsEditingEventType(false)} 
                        className="text-[10px] text-gray-400 hover:text-gray-600 font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                    <select
                      value={selectedBooking.eventType}
                      onChange={async (e) => {
                        const val = e.target.value;
                        if (!val) return;
                        try {
                          const updated = { ...selectedBooking, eventType: val };
                          setSelectedBooking(updated);
                          setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, eventType: val } : b));
                          await setDoc(doc(db, 'booking_requests', selectedBooking.id), { eventType: val }, { merge: true });
                          await setDoc(doc(db, 'bookings', selectedBooking.id), { eventType: val }, { merge: true });
                          setIsEditingEventType(false);
                        } catch (error) {
                          console.error(error);
                        }
                      }}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-yellow-500 font-medium text-gray-900"
                    >
                      <option value="Wedding">Wedding</option>
                      <option value="Birthday">Birthday</option>
                      <option value="Corporate">Corporate</option>
                      <option value="Anniversary">Anniversary</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                )}

                {!isEditingPackage ? (
                  <div className="bg-gray-50 rounded-xl p-3 flex flex-col justify-between">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center justify-between">
                      <span>Package</span>
                      <button 
                        onClick={() => setIsEditingPackage(true)} 
                        className="text-[10px] text-amber-600 hover:text-amber-800 font-semibold transition-colors flex items-center gap-0.5"
                      >
                        <Icon name="PencilIcon" size={10} />
                        Edit
                      </button>
                    </div>
                    <div className="text-sm font-medium text-gray-900 truncate" title={selectedBooking.selectedMenu || selectedBooking.package}>
                      {selectedBooking.selectedMenu || selectedBooking.package}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-3 flex flex-col justify-between border border-amber-300">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center justify-between">
                      <span>Package</span>
                      <button 
                        onClick={() => setIsEditingPackage(false)} 
                        className="text-[10px] text-gray-400 hover:text-gray-600 font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                    <select
                      value={selectedBooking.selectedMenu || selectedBooking.package || ''}
                      onChange={async (e) => {
                        const val = e.target.value;
                        if (!val) return;
                        try {
                          const updated = { ...selectedBooking, selectedMenu: val, package: val };
                          setSelectedBooking(updated);
                          setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, selectedMenu: val, package: val } : b));
                          await setDoc(doc(db, 'booking_requests', selectedBooking.id), { selectedMenu: val, package: val }, { merge: true });
                          await setDoc(doc(db, 'bookings', selectedBooking.id), { selectedMenu: val, package: val }, { merge: true });
                          setIsEditingPackage(false);
                        } catch (error) {
                          console.error(error);
                        }
                      }}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-yellow-500 font-medium text-gray-900"
                    >
                      <option value="Classic Buffet">Classic Buffet</option>
                      <option value="Premium Plated">Premium Plated</option>
                      <option value="Cocktail Reception">Cocktail Reception</option>
                      <option value="Continental Breakfast">Continental Breakfast</option>
                      <option value="Indian Menu">Indian Menu</option>
                      <option value="Sri Lankan Menu">Sri Lankan Menu</option>
                    </select>
                  </div>
                )}

                {!isEditingBookingDate ? (
                  <div className="bg-gray-50 rounded-xl p-3 flex flex-col justify-between">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center justify-between">
                      <span>Date</span>
                      <button 
                        onClick={() => setIsEditingBookingDate(true)} 
                        className="text-[10px] text-amber-600 hover:text-amber-800 font-semibold transition-colors flex items-center gap-0.5"
                      >
                        <Icon name="PencilIcon" size={10} />
                        Edit
                      </button>
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {selectedBooking.date ? selectedBooking.date.split('T')[0] : 'N/A'}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-3 flex flex-col justify-between border border-amber-300">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center justify-between">
                      <span>Date</span>
                      <button 
                        onClick={() => setIsEditingBookingDate(false)} 
                        className="text-[10px] text-gray-400 hover:text-gray-600 font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                    <input
                      type="date"
                      defaultValue={selectedBooking.date ? selectedBooking.date.split('T')[0] : ''}
                      onChange={async (e) => {
                        const newDate = e.target.value;
                        if (!newDate) return;
                        try {
                          const updatedBooking = { ...selectedBooking, date: newDate };
                          setSelectedBooking(updatedBooking);
                          setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, date: newDate } : b));
                          
                          await setDoc(doc(db, 'booking_requests', selectedBooking.id), { date: newDate }, { merge: true });
                          await setDoc(doc(db, 'bookings', selectedBooking.id), { date: newDate }, { merge: true });
                          setIsEditingBookingDate(false);
                        } catch (error) {
                          console.error('Error updating booking date:', error);
                        }
                      }}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-yellow-500 font-medium text-gray-900"
                    />
                  </div>
                )}

                {!isEditingTime ? (
                  <div className="bg-gray-50 rounded-xl p-3 flex flex-col justify-between">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center justify-between">
                      <span>Time / Shift</span>
                      <button 
                        onClick={() => setIsEditingTime(true)} 
                        className="text-[10px] text-amber-600 hover:text-amber-800 font-semibold transition-colors flex items-center gap-0.5"
                      >
                        <Icon name="PencilIcon" size={10} />
                        Edit
                      </button>
                    </div>
                    <div className="text-sm font-medium text-gray-900">{selectedBooking.time}</div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-3 flex flex-col justify-between border border-amber-300">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center justify-between">
                      <span>Time / Shift</span>
                      <button 
                        onClick={() => setIsEditingTime(false)} 
                        className="text-[10px] text-gray-400 hover:text-gray-600 font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                    <select
                      value={selectedBooking.time}
                      onChange={async (e) => {
                        const val = e.target.value;
                        if (!val) return;
                        try {
                          const updated = { ...selectedBooking, time: val };
                          setSelectedBooking(updated);
                          setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, time: val, timeOfDay: val } : b));
                          await setDoc(doc(db, 'booking_requests', selectedBooking.id), { timeOfDay: val }, { merge: true });
                          await setDoc(doc(db, 'bookings', selectedBooking.id), { timeOfDay: val, time: val }, { merge: true });
                          setIsEditingTime(false);
                        } catch (error) {
                          console.error(error);
                        }
                      }}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-yellow-500 font-medium text-gray-900"
                    >
                      <option value="Morning">Morning</option>
                      <option value="Afternoon">Afternoon</option>
                      <option value="Evening">Evening</option>
                    </select>
                  </div>
                )}

                {!isEditingGuests ? (
                  <div className="bg-gray-50 rounded-xl p-3 flex flex-col justify-between">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center justify-between">
                      <span>Guests</span>
                      <button 
                        onClick={() => setIsEditingGuests(true)} 
                        className="text-[10px] text-amber-600 hover:text-amber-800 font-semibold transition-colors flex items-center gap-0.5"
                      >
                        <Icon name="PencilIcon" size={10} />
                        Edit
                      </button>
                    </div>
                    <div className="text-sm font-medium text-gray-900">{selectedBooking.guests} people</div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-3 flex flex-col justify-between border border-amber-300">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center justify-between">
                      <span>Guests</span>
                      <button 
                        onClick={() => setIsEditingGuests(false)} 
                        className="text-[10px] text-gray-400 hover:text-gray-600 font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      defaultValue={selectedBooking.guests}
                      onChange={async (e) => {
                        const val = Number(e.target.value);
                        if (!val || val <= 0) return;
                        try {
                          let baseAmount = selectedBooking.baseAmount || 0;
                          let deposit = selectedBooking.deposit || 0;
                          
                          const currentPkg = selectedBooking.selectedMenu || selectedBooking.package;
                          if (currentPkg && currentPkg !== 'custom') {
                            const found = editableBanquetPackages.find(p => p.name === currentPkg);
                            if (found) {
                              baseAmount = found.pricePerPerson * val;
                              deposit = Math.round(baseAmount * 0.3);
                            }
                          }

                          const updated = { ...selectedBooking, guests: val, baseAmount, deposit };
                          setSelectedBooking(updated);
                          setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, guests: val, baseAmount, deposit } : b));
                          
                          await setDoc(doc(db, 'booking_requests', selectedBooking.id), { guests: val, baseAmount, deposit }, { merge: true });
                          await setDoc(doc(db, 'bookings', selectedBooking.id), { guests: val, baseAmount, deposit }, { merge: true });
                          setIsEditingGuests(false);
                        } catch (error) {
                          console.error(error);
                        }
                      }}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-yellow-500 font-medium text-gray-900"
                    />
                  </div>
                )}

                <div className="bg-gray-50 rounded-xl p-3 flex flex-col justify-between">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Enquiry Date</div>
                  <div className="text-sm font-medium text-gray-900">{selectedBooking.enquiryDate}</div>
                </div>
              </div>

              {/* ── STEP-SPECIFIC PANELS ── */}

              {/* Select Package Block */}
              {(selectedBooking.status === 'menu_sent' || selectedBooking.status === 'menu_selected') && (
                <div className="border border-amber-200 rounded-xl p-4 bg-amber-50/50">
                  <div className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <Icon name="ClipboardDocumentListIcon" size={14} style={{ color: '#C8860A' }} />
                    Select Package Chosen by Customer
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Select Banquet Package</label>
                      <select
                        value={selectedBooking.selectedMenu || selectedBooking.package || ''}
                        onChange={async (e) => {
                          const val = e.target.value;
                          if (!val) return;
                          
                          let pricePerPerson = 0;
                          let selectedPkgName = '';
                          
                          if (val === 'custom') {
                            selectedPkgName = 'Custom Package';
                          } else {
                            const found = editableBanquetPackages.find(p => p.name === val);
                            if (found) {
                              pricePerPerson = found.pricePerPerson;
                              selectedPkgName = found.name;
                            }
                          }
                          
                          const baseAmount = pricePerPerson * selectedBooking.guests;
                          const deposit = Math.round(baseAmount * 0.3); // 30% deposit standard
                          
                          // Update locally
                          setBookings(prev => prev.map(b => b.id === selectedBooking.id ? {
                            ...b,
                            selectedMenu: selectedPkgName,
                            package: selectedPkgName,
                            baseAmount,
                            deposit
                          } : b));
                          setSelectedBooking(prev => prev?.id === selectedBooking.id ? {
                            ...prev,
                            selectedMenu: selectedPkgName,
                            package: selectedPkgName,
                            baseAmount,
                            deposit
                          } : prev);
                          
                          // Save to Firestore
                          try {
                            const updates = {
                              selectedMenu: selectedPkgName,
                              package: selectedPkgName,
                              baseAmount,
                              deposit
                            };
                            await setDoc(doc(db, 'booking_requests', selectedBooking.id), updates, { merge: true });
                            await setDoc(doc(db, 'bookings', selectedBooking.id), {
                              ...selectedBooking,
                              ...updates,
                              updatedAt: new Date().toISOString()
                            }, { merge: true });
                          } catch (err) {
                            console.error('Error saving selected package:', err);
                          }
                        }}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white"
                      >
                        <option value="">-- Choose Package --</option>
                        {editableBanquetPackages.map(pkg => (
                          <option key={pkg.id} value={pkg.name}>
                            {pkg.name} (£{pkg.pricePerPerson}/person)
                          </option>
                        ))}
                        <option value="custom">Custom Price Package</option>
                      </select>
                    </div>

                    {/* Show Custom Inputs if Custom or any package is selected */}
                    {(selectedBooking.selectedMenu || selectedBooking.package) && (
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Base Price (£)</label>
                          <input
                            type="number"
                            value={selectedBooking.baseAmount || 0}
                            onChange={async (e) => {
                              const baseAmount = Number(e.target.value) || 0;
                              const deposit = Math.round(baseAmount * 0.3);
                              
                              setBookings(prev => prev.map(b => b.id === selectedBooking.id ? {
                                ...b,
                                baseAmount,
                                deposit
                              } : b));
                              setSelectedBooking(prev => prev?.id === selectedBooking.id ? {
                                ...prev,
                                baseAmount,
                                deposit
                              } : prev);
                              
                              try {
                                await setDoc(doc(db, 'booking_requests', selectedBooking.id), { baseAmount, deposit }, { merge: true });
                                await setDoc(doc(db, 'bookings', selectedBooking.id), { baseAmount, deposit, updatedAt: new Date().toISOString() }, { merge: true });
                              } catch (err) {
                                console.error('Error saving base amount:', err);
                              }
                            }}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Deposit Required (£)</label>
                          <input
                            type="number"
                            value={selectedBooking.deposit || 0}
                            onChange={async (e) => {
                              const deposit = Number(e.target.value) || 0;
                              
                              setBookings(prev => prev.map(b => b.id === selectedBooking.id ? {
                                ...b,
                                deposit
                              } : b));
                              setSelectedBooking(prev => prev?.id === selectedBooking.id ? {
                                ...prev,
                                deposit
                              } : prev);
                              
                              try {
                                await setDoc(doc(db, 'booking_requests', selectedBooking.id), { deposit }, { merge: true });
                                await setDoc(doc(db, 'bookings', selectedBooking.id), { deposit, updatedAt: new Date().toISOString() }, { merge: true });
                              } catch (err) {
                                console.error('Error saving deposit amount:', err);
                              }
                            }}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step: Menu Sent — show real menu packages */}
              {(selectedBooking.status === 'menu_sent' || showMenuPanel) && selectedBooking.status !== 'menu_selected' && selectedBooking.status !== 'deposit_pending' && selectedBooking.status !== 'deposit_confirmed' && selectedBooking.status !== 'event_scheduled' && selectedBooking.status !== 'event_completed' && selectedBooking.status !== 'final_invoice_sent' && selectedBooking.status !== 'final_payment_received' && selectedBooking.status !== 'completed' && (
                <div className="border border-purple-200 rounded-xl p-4 bg-purple-50">
                  <div className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-3">Send Menu Packages via WhatsApp</div>
                  <div className="space-y-2">
                    {editableBanquetPackages.map((pkg) => (
                      <div key={pkg.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2.5 border border-purple-100">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{pkg.name}</div>
                          <div className="text-xs text-gray-500">£{pkg.pricePerPerson}/person · Est. £{(pkg.pricePerPerson * selectedBooking.guests).toLocaleString()} for {selectedBooking.guests} guests</div>
                        </div>
                        <a href={buildWhatsAppLink(selectedBooking.phone, `Hi ${selectedBooking.name.split(' ')[0]}, here is our *${pkg.name}* at *£${pkg.pricePerPerson}/person* (Excl. VAT):\n\n🥗 Starters: ${pkg.starters.veg} Veg + ${pkg.starters.nonVeg} Non-Veg\n🍛 Mains: ${pkg.mains.veg} Veg + ${pkg.mains.nonVeg} Non-Veg\n🍮 Desserts: ${pkg.desserts.join(', ')}\n${pkg.drinks.length > 0 ? `🥤 Drinks: ${pkg.drinks.join(', ')}\n` : ''}${pkg.guestLabel ? `\n👥 ${pkg.guestLabel}` : ''}\n\nFor ${selectedBooking.guests} guests, estimated total: *£${(pkg.pricePerPerson * selectedBooking.guests).toLocaleString()}* (Excl. VAT)\n\nPlease reply with your selection! 🙏`)}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg flex-shrink-0 ml-2"
                          style={{ background: '#25D366', color: 'white' }}>
                          <Icon name="ChatBubbleLeftRightIcon" size={12} />
                          Send
                        </a>
                      </div>
                    ))}
                    {/* Also offer Indian & Sri Lankan menus */}
                    <div className="mt-2 pt-2 border-t border-purple-100">
                      <div className="text-xs text-purple-600 font-medium mb-2">Or send full menu list:</div>
                      <div className="flex gap-2 flex-wrap">
                        <a href={buildMenuWhatsAppText(selectedBooking.name.split(' ')[0], selectedBooking.phone, 'Indian Menu', selectedBooking.guests)}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                          style={{ background: '#25D366', color: 'white' }}>
                          <Icon name="ChatBubbleLeftRightIcon" size={12} />
                          Indian Menu
                        </a>
                        <a href={buildMenuWhatsAppText(selectedBooking.name.split(' ')[0], selectedBooking.phone, 'Sri Lankan Menu', selectedBooking.guests)}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                          style={{ background: '#25D366', color: 'white' }}>
                          <Icon name="ChatBubbleLeftRightIcon" size={12} />
                          Sri Lankan Menu
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step: Deposit Pending — send bank details */}
              {selectedBooking.status === 'deposit_pending' && (
                <div className="border border-amber-200 rounded-xl p-4 bg-amber-50">
                  <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3">Send Deposit Request via WhatsApp</div>
                  <div className="bg-white rounded-lg p-3 border border-amber-100 text-sm text-gray-700 mb-3 leading-relaxed">
                    <p className="font-medium text-gray-900 mb-1">Bank Transfer Details:</p>
                    <p>Account Name: {bankDetails.accountName}</p>
                    <p>Sort Code: {bankDetails.sortCode}</p>
                    <p>Account No: {bankDetails.accountNumber}</p>
                    <p className="mt-1 font-semibold text-amber-700">Deposit Amount: £{selectedBooking.deposit.toLocaleString()}</p>
                  </div>
                  <a href={buildWhatsAppLink(selectedBooking.phone, `Hi ${selectedBooking.name.split(' ')[0]}, to confirm your ${selectedBooking.eventType} booking on ${selectedBooking.date}, please transfer the deposit of *£${selectedBooking.deposit.toLocaleString()}* to:\n\n🏦 Account Name: ${bankDetails.accountName}\n📋 Sort Code: ${bankDetails.sortCode}\n🔢 Account No: ${bankDetails.accountNumber}\n📌 Reference: ${selectedBooking.id}\n\nOnce paid, please send a screenshot of the transfer confirmation. Thank you!`)}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl w-full justify-center"
                    style={{ background: '#25D366', color: 'white' }}>
                    <Icon name="ChatBubbleLeftRightIcon" size={16} />
                    Send Bank Details via WhatsApp
                  </a>
                </div>
              )}

              {/* Step: Deposit Confirmation */}
              {selectedBooking.status === 'deposit_pending' && (
                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Deposit Payment Proof</div>
                  {selectedBooking.paymentProofDeposit ? (
                    <div className="flex items-start gap-4">
                      {(selectedBooking.paymentProofDeposit.startsWith('http') || selectedBooking.paymentProofDeposit.startsWith('data:image')) && (
                        <div 
                          className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 cursor-pointer shadow-sm group flex-shrink-0 bg-gray-50"
                          onClick={() => {
                            if (selectedBooking.paymentProofDeposit?.startsWith('data:image')) {
                              const w = window.open('');
                              w?.document.write(`<img src="${selectedBooking.paymentProofDeposit}" style="max-width: 100%; height: auto;"/>`);
                            } else {
                              window.open(selectedBooking.paymentProofDeposit, '_blank');
                            }
                          }}
                          title="Click to view full image"
                        >
                          <img 
                            src={selectedBooking.paymentProofDeposit} 
                            alt="Payment Proof" 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Icon name="MagnifyingGlassPlusIcon" size={20} className="text-white" />
                          </div>
                        </div>
                      )}
                      <div className="flex flex-col gap-2 flex-1">
                        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
                          <Icon name="CheckCircleIcon" size={16} />
                          Payment proof received
                        </div>
                        <div className="flex items-center">
                          <input 
                            type="file" 
                            accept="image/*" 
                            id="proof-reupload" 
                            className="hidden" 
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleUploadProof(selectedBooking.id, e.target.files[0]);
                              }
                            }}
                          />
                          <label 
                            htmlFor="proof-reupload" 
                            className="cursor-pointer text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 font-medium"
                          >
                            <Icon name="ArrowPathIcon" size={14} />
                            {isUploadingProof ? 'Uploading...' : 'Upload different image'}
                          </label>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">Awaiting payment screenshot from customer via WhatsApp</div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="file" 
                          accept="image/*" 
                          id="proof-upload" 
                          className="hidden" 
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleUploadProof(selectedBooking.id, e.target.files[0]);
                            }
                          }}
                        />
                        <label 
                          htmlFor="proof-upload" 
                          className="cursor-pointer bg-white border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm"
                        >
                          <Icon name="ArrowUpTrayIcon" size={16} />
                          {isUploadingProof ? 'Uploading...' : 'Upload Screenshot'}
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step: Post-event extra charges */}
              {selectedBooking.status === 'event_completed' && (
                <div className="border border-teal-200 rounded-xl p-4 bg-teal-50">
                  <div className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-3">Post-Event Adjustments</div>
                  {selectedBooking.extraCharges.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {selectedBooking.extraCharges.map((charge, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-teal-100">
                          <span className="text-sm text-gray-700">{charge.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">+£{charge.amount.toLocaleString()}</span>
                            <button onClick={() => removeExtraCharge(selectedBooking.id, idx)} className="text-red-400 hover:text-red-600">
                              <Icon name="XMarkIcon" size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input type="text" placeholder="e.g. Extra 10 guests" value={extraLabel} onChange={(e) => setExtraLabel(e.target.value)} className="flex-1 border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white" />
                    <input type="number" placeholder="£ amount" value={extraAmount} onChange={(e) => setExtraAmount(e.target.value)} className="w-24 border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white" />
                    <button onClick={() => addExtraCharge(selectedBooking.id)} className="text-white text-sm font-semibold px-3 py-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}>
                      <Icon name="PlusIcon" size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Step: Final Invoice */}
              {(selectedBooking.status === 'event_completed' || selectedBooking.status === 'final_invoice_sent') && (
                <div className="border border-yellow-200 rounded-xl p-4 bg-yellow-50">
                  <div className="text-xs font-semibold text-yellow-700 uppercase tracking-wide mb-3">Final Invoice</div>
                  <div className="bg-white rounded-lg p-4 border border-yellow-100 space-y-2 mb-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Base Amount</span>
                      <span className="font-medium text-gray-900">£{selectedBooking.baseAmount.toLocaleString()}</span>
                    </div>
                    {selectedBooking.extraCharges.map((c, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-600">{c.label}</span>
                        <span className="font-medium text-amber-700">+£{c.amount.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-200 pt-2 flex justify-between text-sm">
                      <span className="text-gray-600">Deposit Paid</span>
                      <span className="font-medium text-emerald-700">-£{selectedBooking.deposit.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 flex justify-between">
                      <span className="font-bold text-gray-900">Balance Due</span>
                      <span className="font-bold text-lg" style={{ color: '#C8860A' }}>£{(getTotalAmount(selectedBooking) - selectedBooking.deposit).toLocaleString()}</span>
                    </div>
                  </div>
                  <a href={buildWhatsAppLink(selectedBooking.phone, buildFinalInvoiceWhatsAppText(selectedBooking, bankDetails))}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl w-full justify-center"
                    style={{ background: '#25D366', color: 'white' }}>
                    <Icon name="ChatBubbleLeftRightIcon" size={16} />
                    Send Final Invoice via WhatsApp
                  </a>
                </div>
              )}

              {/* Final payment proof */}
              {selectedBooking.status === 'final_invoice_sent' && (
                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Final Payment Proof</div>
                  {selectedBooking.paymentProofFinal ? (
                    <div className="flex items-start gap-4">
                      {(selectedBooking.paymentProofFinal.startsWith('http') || selectedBooking.paymentProofFinal.startsWith('data:image')) && (
                        <div 
                          className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 cursor-pointer shadow-sm group flex-shrink-0 bg-gray-50"
                          onClick={() => {
                            if (selectedBooking.paymentProofFinal?.startsWith('data:image')) {
                              const w = window.open('');
                              w?.document.write(`<img src="${selectedBooking.paymentProofFinal}" style="max-width: 100%; height: auto;"/>`);
                            } else {
                              window.open(selectedBooking.paymentProofFinal, '_blank');
                            }
                          }}
                          title="Click to view full image"
                        >
                          <img 
                            src={selectedBooking.paymentProofFinal} 
                            alt="Final Payment Proof" 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Icon name="MagnifyingGlassPlusIcon" size={20} className="text-white" />
                          </div>
                        </div>
                      )}
                      <div className="flex flex-col gap-2 flex-1">
                        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
                          <Icon name="CheckCircleIcon" size={16} />
                          Final payment proof received — confirm below
                        </div>
                        <div className="flex items-center">
                          <input 
                            type="file" 
                            accept="image/*" 
                            id="final-proof-reupload" 
                            className="hidden" 
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleUploadFinalProof(selectedBooking.id, e.target.files[0]);
                              }
                            }}
                          />
                          <label 
                            htmlFor="final-proof-reupload" 
                            className="cursor-pointer text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 font-medium"
                          >
                            <Icon name="ArrowPathIcon" size={14} />
                            {isUploadingFinalProof ? 'Uploading...' : 'Upload different image'}
                          </label>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">Awaiting final payment screenshot from customer via WhatsApp</div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="file" 
                          accept="image/*" 
                          id="final-proof-upload" 
                          className="hidden" 
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleUploadFinalProof(selectedBooking.id, e.target.files[0]);
                            }
                          }}
                        />
                        <label 
                          htmlFor="final-proof-upload" 
                          className="cursor-pointer bg-white border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm"
                        >
                          <Icon name="ArrowUpTrayIcon" size={16} />
                          {isUploadingFinalProof ? 'Uploading...' : 'Upload Screenshot'}
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Payment summary */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Payment Summary</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Amount</span>
                    <span className="font-semibold text-gray-900">£{getTotalAmount(selectedBooking).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Deposit</span>
                    <span className={`font-semibold ${selectedBooking.depositPaid ? 'text-emerald-700' : 'text-amber-600'}`}>
                      £{selectedBooking.deposit.toLocaleString()} {selectedBooking.depositPaid ? '✓' : '(pending)'}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between text-sm">
                    <span className="font-semibold text-gray-700">Balance Due</span>
                    <span className={`font-bold ${selectedBooking.finalPaymentPaid ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {selectedBooking.finalPaymentPaid ? 'Paid in full' : `£${(getTotalAmount(selectedBooking) - selectedBooking.deposit).toLocaleString()}`}
                    </span>
                  </div>
                </div>
              </div>

              {selectedBooking.notes && (
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Notes</div>
                  <div className="text-sm text-gray-600 bg-gray-50 rounded-xl p-4 leading-relaxed">{selectedBooking.notes}</div>
                </div>
              )}
            </div>

            {/* Action footer */}
            <div className="p-5 border-t border-gray-200 flex-shrink-0 space-y-2">
              {selectedBooking.status === 'new_enquiry' && (
                <div className="flex gap-2">
                  <button onClick={() => { updateStatus(selectedBooking.id, 'menu_sent'); setShowMenuPanel(true); }}
                    className="flex-1 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}>
                    <Icon name="ClipboardDocumentListIcon" size={16} />
                    Send Menu Options
                  </button>
                </div>
              )}
              {selectedBooking.status === 'menu_sent' && (
                <button onClick={() => updateStatus(selectedBooking.id, 'menu_selected')}
                  className="w-full text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}>
                  <Icon name="CheckIcon" size={16} />
                  Mark Menu as Selected by Customer
                </button>
              )}
              {selectedBooking.status === 'menu_selected' && (
                <button onClick={() => updateStatus(selectedBooking.id, 'deposit_pending')}
                  className="w-full text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}>
                  <Icon name="BanknotesIcon" size={16} />
                  Request Deposit Payment
                </button>
              )}
              {selectedBooking.status === 'deposit_pending' && (
                <button onClick={() => confirmDepositPaid(selectedBooking.id)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2">
                  <Icon name="CheckCircleIcon" size={16} />
                  Confirm Deposit Received
                </button>
              )}
              {selectedBooking.status === 'deposit_confirmed' && (
                <button onClick={() => updateStatus(selectedBooking.id, 'event_scheduled')}
                  className="w-full text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}>
                  <Icon name="CalendarIcon" size={16} />
                  Schedule Event & Add to Calendar
                </button>
              )}
              {selectedBooking.status === 'event_scheduled' && (
                <div className="space-y-2">
                  <a href={buildWhatsAppLink(selectedBooking.phone, `Hi ${selectedBooking.name.split(' ')[0]}, just a reminder — your ${selectedBooking.eventType} at Honeymoon is coming up on *${selectedBooking.date}* at ${selectedBooking.time}. We look forward to seeing you! 🎉`)}
                    target="_blank" rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl"
                    style={{ background: '#25D366', color: 'white' }}>
                    <Icon name="ChatBubbleLeftRightIcon" size={16} />
                    Send Event Reminder
                  </a>
                  <button onClick={() => updateStatus(selectedBooking.id, 'event_completed')}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2">
                    <Icon name="CheckCircleIcon" size={16} />
                    Mark Event as Completed
                  </button>
                </div>
              )}
              {selectedBooking.status === 'event_completed' && (
                <button onClick={() => updateStatus(selectedBooking.id, 'final_invoice_sent')}
                  className="w-full text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}>
                  <Icon name="DocumentTextIcon" size={16} />
                  Send Final Invoice (above)
                </button>
              )}
              {selectedBooking.status === 'final_invoice_sent' && (
                <button onClick={() => confirmFinalPayment(selectedBooking.id)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2">
                  <Icon name="CheckCircleIcon" size={16} />
                  Confirm Final Payment Received
                </button>
              )}
              {selectedBooking.status === 'final_payment_received' && (
                <button onClick={() => updateStatus(selectedBooking.id, 'completed')}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2">
                  <Icon name="CheckBadgeIcon" size={16} />
                  Mark as Completed
                </button>
              )}
              {selectedBooking.status === 'completed' && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-center gap-2 py-2 text-emerald-700 font-semibold text-sm bg-emerald-50 rounded-xl">
                    <Icon name="CheckBadgeIcon" size={18} />
                    Booking Completed
                  </div>
                  <a href={buildWhatsAppLink(selectedBooking.phone, buildCompletedWhatsAppText(selectedBooking))}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl w-full justify-center"
                    style={{ background: '#25D366', color: 'white' }}>
                    <Icon name="ChatBubbleLeftRightIcon" size={16} />
                    Send Final Summary via WhatsApp
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── CUSTOMER DETAIL DRAWER ─── */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedCustomer(null)} />
          <div className="w-full max-w-sm bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Customer Profile</h2>
              <button onClick={() => setSelectedCustomer(null)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
                <Icon name="XMarkIcon" size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-5 space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(200,134,10,0.1)' }}>
                  <span className="text-2xl font-bold" style={{ color: '#C8860A' }}>{selectedCustomer.name.charAt(0)}</span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-lg">{selectedCustomer.name}</div>
                  <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">{selectedCustomer.status}</span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Icon name="EnvelopeIcon" size={15} className="text-gray-400" />
                  {selectedCustomer.email}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Icon name="PhoneIcon" size={15} className="text-gray-400" />
                  {selectedCustomer.phone}
                </div>
              </div>
              <a href={buildWhatsAppLink(selectedCustomer.phone, `Hi ${selectedCustomer.name.split(' ')[0]}, this is Honeymoon. How can we help you today?`)}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl w-full"
                style={{ background: '#25D366', color: 'white' }}>
                <Icon name="ChatBubbleLeftRightIcon" size={16} />
                Open WhatsApp Chat
              </a>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-gray-900">{selectedCustomer.totalBookings}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Total Bookings</div>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(200,134,10,0.08)' }}>
                  <div className="text-2xl font-bold" style={{ color: '#C8860A' }}>{selectedCustomer.totalSpent > 0 ? `£${selectedCustomer.totalSpent.toLocaleString()}` : '—'}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Total Spent</div>
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Booking History</div>
                <div className="space-y-2">
                  {bookings.filter(b => {
                    const nameKey = (b.name || 'Unknown').trim().toLowerCase();
                    const contactKey = (b.email || b.phone || '').trim().toLowerCase();
                    return `${nameKey}_${contactKey}` === selectedCustomer.id;
                  }).map((b) => (
                    <div key={b.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{b.eventType}</div>
                        <div className="text-xs text-gray-400">{b.date}</div>
                      </div>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[b.status]}`}>
                        {STATUS_LABELS[b.status]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ─── CUSTOM ALERT MODAL ─── */}
      {customAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-100 flex flex-col items-center text-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${customAlert.type === 'success' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
              <Icon name={customAlert.type === 'success' ? 'CheckIcon' : 'ExclamationTriangleIcon'} size={24} />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">{customAlert.type === 'success' ? 'Success' : 'Error'}</h3>
            <p className="text-sm text-gray-500 mb-5">{customAlert.message}</p>
            <button
              onClick={() => setCustomAlert(null)}
              className="px-6 py-2 rounded-xl text-sm font-semibold text-white transition-all shadow-md active:scale-95 hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
