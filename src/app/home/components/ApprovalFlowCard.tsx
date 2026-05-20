'use client';

import React, { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ui/AppIcon';

const APPROVAL_STEPS = [
  {
    id: 'sent',
    label: 'Proposal Sent',
    sub: 'Delivered to client inbox',
    time: '9:02 AM',
    icon: 'PaperAirplaneIcon',
    done: true,
  },
  {
    id: 'opened',
    label: 'Client Opened',
    sub: 'Viewed on iPhone · San Francisco',
    time: '9:17 AM',
    icon: 'EyeIcon',
    done: true,
  },
  {
    id: 'signed',
    label: 'E-Signature Captured',
    sub: 'Jennifer Walsh · VP Events',
    time: '9:31 AM',
    icon: 'PencilSquareIcon',
    done: true,
  },
  {
    id: 'deposit',
    label: 'Deposit Collected',
    sub: '$18,450 · Visa ending 4242',
    time: '9:32 AM',
    icon: 'CreditCardIcon',
    done: false,
    active: true,
  },
  {
    id: 'confirmed',
    label: 'Booking Confirmed',
    sub: 'PMS sync & team notified',
    time: 'Pending',
    icon: 'CheckBadgeIcon',
    done: false,
  },
];

const ApprovalFlowCard: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="bg-linen rounded-3xl p-6 md:p-8 border border-linen-dark h-full flex flex-col card-lift shadow-card-light"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-9 font-bold tracking-24 uppercase text-teal-primary mb-1">
            Client Approval Flow
          </div>
          <h3 className="text-xl font-display font-light text-text-primary leading-snug">
            One tap from quote<br />
            <span className="italic text-text-secondary">to confirmed.</span>
          </h3>
        </div>
        <div className="bg-teal-primary/10 rounded-xl p-3">
          <Icon name="CheckBadgeIcon" size={22} className="text-teal-primary" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-linen-dark rounded-full h-1.5 mb-6 overflow-hidden">
        <div
          className="h-full rounded-full bg-teal-primary transition-all duration-1000"
          style={{
            width: visible ? '70%' : '0%',
            transitionDelay: '0.3s',
          }}
        />
      </div>

      {/* Timeline */}
      <div className="flex-1 space-y-1">
        {APPROVAL_STEPS.map((step, idx) => (
          <div
            key={step.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
              step.active
                ? 'bg-coral/8 border border-coral/20'
                : step.done
                ? 'bg-teal-primary/5' :'opacity-40'
            }`}
            style={{
              transitionDelay: visible ? `${idx * 0.12}s` : '0s',
              opacity: visible ? (step.done || step.active ? 1 : 0.4) : 0,
              transform: visible ? 'translateX(0)' : 'translateX(-12px)',
              transition: `opacity 0.5s ease ${idx * 0.12}s, transform 0.5s cubic-bezier(0.16,1,0.3,1) ${idx * 0.12}s`,
            }}
          >
            {/* Icon */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                step.active
                  ? 'bg-coral/20'
                  : step.done
                  ? 'bg-teal-primary/15' :'bg-linen-dark'
              }`}
            >
              <Icon
                name={step.icon as 'PaperAirplaneIcon'}
                size={15}
                className={
                  step.active ? 'text-coral' : step.done ? 'text-teal-primary' : 'text-text-secondary'
                }
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-sm font-semibold ${
                    step.active ? 'text-coral' : step.done ? 'text-text-primary' : 'text-text-secondary'
                  }`}
                >
                  {step.label}
                </span>
                <span className="text-10 text-text-secondary flex-shrink-0 font-mono">{step.time}</span>
              </div>
              <span className="text-10 text-text-secondary">{step.sub}</span>
            </div>

            {/* Check */}
            {step.done && (
              <Icon name="CheckCircleIcon" size={16} className="text-teal-primary flex-shrink-0" variant="solid" />
            )}
            {step.active && (
              <div className="w-4 h-4 rounded-full border-2 border-coral border-t-transparent animate-spin flex-shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Stat */}
      <div className="mt-5 pt-4 border-t border-linen-dark flex items-center justify-between">
        <div className="text-center">
          <div className="text-2xl font-display font-light text-teal-primary">29 min</div>
          <div className="text-10 text-text-secondary uppercase tracking-08 font-medium">Avg. approval time</div>
        </div>
        <div className="w-px h-10 bg-linen-dark" />
        <div className="text-center">
          <div className="text-2xl font-display font-light text-teal-primary">94%</div>
          <div className="text-10 text-text-secondary uppercase tracking-08 font-medium">Client open rate</div>
        </div>
        <div className="w-px h-10 bg-linen-dark" />
        <div className="text-center">
          <div className="text-2xl font-display font-light" style={{ color: '#FF6B5A' }}>$0</div>
          <div className="text-10 text-text-secondary uppercase tracking-08 font-medium">Transaction fee</div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalFlowCard;