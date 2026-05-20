'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/AppIcon';

const EVENT_TYPES = [
  { id: 'conference', label: 'Conference', icon: 'PresentationChartBarIcon', baseRate: 85, roomRate: 189 },
  { id: 'wedding', label: 'Wedding', icon: 'HeartIcon', baseRate: 145, roomRate: 249 },
  { id: 'gala', label: 'Gala', icon: 'StarIcon', baseRate: 120, roomRate: 219 },
  { id: 'retreat', label: 'Retreat', icon: 'SparklesIcon', baseRate: 95, roomRate: 199 },
];

const ADD_ONS = [
  { id: 'av', label: 'AV Package', icon: 'VideoCameraIcon', perPerson: 28, description: 'Screens, mics, streaming' },
  { id: 'rooms', label: 'Room Block', icon: 'BuildingOfficeIcon', perPerson: 0, description: '1 night per 4 guests', custom: true },
  { id: 'plated', label: 'Plated Dinner', icon: 'SparklesIcon', perPerson: 62, description: 'vs. buffet ($38/pp)' },
  { id: 'bar', label: 'Open Bar', icon: 'GiftIcon', perPerson: 45, description: '4-hour premium package' },
];

interface LineItem {
  label: string;
  amount: number;
  highlight?: boolean;
}

