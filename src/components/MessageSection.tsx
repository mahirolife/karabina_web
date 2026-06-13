import { motion } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';

export function MessageSection() {
  const { t, language } = useLanguage();

  return (
    <section className="min-h-screen flex flex-col items-center justify-center text-brown px-6 lg:px-20 overflow-hidden relative">
      <div className="container-custom max-w-4xl mx-auto flex flex-col items-center text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-8"
        >
          <span className="text-[10px] lg:text-xs font-bold uppercase tracking-[0.3em] opacity-40">
            {t('message.title')}
          </span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className={`leading-relaxed italic ${
            language === 'jp' 
              ? 'text-xl lg:text-3xl font-medium' 
              : 'text-2xl lg:text-4xl font-serif'
          }`}
        >
          {t('message.text')}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
          className="mt-12 h-px w-24 bg-brown/20"
        />

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="mt-8 text-xs lg:text-sm font-bold uppercase tracking-widest opacity-60"
        >
          {t('message.author')}
        </motion.p>
      </div>
    </section>
  );
}
