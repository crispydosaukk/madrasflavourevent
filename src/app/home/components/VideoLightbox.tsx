'use client';

import React, { useEffect, useCallback } from 'react';
import Icon from '@/components/ui/AppIcon';

interface VideoLightboxProps {
  isOpen: boolean;
  onClose: () => void;
}

const VideoLightbox: React.FC<VideoLightboxProps> = ({ isOpen, onClose }) => {
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
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-12 modal-backdrop"
      style={{ background: 'rgba(15, 27, 45, 0.95)', backdropFilter: 'blur(16px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-content w-full max-w-4xl relative">
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-midnight-text hover:text-white transition-colors flex items-center gap-2 text-sm font-medium"
          aria-label="Close video"
        >
          <Icon name="XMarkIcon" size={20} />
          <span>Close (Esc)</span>
        </button>

        {/* Video placeholder — 16:9 ratio */}
        <div className="bg-midnight rounded-2xl border border-midnight-border overflow-hidden aspect-video flex items-center justify-center relative">
          {/* Simulated video player */}
          <div className="absolute inset-0 bg-gradient-to-br from-midnight via-midnight-lighter to-midnight" />

          {/* Fake timeline/progress */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-midnight/90">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 h-1 bg-midnight-border rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-teal-primary rounded-full" />
              </div>
              <span className="text-10 text-midnight-text font-mono">0:32 / 1:28</span>
            </div>
            <div className="flex items-center gap-3">
              <button className="text-white hover:text-teal-light transition-colors">
                <Icon name="PlayIcon" size={18} variant="solid" />
              </button>
              <button className="text-midnight-text hover:text-white transition-colors">
                <Icon name="SpeakerWaveIcon" size={16} />
              </button>
              <span className="text-sm text-white font-medium flex-1 truncate">
                QuoteFlow: RFP to Signed Proposal in 90 Seconds
              </span>
              <button className="text-midnight-text hover:text-white transition-colors">
                <Icon name="ArrowsPointingOutIcon" size={16} />
              </button>
            </div>
          </div>

          {/* Center play button */}
          <div className="relative z-10 flex flex-col items-center gap-4">
            <button className="w-20 h-20 rounded-full bg-coral/20 border-2 border-coral flex items-center justify-center hover:bg-coral/40 transition-all duration-300 hover:scale-110 hover:shadow-coral-glow">
              <Icon name="PlayIcon" size={32} className="text-coral ml-1" variant="solid" />
            </button>
            <div className="text-center">
              <div className="text-white font-semibold text-base">Product Walkthrough</div>
              <div className="text-midnight-text text-sm">90-second overview · No signup required</div>
            </div>
          </div>

          {/* Fake product screenshot overlay */}
          <div className="absolute top-6 left-6 right-6 bottom-16 flex items-center justify-center opacity-10">
            <div className="grid grid-cols-3 gap-2 w-full max-w-lg">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-teal-primary rounded-lg h-16" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoLightbox;