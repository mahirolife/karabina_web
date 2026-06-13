import { motion } from 'motion/react';
import { ASSETS } from '../constants';
import { useEffect, useState } from "react";
import { useLanguage } from '../context/LanguageContext';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

export function Hero() {
  const { language, setLanguage, t } = useLanguage();
  const [weather, setWeather] = useState<any>(null);
  const [error, setError] = useState(false);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const queryLang = language === 'jp' ? 'ja' : 'en';
        const res = await fetch(`/api/weather?city=Niseko,jp&lang=${queryLang}`);
        if (!res.ok) {
          setError(true);
          return;
        }
        const data = await res.json();

        // Check for error in the response
        if (data.main) {
          setWeather(data);
          setError(false);
        } else {
          setError(true);
        }
      } catch (err) {
        setError(true);
      }
    };
    fetchWeather();
  }, [language]);

  return (
    <section 
      id="booking"
      className="bg-cream text-cream h-screen h-[100dvh] relative overflow-hidden flex flex-col items-center justify-between border-b-2 border-brown pt-20 pb-2 md:pt-14 md:pb-6 lg:pt-20 lg:pb-4"
    >
      {/* SNOW MOUNTAIN BACKGROUND WITH SOFT OVERLAY */}
      <div className="absolute inset-0 z-0">
        <img 
          src={ASSETS.YOTEI}  
          className={cn(
            "w-full h-full object-cover",
            !videoError && "lg:hidden"
          )}
          alt="Mt. Yotei Snowy landscape"
        />
        {!videoError && (
          <video
            autoPlay
            muted
            loop
            playsInline
            onError={() => setVideoError(true)}
            className="w-full h-full object-cover hidden lg:block"
          >
            <source src={ASSETS.HERO_VIDEO} type="video/mp4" />
          </video>
        )}
        <div className="absolute inset-0 bg-cream/30" />
      </div>

      {/* TOP BAR */}
      <div className="container-custom w-full flex flex-col lg:flex-row justify-center items-center px-6 lg:px-20 text-[12px] text-cream md:text-xs lg:text-sm mt-2 lg:mt-5 tracking-widest uppercase gap-2 md:gap-4 text-center lg:text-left z-30">

        <div className="opacity-90 font-semibold">
          {t('hero.weather')}
        </div>

        <div className="opacity-90 text-[#d9753e] font-bold">
          {error ? (
            t('hero.unavailable')
          ) : weather ? (
            `${weather.weather[0].description} · ${Math.round(weather.main.temp)}°C`
          ) : (
            t('hero.loading')
          )}
        </div>

      </div>

      <div className="relative w-full max-w-[1200px] flex-1 flex items-center justify-center px-4 -mt-4 md:-mt-12 lg:-mt-10">
        {/* Logo Wrapper - Flexbox for high-level centering and layout */}
        <motion.div 
          className="flex flex-col items-center gap-4 md:gap-6 lg:gap-5 z-20"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ 
            scale: 1, 
            opacity: 1,
            rotate: [-1.2, 1.2, -1.2],
            x: [-6, 6, -6]
          }}
          transition={{ 
            duration: 1.2, 
            ease: [0.16, 1, 0.3, 1],
            rotate: {
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut"
            },
            x: {
              duration: 9,
              repeat: Infinity,
              ease: "easeInOut"
            }
          }}
        >
          {/* SVG Mark Container */}
          <div className="relative w-[35vw] max-w-[130px] md:max-w-[150px] lg:max-w-[170px] aspect-[511/950] flex flex-col items-center justify-end">
            <motion.img 
              src={ASSETS.LOGO_SMOKE} 
              className="absolute top-[5%] left-[70%] w-auto h-auto z-0 pointer-events-none" 
              alt="Karabina Smoke"
              animate={{ 
                y: [0, -6, 0],
                x: ["-54%", "-46%", "-54%"],
                opacity: [0.6, 0.7, 0.6],
                rotate: [-3, 3, -3]
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />

            <div className="relative w-full aspect-[511/720] z-20">
              <img 
                src={ASSETS.LOGO_CARABINER} 
                className="w-full h-full object-contain relative z-20 pointer-events-none" 
                alt="Karabina Carabiner"
              />
              
              {/* AMBIENT FIRE GLOW - Multi-layered for intensity */}
              <motion.div 
                className="absolute top-[52%] left-1/2 w-[160%] aspect-square rounded-full z-0 pointer-events-none"
                style={{ 
                  background: 'radial-gradient(circle, rgba(217,117,62,0.7) 0%, rgba(217,117,62,0) 70%)',
                  filter: 'blur(50px)',
                  x: "-50%",
                  y: "-50%"
                }}
                animate={{ 
                  scale: [1, 1.25, 1.1, 1.15],
                  opacity: [0.5, 0.9, 0.6, 0.8]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <motion.div 
                className="absolute top-[52%] left-1/2 w-[100%] aspect-square rounded-full z-0 pointer-events-none"
                style={{ 
                  background: 'radial-gradient(circle, rgba(255,160,100,0.8) 0%, rgba(217,117,62,0) 60%)',
                  filter: 'blur(20px)',
                  x: "-50%",
                  y: "-50%"
                }}
                animate={{ 
                  scale: [0.9, 1.1, 1, 1.05],
                  opacity: [0.6, 1, 0.7, 0.9]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5
                }}
              />

              <motion.img 
                src={ASSETS.LOGO_FIRE} 
                className="absolute top-[42%] left-1/2 w-[35%] h-auto z-10 pointer-events-none" 
                alt="Karabina Fire"
                animate={{ 
                  scale: [0.95, 1.05, 0.98, 1],
                  opacity: [0.7, 1, 0.8, 0.7],
                  x: ["-52%", "-48%", "-52%"],
                  rotate: [-4, 6, -2, -4]
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </div>
          </div>

          {/* New Dual Language Logo Name Container */}
          <div className="flex flex-col items-center gap-2 md:gap-4 z-30">
            {/* Japanese Name */}
            <motion.img
              src={ASSETS.LOGO_CREAM_JP}
              onClick={() => setLanguage('jp')}
              className={`w-[40vw] max-w-[140px] md:max-w-[160px] lg:max-w-[180px] h-auto cursor-pointer transition-all duration-300 hover:scale-105 ${language === 'jp' ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
              alt="唐火七"
              whileTap={{ scale: 0.95 }}
            />

            {/* English Name */}
            <motion.img
              src={ASSETS.LOGO_CREAM_EN}
              onClick={() => setLanguage('en')}
              className={`w-[55vw] max-w-[200px] md:max-w-[240px] lg:max-w-[260px] h-auto cursor-pointer transition-all duration-300 hover:scale-105 ${language === 'en' ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
              alt="KARABINA"
              whileTap={{ scale: 0.95 }}
            />

            {/* Language toggle pill */}
            <div className="relative flex rounded-full border border-cream/30 overflow-hidden text-[10px] uppercase tracking-widest select-none mt-1">
              <motion.div
                layoutId="lang-pill"
                className="absolute inset-y-0 w-1/2 bg-orange/80 rounded-full"
                style={{ left: language === 'jp' ? '0%' : '50%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
              <button
                onClick={() => setLanguage('jp')}
                className={`relative z-10 px-4 py-1.5 transition-colors duration-300 ${language === 'jp' ? 'text-cream' : 'text-cream/50'}`}
              >
                JP
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`relative z-10 px-4 py-1.5 transition-colors duration-300 ${language === 'en' ? 'text-cream' : 'text-cream/50'}`}
              >
                EN
              </button>
            </div>
          </div>
        </motion.div>

        {/* Wavy Text Overlay */}
        <div className="absolute inset-x-0 inset-y-[-20%] flex items-center justify-center pointer-events-none overflow-hidden scale-[1.35] md:scale-[1.20] lg:scale-[1.30]">
          <svg viewBox="0 0 800 200" className="w-full h-full">
            <defs>
              <filter id="fireGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#EB7832" floodOpacity="0.8" />
              </filter>
            </defs>
            <path id="wavy" fill="none" stroke="none" d="M 0,100 C 133,50 266,150 400,100 C 533,50 666,150 800,100" />
            <text fill="#d9753e" opacity="0.85" fontSize="20" filter="url(#fireGlow)" style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.12em', fontStyle: 'italic' }}>
              <textPath href="#wavy" startOffset="0">
                {t('wavy.text')} {t('wavy.text')} {t('wavy.text')} {t('wavy.text')} 
                <animate attributeName="startOffset" from="0" to="-800" dur="40s" repeatCount="indefinite" />
              </textPath>
            </text>
          </svg>
        </div>
      </div>

      <div className="text-center px-6 pb-2 md:pb-4 z-30">
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="flex flex-col items-center gap-1 opacity-80"
        >
          <ChevronDown className="w-6 h-6 md:w-8 md:h-8 text-cream drop-shadow-[0_2px_10px_rgba(0,0,0,0.4)]" strokeWidth={1} />
        </motion.div>
      </div>
    </section>
  );
}
