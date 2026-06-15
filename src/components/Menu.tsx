import { motion } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { SIGNATURE_ITEMS } from '../data/menu';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

import { ASSETS } from '../constants';

const signatureImages = [
  "/images/zangi.webp",
  "/images/beef_stew.webp",
  "/images/saba.webp",
  "/images/poteto.webp",
  "/images/eel.webp",
  "/images/kakuni.webp",
  "/images/cheesecake.webp",
];

const signatureImagePositions: Record<number, string> = {
  5: 'object-top',
};

export function Menu({ className }: { className?: string }) {
  const { language } = useLanguage();
  const lang = language === 'jp' ? 'jp' : 'en';

  const tripledItems = [...SIGNATURE_ITEMS, ...SIGNATURE_ITEMS, ...SIGNATURE_ITEMS];
  const tripledImages = [...signatureImages, ...signatureImages, ...signatureImages];

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'center',
    containScroll: false,
    loop: false,
    dragFree: false,
    startIndex: SIGNATURE_ITEMS.length,
  }, [
    Autoplay({ delay: 3000, stopOnInteraction: false, stopOnMouseEnter: true })
  ]);

  // The dynamic transformation logic with circular positioning (updated for tighter screen space)
  const applyParallax = useCallback(() => {
    if (!emblaApi) return;

    const engine = emblaApi.internalEngine();
    const scrollProgress = emblaApi.scrollProgress();
    const slides = emblaApi.slideNodes();

    slides.forEach((slideNode, index) => {
      const snap = emblaApi.scrollSnapList()[index];
      let diff = snap - scrollProgress;

      // Loop correction (shortest distance around the circle)
      if (engine.options.loop) {
        if (diff > 0.5) diff -= 1;
        if (diff < -0.5) diff += 1;
      }

      // Convert to item-count based distance
      const distance = diff * slides.length;

      // Parabolic curve for Y translation (concave valley) - adjusted to be less steep for shorter screens
      const translateY = -Math.pow(distance * 1.0, 2) * 60;

      // Scale and Opacity based on distance from center
      const absDistance = Math.abs(distance);
      const scale = 1 - Math.pow(absDistance * 0.4, 1.5) * 0.4;
      const opacity = 1 - Math.pow(absDistance * 0.4, 1.2);

      // Apply styles
      slideNode.style.transform = `translateY(${translateY}px) scale(${Math.max(0.65, scale)})`;
      slideNode.style.opacity = `${Math.max(0.1, opacity)}`;
    });
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    emblaApi.on('scroll', applyParallax);
    emblaApi.on('reInit', applyParallax);

    // Slight delay to ensure layout is settled
    const timeout = setTimeout(applyParallax, 50);
    return () => clearTimeout(timeout);
  }, [emblaApi, applyParallax]);

  // Silent reset: when autoplay/drag drifts into the first or last copy,
  // instantly jump back to the same item in the middle copy.
  useEffect(() => {
    if (!emblaApi) return;
    const n = SIGNATURE_ITEMS.length;
    const onSettle = () => {
      const i = emblaApi.selectedScrollSnap();
      if (i < n)           emblaApi.scrollTo(i + n, true);
      else if (i >= n * 2) emblaApi.scrollTo(i - n, true);
    };
    emblaApi.on('settle', onSettle);
    return () => { emblaApi.off('settle', onSettle); };
  }, [emblaApi]);

  return (
    <section id="menu" className={cn("h-full w-full flex flex-col items-center justify-center text-brown relative z-10 scroll-mt-0 overflow-hidden bg-[#F4E3D3]", className)}>
      {/* Background Image Layer */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/quotes_bg.webp"
          className="w-full h-full object-cover"
          alt=""
          loading="lazy"
        />
      </div>
      
      {/* 1. HEADER - Adjusted for snapped sections to be below navbar */}
      <div className="absolute top-16 md:top-20 lg:top-28 flex flex-col items-center z-30 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative w-36 h-36 md:w-56 md:h-56 lg:w-64 lg:h-64 flex items-center justify-center overflow-visible"
        >
          {/* Curved Text Above Logo */}
          <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full overflow-visible">
            <defs>
              <path
                id="headerCurve"
                d="M 20, 100 A 80, 80 0 0, 1 180, 100"
              />
            </defs>
            <text className="fill-orange text-[16px] font-bold tracking-[0.2em] uppercase font-sans">
              <textPath href="#headerCurve" startOffset="50%" textAnchor="middle">
                Our Signature
              </textPath>
            </text>
          </svg>
          
          {/* Logo centered */}
          <div className="-mt-3 md:-mt-10 lg:-mt-3">
            <img
              src={ASSETS.LOGO}
              alt="Karabina Logo"
              className="h-22 md:h-20 lg:h-24 w-auto object-contain z-10"
            />
          </div>
        </motion.div>
      </div>

      {/* 2. EMBLA CAROUSEL WITH CURVE EFFECT */}
      <div className="w-full mt-48 md:mt-56 lg:mt-64 relative z-10">
        <div className="embla overflow-visible" ref={emblaRef}>
          <div className="flex">
            {tripledItems.map((item, i) => (
              <div
                key={i}
                className="flex-[0_0_80%] md:flex-[0_0_35%] lg:flex-[0_0_28%] min-w-0 px-4 lg:px-6 transition-transform duration-100 ease-out"
              >
                <div className="flex flex-col items-center group">
                  {/* Dish Podium (Slightly smaller to fit 3 items reliably) */}
                  <div className="relative mb-4 md:mb-6">
                    <div className="absolute inset-[-10%] bottom-[-10%] bg-black/5 blur-[40px] rounded-full pointer-events-none" />
                    <div className="w-[140px] h-[140px] md:w-[180px] md:h-[180px] lg:w-[200px] lg:h-[200px] xl:w-[220px] xl:h-[220px] rounded-full bg-white shadow-xl flex items-center justify-center overflow-hidden border border-brown/5 ring-4 ring-white/50">
                      <img
                        src={tripledImages[i]}
                        className={cn("w-[92%] h-[92%] object-cover rounded-full shadow-inner", signatureImagePositions[i % signatureImages.length])}
                        alt={item.name[lang]}
                        loading="lazy"
                      />
                    </div>
                  </div>

                  {/* Typography - Horizontal */}
                  <div className="max-w-[260px] text-center">
                    <h4 className="text-base lg:text-xl font-medium tracking-tight text-brown mb-1">
                      {item.name[lang]}
                    </h4>
                    
                    <div className="flex items-center justify-center gap-2 mb-2 lg:mb-3">
                       <div className="w-1 h-1 rotate-45 bg-orange/40" />
                       <div className="h-[1px] w-8 lg:w-12 bg-orange/20" />
                       <div className="w-1 h-1 rotate-45 bg-orange/40" />
                    </div>

                    <p className="text-[10px] lg:text-xs text-brown/60 leading-relaxed font-light line-clamp-2">
                      {item.desc?.[lang]}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Arrows (Desktop) */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-2 md:px-[8%] lg:px-[8%] xl:px-[5%] z-30 pointer-events-none">
          <button 
            onClick={() => emblaApi?.scrollPrev()}
            className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-white/80 border border-brown/10 shadow-xl flex items-center justify-center pointer-events-auto hover:bg-orange hover:text-white transition-all transform hover:scale-110 active:scale-95"
          >
            <ChevronLeft className="w-5 h-5 md:w-7 md:h-7" />
          </button>
          <button 
            onClick={() => emblaApi?.scrollNext()}
            className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-white/80 border border-brown/10 shadow-xl flex items-center justify-center pointer-events-auto hover:bg-orange hover:text-white transition-all transform hover:scale-110 active:scale-95"
          >
            <ChevronRight className="w-5 h-5 md:w-7 md:h-7" />
          </button>
        </div>
      </div>

      {/* 3. FLOATING RESERVE BUTTON (More compact) */}
      <div className="mt-8 md:absolute md:bottom-12 md:right-32 md:m-0 z-40">
        <Link 
          to="/menu"
          className="group w-24 h-24 md:w-32 md:h-32 lg:w-36 lg:h-36 bg-orange text-white rounded-full flex flex-col items-center justify-center text-center p-3 lg:p-6 shadow-[0_20px_50px_rgba(210,127,77,0.3)] hover:scale-105 transition-all duration-700 hover:rotate-6 relative overflow-hidden"
          style={{ borderRadius: '48% 52% 58% 42% / 45% 42% 58% 55%' }}
        >
          <Search className="w-4 h-4 lg:w-6 lg:h-6 mb-1 lg:mb-2" />
          <span className="text-[9px] lg:text-[10px] font-bold leading-tight uppercase tracking-widest px-2">
             {language === 'jp' ? 'すべてのメニューへ' : 'SEE FULL MENU'}
          </span>
          {/* Animated glow */}
          <div className="absolute -inset-2 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-xl" />
        </Link>
      </div>

      {/* 4. SEASONAL DECO (Bottom Left) */}
      <div className="absolute bottom-6 left-6 z-40 hidden md:flex flex-col items-center">
         <div className="w-[1px] h-12 bg-brown/20 mb-4" />
         <span className="vertical-rl text-[10px] font-bold text-brown/40 uppercase tracking-[0.4em] transform rotate-180">
            Karabina Special Selection
          </span>
      </div>
    </section>
  );
}
