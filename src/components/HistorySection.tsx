import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { ASSETS } from '../constants';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

export function HistorySection() {
  const { t, language } = useLanguage();
  const [emblaRef] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 4000 })]);

  return (
    <section id="about" className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#F4E3D3] text-brown overflow-y-auto md:overflow-hidden relative scroll-mt-0 font-sans">
      {/* Background Image Layer */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/quotes_bg.webp"
          className="w-full h-full object-cover"
          alt=""
          loading="lazy"
        />
      </div>

      <div className="container-custom max-w-6xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 lg:gap-24 items-center">
          
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <div className="flex items-center gap-4 mb-4 lg:mb-8">
              <div className="w-12 h-[1px] bg-brown/20" />
              <span className="text-[10px] lg:text-xs font-bold uppercase tracking-[0.4em] text-orange">
                {t('history.title')}
              </span>
            </div>

            <h2
              className={`mb-4 lg:mb-8 leading-tight text-brown ${
                language === 'jp' ? 'text-2xl lg:text-5xl font-normal' : 'text-2xl md:text-3xl lg:text-5xl xl:text-6xl font-normal tracking-tight'
              }`}
              style={{ fontFamily: language === 'jp' ? 'var(--font-display-heading-jp)' : 'var(--font-display-heading)' }}
            >
              {language === 'jp' ? (
                <>人と人が、<br />つながる場所。</>
              ) : (
                <>A PLACE WHERE<br />PEOPLE CONNECT</>
              )}
            </h2>

            <p className="text-xs lg:text-lg leading-relaxed text-brown/80 max-w-xl font-light">
              {t('history.text')}
            </p>

            <motion.div
              className="mt-6 lg:mt-12"
              whileHover={{ x: 10 }}
            >
              <Link to="/story" className="group inline-flex items-center gap-4">
                <div className="w-10 h-10 rounded-full border border-brown/20 flex items-center justify-center group-hover:bg-brown group-hover:text-cream transition-all duration-500">
                  <span className="text-xs">→</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-brown/60 group-hover:text-brown">{t('history.learn_more')}</span>
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="relative w-full max-w-[200px] md:max-w-sm lg:max-w-lg mx-auto"
          >
            <div className="aspect-square bg-white/40 p-3 lg:p-8 rounded-2xl overflow-hidden border border-brown/10 group backdrop-blur-sm shadow-xl">
              <div className="embla w-full h-full" ref={emblaRef}>
                <div className="embla__container flex w-full h-full">
                  {ASSETS.ATMOSPHERE.map((img, i) => (
                    <div key={i} className="embla__slide flex-[0_0_100%] min-w-0 relative h-full">
                      <img
                        src={img}
                        className="w-full h-full object-cover rounded-xl opacity-100 transition-all duration-1000 group-hover:scale-105"
                        alt={`Atmosphere ${i + 1}`}
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-brown/40 to-transparent pointer-events-none" />
              
              <div className="absolute bottom-12 left-12 flex flex-col gap-2 z-20">
                
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-orange/60">EST. 2002 / NISEKO</span>
              </div>
            </div>

            {/* Corner Accent */}
            <div className="absolute -top-4 -right-4 w-24 h-24 border-t-2 border-r-2 border-brown/10 pointer-events-none" />
          </motion.div>

        </div>
      </div>
    </section>
  );
}
