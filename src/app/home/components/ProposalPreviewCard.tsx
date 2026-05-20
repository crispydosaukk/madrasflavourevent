'use client';

import React, { useState } from 'react';
import Icon from '@/components/ui/AppIcon';

const SECTIONS = [
  { id: 'cover', label: 'Cover Page', icon: 'DocumentTextIcon', color: '#0D7377' },
  { id: 'summary', label: 'Event Summary', icon: 'ClipboardDocumentListIcon', color: '#14A3A8' },
  { id: 'rooms', label: 'Room Block', icon: 'BuildingOfficeIcon', color: '#0D7377' },
  { id: 'catering', label: 'Catering Menu', icon: 'SparklesIcon', color: '#FF6B5A' },
  { id: 'av', label: 'AV & Tech', icon: 'VideoCameraIcon', color: '#14A3A8' },
  { id: 'pricing', label: 'Pricing & Terms', icon: 'CurrencyDollarIcon', color: '#0D7377' },
];

const ProposalPreviewCard: React.FC = () => {
  const [sections, setSections] = useState(SECTIONS);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const handleDragStart = (id: string) => setDragging(id);
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragOver(id);
  };
  const handleDrop = (targetId: string) => {
    if (!dragging || dragging === targetId) return;
    const fromIdx = sections.findIndex(s => s.id === dragging);
    const toIdx = sections.findIndex(s => s.id === targetId);
    const newSections = [...sections];
    const [moved] = newSections.splice(fromIdx, 1);
    newSections.splice(toIdx, 0, moved);
    setSections(newSections);
    setDragging(null);
    setDragOver(null);
  };

  return (
    <div className="bg-midnight rounded-3xl p-6 md:p-8 border border-midnight-border h-full flex flex-col card-lift teal-glow">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-9 font-bold tracking-24 uppercase text-teal-light mb-1">
            Proposal Builder
          </div>
          <h3 className="text-xl font-display font-light text-white leading-snug">
            Drag to reorder<br />
            <span className="italic text-midnight-text">any section.</span>
          </h3>
        </div>
        <div className="bg-teal-primary/20 rounded-xl p-3">
          <Icon name="DocumentDuplicateIcon" size={22} className="text-teal-light" />
        </div>
      </div>

      {/* Proposal doc preview */}
      <div className="flex-1 bg-midnight-lighter rounded-2xl border border-midnight-border overflow-hidden">
        {/* Doc header bar */}
        <div className="bg-midnight border-b border-midnight-border px-4 py-3 flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-coral/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/40" />
            <div className="w-3 h-3 rounded-full bg-teal-primary/60" />
          </div>
          <div className="flex-1 bg-midnight-border rounded-full h-5 flex items-center px-3">
            <span className="text-10 text-midnight-text truncate">
              Marriott_Proposal_TechSummit2026.qf
            </span>
          </div>
          <div className="flex items-center gap-1 text-10 text-teal-light font-medium">
            <Icon name="CheckCircleIcon" size={12} />
            <span>Auto-saved</span>
          </div>
        </div>

        {/* Section list */}
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Icon name="ArrowsUpDownIcon" size={14} className="text-midnight-text drag-hint" />
            <span className="text-10 font-medium tracking-08 uppercase text-midnight-text">
              Drag sections to reorder
            </span>
          </div>
          {sections.map((section, idx) => (
            <div
              key={section.id}
              draggable
              onDragStart={() => handleDragStart(section.id)}
              onDragOver={(e) => handleDragOver(e, section.id)}
              onDrop={() => handleDrop(section.id)}
              onDragEnd={() => { setDragging(null); setDragOver(null); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-grab active:cursor-grabbing transition-all duration-200 ${
                dragging === section.id
                  ? 'opacity-40 scale-95'
                  : dragOver === section.id
                  ? 'border-teal-primary bg-teal-muted scale-[1.02]'
                  : 'border-midnight-border bg-midnight hover:border-midnight-text/30'
              }`}
            >
              <Icon name="Bars3Icon" size={14} className="text-midnight-text flex-shrink-0" />
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                style={{ background: `${section.color}22` }}
              >
                <Icon name={section.icon as 'DocumentTextIcon'} size={12} style={{ color: section.color }} />
              </div>
              <span className="text-sm text-white flex-1">{section.label}</span>
              <span className="text-10 text-midnight-text font-mono">{String(idx + 1).padStart(2, '0')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer stat */}
      <div className="mt-4 flex items-center justify-between text-10 font-medium text-midnight-text">
        <span className="flex items-center gap-1.5">
          <Icon name="ClockIcon" size={12} className="text-teal-light" />
          Avg. build time: <strong className="text-white ml-1">4.2 minutes</strong>
        </span>
        <span className="flex items-center gap-1.5">
          <Icon name="DocumentCheckIcon" size={12} className="text-coral" />
          <strong className="text-white">12,400+</strong> proposals sent
        </span>
      </div>
    </div>
  );
};

export default ProposalPreviewCard;