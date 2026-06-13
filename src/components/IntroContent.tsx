import { motion } from 'motion/react';

interface IntroContentProps {
  text: string;
  lottieName: string;
}

export function IntroContent({ text, lottieName }: IntroContentProps) {
  return (
    <section className="py-16 lg:py-48 px-6 border-b border-brown/20 last:border-0">
      <div className="container-custom flex flex-col items-center text-center text-brown">
        <div className="w-48 h-48 lg:w-64 lg:h-64 mb-8 bg-orange/10 rounded-full flex items-center justify-center">
          {/* Animated icon mapping */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {lottieName === 'smile' && (
              <svg className="w-24 h-24 lg:w-32 lg:h-32 text-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" />
                <path d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14" />
                <path d="M9 9H9.01" strokeLinecap="round" />
                <path d="M15 9H15.01" strokeLinecap="round" />
              </svg>
            )}
            {lottieName === 'coffee' && (
              <svg className="w-24 h-24 lg:w-32 lg:h-32 text-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M18 8H20C21.1 8 22 8.9 22 10V11C22 12.1 21.1 13 20 13H18" />
                <path d="M2 8H18V17C18 19.2 16.2 21 14 21H6C3.8 21 2 19.2 2 17V8Z" />
                <path d="M6 1V4" />
                <path d="M10 1V4" />
                <path d="M14 1V4" />
              </svg>
            )}
            {lottieName === 'biker' && (
              <svg className="w-24 h-24 lg:w-32 lg:h-32 text-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <circle cx="5.5" cy="17.5" r="3.5" />
                <circle cx="18.5" cy="17.5" r="3.5" />
                <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
                <path d="M12 17.5C12 15.3 10.5 13.5 8.5 13.5H7.5L9.5 9.5H15l1.5 4H18.5" />
              </svg>
            )}
          </motion.div>
        </div>
 
        <motion.p 
          className="text-2xl lg:text-5xl uppercase tracking-tight max-w-[900px] leading-[1.1] font-medium"
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {text}
        </motion.p>
 
        {lottieName === 'smile' && (
           <div className="mt-12">
            <button className="px-12 py-4 rounded-full border-2 border-brown uppercase text-sm tracking-widest hover:bg-orange hover:text-cream transition-all hover:border-orange">
              Book a table
            </button>
           </div>
        )}
      </div>
    </section>
  );
}
