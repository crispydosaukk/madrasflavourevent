'use client';

import React, { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ui/AppIcon';

const EVENT_DATA = [
  { type: 'Corporate', count: 48, value: 2840000, conversion: 68, color: '#0D7377', height: 82 },
  { type: 'Wedding', count: 31, value: 1920000, conversion: 91, color: '#FF6B5A', height: 58 },
  { type: 'Gala', count: 19, value: 1480000, conversion: 74, color: '#14A3A8', height: 44 },
  { type: 'Retreat', count: 27, value: 1160000, conversion: 62, color: '#0D7377', height: 38 },
  { type: 'Conference', count: 42, value: 3100000, conversion: 71, color: '#14A3A8', height: 95 },
];

const PROPERTIES = [
  { name: 'Grand Hyatt Chicago', pipeline: '$2.4M', deals: 23, trend: '+14%', up: true },
  { name: 'Marriott Denver', pipeline: '$1.8M', deals: 18, trend: '+8%', up: true },
  { name: 'Hilton San Francisco', pipeline: '$3.1M', deals: 31, trend: '-3%', up: false },
];

const PipelineAnalyticsCard: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const formatM = (n: number) => `$${(n / 1000000).toFixed(1)}M`;

  return (
    <div
      ref={ref}
      className="bg-midnight rounded-3xl p-6 md:p-8 border border-midnight-border h-full flex flex-col card-lift teal-glow"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-9 font-bold tracking-24 uppercase text-teal-light mb-1">
            Pipeline Analytics
          </div>
          <h3 className="text-xl font-display font-light text-white leading-snug">
            Every RFP. Every property.<br />
            <span className="italic text-midnight-text">One dashboard.</span>
          </h3>
        </div>
        <div className="text-right">
          <div className="text-2xl font-display font-light text-white">$10.5M</div>
          <div className="text-10 text-midnight-text uppercase tracking-08 font-medium">Active pipeline</div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="mb-6">
        <div className="flex items-end gap-3 h-24 mb-2">
          {EVENT_DATA.map((d, idx) => (
            <div key={d.type} className="flex-1 flex flex-col items-center gap-1">
              <div className="text-10 text-midnight-text font-mono">{d.conversion}%</div>
              <div className="w-full rounded-t-lg overflow-hidden" style={{ height: '80px', display: 'flex', alignItems: 'flex-end' }}>
                <div
                  className="w-full rounded-t-lg transition-all duration-1000"
                  style={{
                    height: visible ? `${d.height}%` : '0%',
                    background: `linear-gradient(to top, ${d.color}, ${d.color}99)`,
                    transitionDelay: `${idx * 0.1}s`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          {EVENT_DATA.map((d) => (
            <div key={d.type} className="flex-1 text-center">
              <div className="text-10 text-midnight-text truncate">{d.type}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Property table */}
      <div className="flex-1">
        <div className="text-9 font-bold tracking-24 uppercase text-midnight-text mb-3">
          Properties · Q1 2026
        </div>
        <div className="space-y-2">
          {PROPERTIES.map((prop, idx) => (
            <div
              key={prop.name}
              className="flex items-center justify-between px-4 py-3 bg-midnight-lighter rounded-xl border border-midnight-border hover:border-teal-primary/40 transition-colors"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateX(0)' : 'translateX(20px)',
                transition: `opacity 0.5s ease ${0.5 + idx * 0.1}s, transform 0.5s cubic-bezier(0.16,1,0.3,1) ${0.5 + idx * 0.1}s`,
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-teal-primary" />
                <span className="text-sm text-white font-medium">{prop.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right hidden md:block">
                  <div className="text-sm font-semibold text-white">{prop.pipeline}</div>
                  <div className="text-10 text-midnight-text">{prop.deals} active deals</div>
                </div>
                <div
                  className={`flex items-center gap-1 text-10 font-bold ${
                    prop.up ? 'text-teal-light' : 'text-coral'
                  }`}
                >
                  <Icon name={prop.up ? 'ArrowTrendingUpIcon' : 'ArrowTrendingDownIcon'} size={12} />
                  {prop.trend}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-midnight-border flex items-center justify-between text-10 text-midnight-text">
        <span className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-teal-light animate-pulse" />
          Synced 2 minutes ago
        </span>
        <span className="flex items-center gap-1.5">
          <Icon name="BuildingOfficeIcon" size={12} className="text-teal-light" />
          3 properties · 72 active RFPs
        </span>
      </div>
    </div>
  );
};

export default PipelineAnalyticsCard;