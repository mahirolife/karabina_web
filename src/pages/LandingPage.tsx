import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { Link } from 'react-router-dom';
import { Nav } from '../components/Nav';
import { Hero } from '../components/Hero';
import { Menu } from '../components/Menu';
import { HistorySection } from '../components/HistorySection';
import { Footer } from '../components/Footer';
import { OpenDatesSection } from '../components/OpenDatesSection';
import { useLanguage } from '../context/LanguageContext';

export default function LandingPage() {
  const { t, language } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const { scrollYProgress } = useScroll({
    container: containerRef,
  });

  // Parallax effect for the first section (Hero)
  // As we scroll from 0 to 1 in the document, we scale down the hero
  // We want the hero to shrink specifically when the next section is coming up
  // Since there are 6 sections, 1/6 ≈ 0.167 — using 0.2 keeps a smooth feel
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.9]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0.7]);
  const heroY = useTransform(scrollYProgress, [0, 0.2], ["0%", "20%"]);

  // Reverse effect for the footer
  // As we approach the end (0.8 to 1.0), we scale in the footer
  const footerScale = useTransform(scrollYProgress, [0.8, 1], [0.9, 1]);
  const footerOpacity = useTransform(scrollYProgress, [0.8, 1], [0.6, 1]);
  const footerY = useTransform(scrollYProgress, [0.8, 1], ["20%", "0%"]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollPos = container.scrollTop;
      const clientHeight = container.clientHeight;
      
      // Calculate if we're at the top (Hero) or at the bottom (Footer)
      const isAtTop = scrollPos < 50;
      // We start becoming transparent as soon as the footer section starts to snap in
      // 6 sections total, so the last section starts at 5 * clientHeight
      const isAtFooter = scrollPos > 4.8 * clientHeight;

      // Navbar is colored ONLY when in the middle sections
      setIsScrolled(!isAtTop && !isAtFooter);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-[100dvh] relative selection:bg-brown selection:text-cream"
    >
      <Nav forceScrolled={isScrolled} />
      
      <div 
        ref={containerRef}
        className="h-[100dvh] overflow-y-auto snap-y snap-mandatory"
      >
        {/* 1. HERO SECTION */}
        <div className="snap-start h-[100dvh] w-full relative overflow-hidden bg-brown">
          <motion.div 
            style={{ scale: heroScale, opacity: heroOpacity, y: heroY }}
            className="w-full h-full"
          >
            <Hero />
          </motion.div>
        </div>

        {/* 2. HISTORY SECTION */}
        <div className="snap-start h-[100dvh] w-full relative z-10 shadow-[0_-20px_50px_rgba(0,0,0,0.3)]">
          <HistorySection />
        </div>

        {/* 3. RESERVE NOW SECTION */}
        <section className="snap-start h-[100dvh] w-full relative overflow-hidden bg-brown z-10 shadow-[0_-20px_50px_rgba(0,0,0,0.3)]">
          <picture>
            <source media="(min-width: 768px)" srcSet="/images/page_break.webp" />
            <img
              src="/images/karabina_mobile.webp"
              className="w-full h-full object-cover object-center opacity-60 scale-110" 
              alt="Restaurant Atmosphere"
            />
          </picture>
          
          {/* Overlay with Reserve Button - Adjusted for mobile */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-brown/40 backdrop-blur-[1px] px-6">
            <div className="w-12 h-[2px] bg-orange mb-6 lg:mb-8" />
            <h3 className="text-cream text-3xl md:text-5xl lg:text-6xl font-bold uppercase tracking-[0.2em] lg:tracking-[0.3em] mb-8 lg:mb-12 text-center">
              {t('booking.title') || 'Experience Niseko'}
            </h3>
            
            <Link 
              to="/booking"
              className="px-8 py-4 lg:px-16 lg:py-6 bg-orange text-cream rounded-full font-bold uppercase tracking-[0.2em] lg:tracking-[0.3em] shadow-2xl hover:bg-cream hover:text-brown hover:scale-110 active:scale-95 transition-all duration-500 flex items-center gap-3 lg:gap-4 text-base lg:text-lg"
            >
              <span>{language === 'jp' ? '予約する' : 'BOOK A TABLE'}</span>
              <span className="text-xl lg:text-2xl">→</span>
            </Link>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-brown to-transparent" />
        </section>

        {/* 4. MENU SECTION */}
        <div className="snap-start h-[100dvh] w-full relative bg-[#F4E3D3] z-10 shadow-[0_-20px_50px_rgba(0,0,0,0.3)]">
          <Menu />
        </div>

        {/* 5. OPEN DATES SECTION */}
        <div className="snap-start h-[100dvh] w-full relative z-10 shadow-[0_-20px_50px_rgba(0,0,0,0.3)]">
          <OpenDatesSection />
        </div>

        {/* 6. FOOTER SECTION */}
        <section className="snap-start h-[100dvh] w-full relative bg-brown overflow-y-auto z-20 shadow-[0_-20px_50px_rgba(0,0,0,0.4)]">
          <motion.div 
            style={{ scale: footerScale, opacity: footerOpacity, y: footerY }}
            className="w-full h-full"
          >
            <Footer />
          </motion.div>
        </section>
      </div>
    </motion.div>
  );
}