const ProposalEstimator: React.FC = () => {
  const [eventType, setEventType] = useState('conference');
  const [guestCount, setGuestCount] = useState(150);
  const [addOns, setAddOns] = useState<Record<string, boolean>>({
    av: true,
    rooms: false,
    plated: false,
    bar: false,
  });
  const [displayTotal, setDisplayTotal] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  const calculateQuote = useCallback(() => {
    const event = EVENT_TYPES.find(e => e.id === eventType)!;
    const items: LineItem[] = [];

    const venueBase = event.baseRate * guestCount;
    items.push({ label: 'Venue & F&B Base', amount: venueBase });

    if (addOns.av) {
      items.push({ label: 'AV Package', amount: 28 * guestCount });
    }
    if (addOns.rooms) {
      const rooms = Math.ceil(guestCount / 4);
      items.push({ label: `Room Block (${rooms} rooms × 1 night)`, amount: rooms * event.roomRate });
    }
    if (addOns.plated) {
      items.push({ label: 'Plated Dinner Upgrade', amount: (62 - 38) * guestCount });
    } else {
      items.push({ label: 'Buffet Service', amount: 38 * guestCount });
    }
    if (addOns.bar) {
      items.push({ label: 'Open Bar (4hr)', amount: 45 * guestCount });
    }

    const subtotal = items.reduce((s, i) => s + i.amount, 0);
    const tax = Math.round(subtotal * 0.085);
    items.push({ label: 'Service Charge & Tax (8.5%)', amount: tax });
    items.push({ label: 'TOTAL ESTIMATE', amount: subtotal + tax, highlight: true });

    setLineItems(items);
    return subtotal + tax;
  }, [eventType, guestCount, addOns]);

  useEffect(() => {
    const newTotal = calculateQuote();
    const start = displayTotal;
    const end = newTotal;
    const duration = 600;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayTotal(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
    setAnimKey(k => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventType, guestCount, addOns]);

  const toggleAddOn = (id: string) => {
    setAddOns(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 w-full">
      {/* Left: Inputs */}
      <div className="bg-midnight rounded-3xl p-6 md:p-8 border border-midnight-border teal-glow">
        {/* Event Type */}
        <div className="mb-8">
          <label className="text-9 font-bold tracking-24 uppercase text-midnight-text mb-4 block">
            Event Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {EVENT_TYPES.map((et) => (
              <button
                key={et.id}
                onClick={() => setEventType(et.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-300 ${
                  eventType === et.id
                    ? 'bg-teal-primary border-teal-light text-white shadow-teal-glow'
                    : 'bg-midnight-lighter border-midnight-border text-midnight-text hover:border-teal-primary hover:text-white'
                }`}
              >
                <Icon
                  name={et.icon as 'PresentationChartBarIcon'}
                  size={16}
                  className={eventType === et.id ? 'text-teal-light' : 'text-midnight-text'}
                />
                {et.label}
              </button>
            ))}
          </div>
        </div>

        {/* Guest Count Slider */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <label className="text-9 font-bold tracking-24 uppercase text-midnight-text">
              Guest Count
            </label>
            <span className="text-2xl font-display font-light text-white">
              {guestCount}
              <span className="text-sm text-midnight-text ml-1">guests</span>
            </span>
          </div>
          <input
            type="range"
            min={20}
            max={1000}
            step={10}
            value={guestCount}
            onChange={(e) => setGuestCount(Number(e.target.value))}
            className="estimator-slider w-full"
          />
          <div className="flex justify-between text-9 text-midnight-text mt-2 tracking-08 uppercase font-medium">
            <span>20</span>
            <span>250</span>
            <span>500</span>
            <span>750</span>
            <span>1,000</span>
          </div>
        </div>

        {/* Add-ons */}
        <div>
          <label className="text-9 font-bold tracking-24 uppercase text-midnight-text mb-4 block">
            Add-ons & Services
          </label>
          <div className="space-y-3">
            {ADD_ONS.map((addon) => (
              <div
                key={addon.id}
                className={`flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all duration-300 cursor-pointer ${
                  addOns[addon.id]
                    ? 'bg-teal-muted border-teal-primary/40' :'bg-midnight-lighter border-midnight-border hover:border-midnight-text/40'
                }`}
                onClick={() => toggleAddOn(addon.id)}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    name={addon.icon as 'VideoCameraIcon'}
                    size={18}
                    className={addOns[addon.id] ? 'text-teal-light' : 'text-midnight-text'}
                  />
                  <div>
                    <div className="text-sm font-medium text-white">{addon.label}</div>
                    <div className="text-10 text-midnight-text">{addon.description}</div>
                  </div>
                </div>
                <label className="toggle-switch flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={addOns[addon.id]}
                    onChange={() => toggleAddOn(addon.id)}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Live Quote Card */}
      <div className="bg-linen rounded-3xl p-6 md:p-8 border border-linen-dark flex flex-col shadow-card-light relative overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="text-9 font-bold tracking-24 uppercase text-teal-primary mb-1">
              Live Estimate
            </div>
            <div className="text-base font-semibold text-text-primary capitalize">
              {EVENT_TYPES.find(e => e.id === eventType)?.label} · {guestCount} Guests
            </div>
          </div>
          <div className="bg-teal-muted rounded-full px-3 py-1.5 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-teal-primary animate-pulse" />
            <span className="text-10 font-bold tracking-08 uppercase text-teal-primary">Live</span>
          </div>
        </div>

        {/* Line Items */}
        <div className="flex-1 space-y-2 mb-6" key={animKey}>
          {lineItems.filter(i => !i.highlight).map((item, idx) => (
            <div
              key={item.label}
              className="flex items-center justify-between py-2 border-b border-linen-dark scroll-reveal revealed"
              style={{ transitionDelay: `${idx * 0.05}s` }}
            >
              <span className="text-sm text-text-secondary">{item.label}</span>
              <span className="text-sm font-medium text-text-primary tabular-nums">
                {formatCurrency(item.amount)}
              </span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="bg-midnight rounded-2xl px-6 py-5 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-9 font-bold tracking-24 uppercase text-midnight-text mb-1">
                Total Estimate
              </div>
              <div className="text-10 text-midnight-text">
                Incl. service charge & tax
              </div>
            </div>
            <div
              className="text-3xl md:text-4xl font-display font-light tabular-nums coral-pulse"
              style={{ color: '#FF6B5A' }}
            >
              {formatCurrency(displayTotal)}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-midnight-border flex items-center justify-between text-10 text-midnight-text">
            <span>{formatCurrency(Math.round(displayTotal / guestCount))} per guest</span>
            <span>Est. deposit: {formatCurrency(Math.round(displayTotal * 0.25))}</span>
          </div>
        </div>

        {/* CTA */}
        <button className="w-full bg-coral hover:bg-coral-dark text-white font-bold text-sm tracking-08 uppercase py-4 rounded-xl transition-all duration-300 hover:shadow-coral-glow flex items-center justify-center gap-2 group">
          <Icon name="DocumentTextIcon" size={18} />
          <span>Build Your First Proposal Free</span>
          <Icon name="ArrowRightIcon" size={16} className="group-hover:translate-x-1 transition-transform" />
        </button>

        <p className="text-center text-10 text-text-secondary mt-3">
          No credit card · iOS & Android · 60-second setup
        </p>

        {/* Decorative teal corner accent */}
        <div
          className="absolute top-0 right-0 w-32 h-32 rounded-bl-[8rem] opacity-5"
          style={{ background: 'radial-gradient(circle, #0D7377, transparent)' }}
        />
      </div>
    </div>
  );
};

export default ProposalEstimator;