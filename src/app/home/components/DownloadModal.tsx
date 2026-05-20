'use client';

import React, { useEffect, useCallback } from 'react';
import Icon from '@/components/ui/AppIcon';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Simple QR-like grid for visual representation
const QRDisplay: React.FC = () => {
  const pattern = [
    [1,1,1,0,1,1,1],
    [1,0,1,0,1,0,1],
    [1,1,1,1,0,1,1],
    [0,1,0,1,0,0,0],
    [1,1,0,1,1,1,1],
    [1,0,1,0,0,1,0],
    [1,1,1,0,1,1,1],
  ];
  return (
    <div className="bg-white rounded-xl p-3 inline-block">
      <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {pattern.flat().map((cell, i) => (
          <div
            key={i}
            className="w-4 h-4 rounded-sm"
            style={{ background: cell ? '#0F1B2D' : 'transparent' }}
          />
        ))}
      </div>
    </div>
  );
};

const DownloadModal: React.FC<DownloadModalProps> = ({ isOpen, onClose }) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 modal-backdrop"
      style={{ background: 'rgba(15, 27, 45, 0.85)', backdropFilter: 'blur(12px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-content bg-midnight border border-midnight-border rounded-3xl p-8 w-full max-w-lg relative overflow-hidden">
        {/* Teal accent */}
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl"
          style={{ background: 'linear-gradient(90deg, #0D7377, #FF6B5A, #0D7377)' }}
        />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-midnight-text hover:text-white transition-colors"
          aria-label="Close modal"
        >
          <Icon name="XMarkIcon" size={22} />
        </button>

        {/* Header */}
        <div className="mb-8">
          <div className="text-9 font-bold tracking-24 uppercase text-teal-light mb-2">
            Free Access
          </div>
          <h2 className="text-2xl font-display font-light text-white leading-snug">
            Build your first proposal<br />
            <span className="italic" style={{ color: '#FF6B5A' }}>in under 5 minutes.</span>
          </h2>
          <p className="text-sm text-midnight-text mt-2">
            Full access on iOS & Android. No credit card required.
          </p>
        </div>

        {/* QR + App badges */}
        <div className="flex flex-col sm:flex-row gap-6 mb-8">
          <div className="flex flex-col items-center gap-2">
            <QRDisplay />
            <span className="text-10 text-midnight-text font-medium tracking-08 uppercase">
              Scan to download
            </span>
          </div>
          <div className="flex-1 flex flex-col gap-3 justify-center">
            <button className="flex items-center gap-4 bg-midnight-lighter border border-midnight-border hover:border-teal-primary rounded-xl px-5 py-3.5 transition-all group">
              <Icon name="DevicePhoneMobileIcon" size={24} className="text-white flex-shrink-0" />
              <div className="text-left">
                <div className="text-10 text-midnight-text uppercase tracking-08 font-medium">Download on the</div>
                <div className="text-base font-semibold text-white">App Store</div>
              </div>
              <Icon name="ArrowRightIcon" size={16} className="text-midnight-text group-hover:text-teal-light ml-auto transition-colors" />
            </button>
            <button className="flex items-center gap-4 bg-midnight-lighter border border-midnight-border hover:border-teal-primary rounded-xl px-5 py-3.5 transition-all group">
              <Icon name="DevicePhoneMobileIcon" size={24} className="text-white flex-shrink-0" />
              <div className="text-left">
                <div className="text-10 text-midnight-text uppercase tracking-08 font-medium">Get it on</div>
                <div className="text-base font-semibold text-white">Google Play</div>
              </div>
              <Icon name="ArrowRightIcon" size={16} className="text-midnight-text group-hover:text-teal-light ml-auto transition-colors" />
            </button>
          </div>
        </div>

        {/* Email field */}
        <div className="border-t border-midnight-border pt-6">
          <label className="text-10 font-bold tracking-16 uppercase text-midnight-text mb-3 block">
            Or send the link to your work inbox
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="you@marriott.com"
              className="flex-1 bg-midnight-lighter border border-midnight-border rounded-xl px-4 py-3 text-sm text-white placeholder-midnight-text focus:outline-none focus:border-teal-primary transition-colors"
            />
            <button
              className="bg-coral hover:bg-coral-dark text-white font-bold text-11 tracking-08 uppercase px-5 py-3 rounded-xl transition-all hover:shadow-coral-glow flex-shrink-0"
            >
              Send
            </button>
          </div>
        </div>

        {/* Trust signals */}
        <div className="mt-4 flex items-center justify-center gap-4 text-10 text-midnight-text">
          <span className="flex items-center gap-1">
            <Icon name="ShieldCheckIcon" size={12} className="text-teal-light" />
            SOC 2 Type II
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Icon name="LockClosedIcon" size={12} className="text-teal-light" />
            256-bit encryption
          </span>
          <span>·</span>
          <span>12,400+ teams</span>
        </div>
      </div>
    </div>
  );
};

export default DownloadModal;