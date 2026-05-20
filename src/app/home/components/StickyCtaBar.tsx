'use client';

import React, { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface StickyCtaBarProps {
  onOpenModal: () => void;
  onOpenVideo: () => void;
}

const StickyCtaBar: React.FC<StickyCtaBarProps> = ({ onOpenModal, onOpenVideo }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const windowHeight = window.innerHeight;
      setVisible(scrolled > windowHeight * 1.5);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] sticky-bar-enter"
      style={{
        background: 'rgba(15, 27, 45, 0.97)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid #1E2F45',
      }}
    >
      <div className="max-w-8xl mx-auto px-6 md:px-12 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-coral animate-pulse" />
          <span className="text-sm font-medium text-white">
            QuoteFlow is free to start —
            <span className="text-midnight-text ml-1">no credit card, no RFP left behind.</span>
          </span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={onOpenVideo}
            className="flex items-center gap-2 text-11 font-bold tracking-08 uppercase text-midnight-text hover:text-white transition-colors border border-midnight-border hover:border-midnight-text/60 px-4 py-2.5 rounded-full"
          >
            <Icon name="PlayCircleIcon" size={16} />
            Watch 90s Demo
          </button>
          <button
            onClick={onOpenModal}
            className="flex items-center gap-2 bg-coral hover:bg-coral-dark text-white text-11 font-bold tracking-08 uppercase px-5 py-2.5 rounded-full transition-all hover:shadow-coral-glow"
          >
            <Icon name="DocumentTextIcon" size={16} />
            Build Your First Proposal Free
          </button>
        </div>
      </div>
    </div>
  );
};

export default StickyCtaBar;