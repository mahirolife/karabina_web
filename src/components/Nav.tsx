import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu as MenuIcon, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { ASSETS } from '../constants';
import { useLanguage } from '../context/LanguageContext';
import { Link, useLocation } from 'react-router-dom';

export function Nav({ forceScrolled }: { forceScrolled?: boolean }) {
  const { language, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [internalScrolled, setInternalScrolled] = useState(false);
  const location = useLocation();

  const isScrolled = forceScrolled !== undefined ? forceScrolled : internalScrolled;

  const links = [
    { name: t('nav.book'), href: '/booking' },
    { name: t('nav.menu'), href: location.pathname === '/' ? '#menu' : '/#menu' },
    { name: t('nav.find'), href: location.pathname === '/' ? '#contact' : '/#contact' },
    { name: t('nav.about'), href: location.pathname === '/' ? '#about' : '/#about' },
  ];

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  useEffect(() => {
    const handleScroll = () => {
      setInternalScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header 
        className={cn(
          "fixed top-0 inset-x-0 z-40 transition-all duration-500 ease-in-out overflow-hidden flex items-center justify-center",
          isScrolled 
            ? "border-b border-brown/10 h-12 lg:h-16 text-brown shadow-sm" 
            : "bg-transparent text-cream h-16 lg:h-24"
        )}
      >
        {/* Background Image for Scrolled State */}
        {isScrolled && (
          <div className="absolute inset-0 z-0 bg-[#F4E3D3]">
            <img 
              src="/images/quotes_bg.webp"
              className="w-full h-full object-cover"
              alt=""
            />
          </div>
        )}
        
        <div className="container-custom flex items-center justify-between h-full relative z-10 w-full">
          <button 
            onClick={() => setIsOpen(true)}
            className="flex items-center hover:opacity-60 transition-all hover:translate-x-1 active:scale-95 p-1"
            aria-label="Toggle Menu"
          >
            <MenuIcon className={cn(
              "w-6 h-6 lg:w-8 lg:h-8",
              !isScrolled && "drop-shadow-[0_2px_10px_rgba(0,0,0,0.4)]"
            )} />
          </button>
 
          <Link 
            to="/" 
            className={cn(
              "absolute left-1/2 -translate-x-1/2 flex items-center transition-all duration-500 hover:scale-105 active:scale-95 cursor-pointer",
              isScrolled ? "h-6 lg:h-8" : "h-8 lg:h-12"
            )}
          >
            <img 
              src={ASSETS.LOGO_NAME} 
              className={cn(
                "h-full w-auto object-contain py-1",
                !isScrolled && "drop-shadow-[0_2px_10px_rgba(0,0,0,0.3)]"
              )} 
              alt="Karabina Logo"
              style={{ 
                filter: isScrolled 
                  ? 'brightness(0) saturate(100%) invert(14%) sepia(21%) saturate(2208%) hue-rotate(341deg) brightness(91%) contrast(92%)' 
                  : 'brightness(0) saturate(100%) invert(98%) sepia(5%) saturate(762%) hue-rotate(345deg) brightness(101%) contrast(97%)' 
              }}
            />
          </Link>

          <div className="flex items-center gap-4 lg:gap-8">
            <Link 
              to="/booking"
              className={cn(
                "uppercase text-[10px] lg:text-xs tracking-[0.2em] font-bold px-4 lg:px-6 py-2 rounded-full transition-all duration-300 active:scale-95 shadow-lg relative overflow-hidden group flex items-center justify-center",
                isScrolled 
                  ? "bg-brown text-cream hover:bg-brown/80 shadow-brown/10" 
                  : "bg-orange text-cream hover:scale-105 shadow-orange/30 animate-pulse-subtle"
              )}
            >
              <span className="lg:hidden relative z-10">{t('nav.book.mobile')}</span>
              <span className="hidden lg:inline relative z-10">{t('nav.book.desktop')}</span>
            </Link>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/40 z-50 overflow-hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-full md:w-[100vw] z-50 md:flex overflow-hidden"
            >
              {/* Overlay for small screens if needed, otherwise the background is handled per side */}
              
              {/* Left Side: Navigation Links */}
              <div className="p-6 md:p-12 h-full flex flex-col w-full md:w-[450px] border-r-2 border-brown relative z-10 bg-[#F4E3D3] overflow-hidden shadow-2xl">
                {/* Background Image Layer */}
                <div className="absolute inset-0 z-0 pointer-events-none">
                  <img 
                    src="/images/quotes_bg.webp"
                    className="w-full h-full object-cover"
                    alt=""
                  />
                </div>

                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex justify-between items-center mb-12">
                    <Link to="/" onClick={() => setIsOpen(false)}>
                      <img 
                        src={ASSETS.LOGO_NAME} 
                        className="h-8 w-auto object-contain" 
                        alt="Karabina"
                        style={{ filter: 'brightness(0) saturate(100%) invert(14%) sepia(21%) saturate(2208%) hue-rotate(341deg) brightness(91%) contrast(92%)' }}
                      />
                    </Link>
                    <button onClick={() => setIsOpen(false)}>
                      <X className="w-8 h-8 text-brown" />
                    </button>
                  </div>

                  <nav className="flex-1 text-brown overflow-y-auto">
                    <ul className="space-y-4 lg:space-y-6">
                      {links.map((link, i) => (
                        <motion.li 
                          key={link.name}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                        >
                          {link.href.startsWith('/') && !link.href.includes('#') ? (
                            <Link 
                              to={link.href}
                              onClick={() => setIsOpen(false)}
                              className={cn(
                                "uppercase font-medium hover:italic transition-all inline-block group",
                                language === 'jp' ? "text-2xl" : "text-4xl lg:text-5xl"
                              )}
                            >
                              <span className="relative">
                                {link.name}
                                <motion.span 
                                  className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brown group-hover:w-full transition-all duration-300"
                                />
                              </span>
                            </Link>
                          ) : (
                            <a 
                              href={link.href}
                              onClick={() => setIsOpen(false)}
                              className={cn(
                                "uppercase font-medium hover:italic transition-all inline-block group",
                                language === 'jp' ? "text-2xl" : "text-4xl lg:text-5xl"
                              )}
                            >
                              <span className="relative">
                                {link.name}
                                <motion.span 
                                  className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brown group-hover:w-full transition-all duration-300"
                                />
                              </span>
                            </a>
                          )}
                        </motion.li>
                      ))}
                    </ul>
                  </nav>

                  <div className="mt-auto space-y-4 text-brown">
                    <div className="flex flex-col gap-2 mb-4">
                      <a href="tel:+81136502850" className="text-sm font-bold tracking-widest">+81 136-50-2850</a>
                    </div>
                    <div className="flex gap-4">
                      <a href="https://www.instagram.com/karabina.niseko/" target="_blank" rel="noopener noreferrer" className="uppercase text-[10px] tracking-widest border-b border-brown text-brown">Instagram</a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: Image Gallery (Desktop & Tablet) */}
              <div className="hidden md:block flex-1 bg-brown relative overflow-hidden">
                <div className="absolute inset-0">
                  <img 
                    src={ASSETS.KARA_HOUSE} 
                    className="w-full h-full object-cover opacity-60"
                    alt="Atmosphere"
                  />
                  <div className="absolute inset-0 bg-gradient-to-l from-transparent to-brown/40" />
                </div>
                
                {/* Decorative Text */}
                <div className="absolute bottom-12 right-12 text-orange vertical-rl text-xs uppercase tracking-[0.6em] select-none font-bold">
                  Restaurant / Niseko / Hokkaido
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
