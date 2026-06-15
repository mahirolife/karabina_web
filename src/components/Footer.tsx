import { Instagram, Phone } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Link } from 'react-router-dom';

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-brown text-cream pt-24 md:pt-32 pb-4 md:pb-6 h-full w-full flex flex-col justify-between overflow-y-auto">
      <div className="container-custom flex-grow flex flex-col justify-between py-2 md:py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 text-center items-start">
          {/* Contact */}
          <div className="space-y-4 md:space-y-6">
            <h3 className="text-lg md:text-xl lg:text-2xl font-medium tracking-tight uppercase">{t('footer.contact')}</h3>
            <div className="flex flex-col items-center gap-1 md:gap-2 uppercase tracking-widest text-[10px] md:text-sm">
              <a href="tel:0136502850" className="hover:opacity-70 transition-opacity font-bold flex items-center gap-2">
                <Phone className="w-3 h-3 md:w-4 md:h-4" />
                0136-50-2850
              </a>
            </div>
            <div className="flex justify-center pt-2">
              <a 
                href="https://www.instagram.com/karabina.niseko/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-3 group"
              >
                <div className="w-8 h-8 md:w-10 md:h-10 border border-cream rounded-full flex items-center justify-center group-hover:bg-cream group-hover:text-brown transition-all shadow-lg">
                  <Instagram className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <span className="text-[10px] md:text-sm tracking-[0.2em] font-medium uppercase group-hover:opacity-70 transition-opacity">@karabina.niseko</span>
              </a>
            </div>
          </div>

          {/* Opening Hours */}
          <div className="space-y-4 md:space-y-6">
            <h3 className="text-lg md:text-xl lg:text-2xl font-medium tracking-tight uppercase">{t('footer.opening')}</h3>
            <div className="uppercase tracking-widest text-[10px] md:text-sm space-y-2 md:space-y-4">
              <p className="font-bold">{t('footer.winter_only')}</p>
              <p>{t('footer.daily')}<br />6:00pm — 11:00pm</p>
              <p className="text-[9px] md:text-[10px] text-cream/60 normal-case italic">{t('footer.last_order')}</p>
            </div>
          </div>

          {/* Find Us */}
          <div className="space-y-4 md:space-y-6">
            <h3 className="text-lg md:text-xl lg:text-2xl font-medium tracking-tight uppercase">{t('footer.find_us')}</h3>
            <div className="uppercase tracking-widest text-[10px] md:text-sm space-y-2 md:space-y-4">
              <p>431-4 Niseko, Abuta District<br />Hokkaido 048-1511, Japan</p>
              
              <a
                href="https://maps.app.goo.gl/vEmkRo9WzezqT4kj7"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full h-20 sm:h-28 md:h-40 rounded-xl overflow-hidden border border-cream/20 mt-2 md:mt-4 grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-500 shadow-2xl"
              >
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2925.321855635817!2d140.6865239!3d42.8449733!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x5f0a7f6559385011%3A0xe744e889f076c127!2s431-4%20Niseko%2C%20Abuta%20District%2C%20Hokkaido%20048-1511%2C%20Japan!5e0!3m2!1sen!2sjp!4v1714249300000!5m2!1sen!2sjp"
                  width="100%"
                  height="100%"
                  style={{ border: 0, pointerEvents: 'none' }}
                  allowFullScreen={true}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </a>

              <a 
                href="https://maps.app.goo.gl/vEmkRo9WzezqT4kj7"
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-block border-b border-cream pt-2 md:pt-4 hover:opacity-70 transition-opacity"
              >
                {t('footer.view_maps')} →
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Credits / Footnote */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-4 md:pt-6 border-t border-cream/20 text-[9px] md:text-[10px] font-mono tracking-[0.2em] text-cream/40 uppercase">
           <p>© 2026 KARABINA — A RESTAURANT / NISEKO</p>
           <p>{t('footer.credit')}</p>
        </div>
      </div>
    </footer>
  );
}
