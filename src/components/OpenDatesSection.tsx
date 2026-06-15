import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';

function getSeasonStartYear(): number {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  if (month === 12) return year;
  if (month >= 1 && month <= 3) return year - 1;
  return year;
}

const flipVariants = {
  enter: (dir: number) => ({ rotateX: dir > 0 ? 65 : -65, opacity: 0, scale: 0.96 }),
  center: { rotateX: 0, opacity: 1, scale: 1 },
  exit: (dir: number) => ({ rotateX: dir > 0 ? -80 : 80, opacity: 0, scale: 0.96 }),
};

export function OpenDatesSection() {
  const { t } = useLanguage();
  const [closedDates, setClosedDates] = useState<Date[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const startYear = getSeasonStartYear();
  const seasonStart = new Date(startYear, 11, 1);
  const seasonEnd = new Date(startYear + 1, 2, 31);
  const currentMonth = new Date().getMonth() + 1;
  const isCurrentSeason = currentMonth === 12 || (currentMonth >= 1 && currentMonth <= 3);

  const months = [
    new Date(startYear, 11, 1),
    new Date(startYear + 1, 0, 1),
    new Date(startYear + 1, 1, 1),
    new Date(startYear + 1, 2, 1),
  ];

  useEffect(() => {
    supabase
      .from('closed_dates')
      .select('date')
      .then(({ data }) => {
        if (data) {
          setClosedDates(
            data.map(({ date }) => {
              const [y, m, d] = date.split('-').map(Number);
              return new Date(y, m - 1, d);
            })
          );
        }
      });
  }, []);

  const goTo = (newIndex: number) => {
    if (newIndex === currentIndex) return;
    setDirection(newIndex > currentIndex ? 1 : -1);
    setCurrentIndex(newIndex);
  };

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x < -40) goTo(Math.min(currentIndex + 1, 3));
    else if (info.offset.x > 40) goTo(Math.max(currentIndex - 1, 0));
  };

  const calendarStyle = {
    '--rdp-accent-color': '#EB7832',
    '--rdp-accent-background-color': 'rgba(235,120,50,0.15)',
    '--rdp-day-height': '31px',
    '--rdp-day-width': '37px',
    '--rdp-day_button-height': '29px',
    '--rdp-day_button-width': '35px',
    '--rdp-disabled-opacity': '0.25',
    color: '#4D2C1A',
  } as React.CSSProperties;

  const sharedDayPickerProps = {
    hideNavigation: true as const,
    fixedWeeks: true as const,
    showOutsideDays: false as const,
    disabled: [{ before: seasonStart }, { after: seasonEnd }],
    modifiers: { closed: closedDates },
    modifiersStyles: {
      closed: { color: '#f87171', textDecoration: 'line-through', opacity: 0.6 },
    },
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-brown text-cream">
      {/* Header + Calendars — centered as a single unit */}
      <div className="flex-1 flex flex-col justify-center overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-6 lg:px-12 xl:px-20 pt-2 pb-4 lg:pb-6">
          <div className="w-12 h-[2px] bg-orange mb-4" />
          <div className="flex items-center gap-4 mb-2">
            <p className="uppercase text-[10px] tracking-widest font-bold opacity-40">
              {isCurrentSeason ? t('open_dates.current') : t('open_dates.upcoming')}
              {' · '}
              {startYear} / {startYear + 1}
            </p>
            <span className="uppercase text-[10px] tracking-widest font-bold px-3 py-1 rounded-full bg-orange text-cream">
              {t('footer.winter_only')}
            </span>
          </div>
          <h2 className="text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tighter uppercase mb-1">
            {t('open_dates.title')}
          </h2>
          <p className="text-base lg:text-2xl xl:text-3xl font-light opacity-30 tracking-tight mb-1 lg:mb-2">
            December — March
          </p>
          <p className="text-sm opacity-60 font-light max-w-xl">
            {t('open_dates.open_note')}
          </p>
        </div>

        {/* MOBILE: single month with page-flip animation */}
        <div
          className="md:hidden flex-shrink-0 flex flex-col items-center px-6 pb-2"
          style={{ perspective: '1000px' }}
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={flipVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.42, ease: [0.33, 1, 0.68, 1] }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.12}
              onDragEnd={handleDragEnd}
              style={{ transformOrigin: 'top center' }}
              className="border border-brown/10 rounded-2xl p-3 bg-[#F3E3D3] shadow-[0_8px_32px_rgba(0,0,0,0.4)] cursor-grab active:cursor-grabbing select-none w-fit mx-auto"
            >
              <DayPicker {...sharedDayPickerProps} defaultMonth={months[currentIndex]} style={calendarStyle} />
            </motion.div>
          </AnimatePresence>
          <div className="flex items-center gap-3 mt-4">
            {months.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={cn(
                  'rounded-full transition-all duration-300',
                  i === currentIndex ? 'bg-orange h-2 w-5' : 'bg-cream/30 h-2 w-2'
                )}
              />
            ))}
          </div>
          <p className="mt-2 uppercase text-[9px] tracking-widest opacity-25 font-bold">
            swipe to browse months
          </p>
        </div>

        {/* DESKTOP: all 4 months in a horizontal scrollable row */}
        <div
          className="hidden md:block flex-shrink-0 overflow-x-auto overflow-y-hidden"
          style={{ scrollbarWidth: 'none' } as React.CSSProperties}
        >
          <div className="flex gap-4 lg:gap-6 px-6 lg:px-12 xl:px-20 pb-2">
            {months.map((monthDate) => (
              <div
                key={monthDate.toISOString()}
                className="flex-shrink-0 border border-brown/10 rounded-2xl p-3 lg:p-5 bg-[#F3E3D3] shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
              >
                <DayPicker {...sharedDayPickerProps} defaultMonth={monthDate} style={calendarStyle} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend — anchored to bottom */}
      <div className="flex-shrink-0 px-6 lg:px-12 xl:px-20 pb-6 lg:pb-8 pt-2 flex items-center gap-8 uppercase text-[10px] tracking-widest opacity-40 font-bold">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cream/50" />
          <span>Open</span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ textDecoration: 'line-through', color: '#f87171' }}>12</span>
          <span>{t('open_dates.closed_label')}</span>
        </div>
      </div>
    </div>
  );
}
