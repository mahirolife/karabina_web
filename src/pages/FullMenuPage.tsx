import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Nav } from '../components/Nav';
import { Footer } from '../components/Footer';
import { useLanguage } from '../context/LanguageContext';
import { MENU_DATA } from '../data/menu';
import { cn } from '../lib/utils';
import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function FullMenuPage() {
  const { language, t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState(0);
  const lang = language === 'jp' ? 'jp' : 'en';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-cream text-brown selection:bg-orange selection:text-cream"
    >
      <Nav />
      
      <main className="pt-32 pb-24 lg:pt-48">
        <div className="container-custom">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 group mb-12 lg:mb-20 opacity-60 hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="uppercase text-xs tracking-widest font-bold">Back to Home</span>
          </Link>

          <header className="mb-12 lg:mb-24">
            <h1 className="text-5xl lg:text-8xl font-bold tracking-tighter uppercase mb-6">
              {language === 'jp' ? 'お品書き' : 'Menu'}
            </h1>
            <p className="max-w-2xl text-sm lg:text-lg opacity-60 leading-relaxed font-light">
              {language === 'jp' 
                ? '厳選された北海道の食材と、全国から仕入れる旬の味覚。心ゆくまでお楽しみください。' 
                : 'Selected Hokkaido ingredients and seasonal flavors from across Japan. We hope you enjoy every bite.'}
            </p>
          </header>

          <div className="grid lg:grid-cols-12 gap-8 lg:gap-24">
            {/* Sidebar / Tabs */}
            <div className="lg:col-span-3 lg:sticky lg:top-32 h-fit">
              <ul className="flex flex-wrap lg:flex-col gap-3 lg:gap-8 pb-4 lg:pb-0">
                {MENU_DATA.map((data, i) => (
                  <li key={i}>
                    <button
                      onClick={() => setActiveCategory(i)}
                      className={cn(
                        "text-sm md:text-xl lg:text-3xl uppercase tracking-tighter text-left transition-all hover:italic group flex items-center gap-3 px-4 py-2 lg:px-0 lg:py-0 rounded-full lg:rounded-none border lg:border-none",
                        activeCategory === i 
                          ? "italic font-semibold text-brown border-brown/20 bg-brown/5 lg:bg-transparent lg:border-transparent" 
                          : "opacity-50 text-brown border-brown/10 lg:border-transparent"
                      )}
                    >
                      <div className={cn(
                        "hidden lg:block w-2 h-2 rounded-full bg-orange transition-all duration-300",
                        activeCategory === i ? "opacity-100 scale-100" : "opacity-0 scale-0"
                      )} />
                      {data.category[lang]}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Items Grid */}
            <div className="lg:col-span-9">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeCategory}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
                    {MENU_DATA[activeCategory].items.map((item, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group flex flex-col gap-3 group"
                      >
                        <div className="flex justify-between items-baseline gap-4 border-b border-brown/10 pb-2 group-hover:border-brown/30 transition-colors">
                          <h3 className="text-lg lg:text-xl font-bold tracking-tight leading-tight">
                            {item.name[lang]}
                          </h3>
                          <span className="font-mono text-sm lg:text-base font-medium opacity-50">{item.price}{item.price.includes('~') ? '' : '円'}</span>
                        </div>
                        {item.desc && (
                          <p className="text-xs lg:text-sm opacity-60 leading-relaxed max-w-md font-light">
                            {item.desc[lang]}
                          </p>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </motion.div>
  );
}
