import React, { useState, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, startOfDay, addMonths, isValid } from 'date-fns';
import 'react-day-picker/style.css';

interface DatePickerProps {
  value: string;          // "YYYY-MM-DD"
  onChange: (date: string) => void;
  max: string;            // "YYYY-MM-DD" — 3 months out
  closedDates?: string[]; // "YYYY-MM-DD" dates to disable
}

function parseDateLocal(str: string): Date | undefined {
  const parts = str.split('-').map(Number);
  if (parts.length !== 3) return undefined;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return isValid(d) ? d : undefined;
}

export default function DatePicker({ value, onChange, max, closedDates = [] }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const today = startOfDay(new Date());
  const maxDate = parseDateLocal(max) ?? addMonths(today, 3);
  const selected = value ? parseDateLocal(value) : undefined;
  const disabledDates = closedDates.map(d => parseDateLocal(d)).filter(Boolean) as Date[];
  const isOffSeason = (date: Date) => { const m = date.getMonth(); return m >= 3 && m <= 10; };

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    setOpen(false);
  };

  const buttonLabel = selected
    ? format(selected, 'yyyy/MM/dd (EEE)')
    : 'Select a date';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full bg-white/5 border border-cream/20 rounded-xl px-4 py-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-orange/50 hover:border-cream/40"
      >
        <span className={selected ? 'text-cream font-medium' : 'text-cream/40 text-sm'}>
          {buttonLabel}
        </span>
      </button>

      {open && (
        <div
          className="absolute z-50 mt-2 left-0 rounded-2xl p-3 shadow-2xl"
          style={{
            background: '#2a1508',
            border: '1px solid rgba(243,227,211,0.15)',
            color: '#F3E3D3',
            '--rdp-accent-color': '#EB7832',
            '--rdp-accent-background-color': 'rgba(235,120,50,0.2)',
            '--rdp-day-height': '42px',
            '--rdp-day-width': '42px',
            '--rdp-day_button-height': '40px',
            '--rdp-day_button-width': '40px',
            '--rdp-disabled-opacity': '0.35',
            '--rdp-outside-opacity': '0.3',
          } as React.CSSProperties}
        >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            disabled={[{ before: today }, { after: maxDate }, isOffSeason, ...disabledDates]}
            defaultMonth={selected ?? today}
            formatters={{
              formatCaption: (month) => `${month.getMonth() + 1}/${month.getFullYear()}`,
            }}
            modifiers={{ closed: disabledDates, offSeason: isOffSeason }}
            modifiersStyles={{
              closed: {
                color: '#f87171',
                textDecoration: 'line-through',
                opacity: 0.6,
              },
              offSeason: {
                opacity: 0.2,
                cursor: 'not-allowed',
              },
            }}
          />
        </div>
      )}
    </div>
  );
}
