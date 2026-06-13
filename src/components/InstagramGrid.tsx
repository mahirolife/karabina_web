import { motion } from 'motion/react';

const instagramImages = [
  "https://picsum.photos/seed/ig1/600/600",
  "https://picsum.photos/seed/ig2/600/600",
  "https://picsum.photos/seed/ig3/600/600",
  "https://picsum.photos/seed/ig4/600/600",
  "https://picsum.photos/seed/ig5/600/600",
  "https://picsum.photos/seed/ig6/600/600",
];

export function InstagramGrid() {
  return (
    <section className="py-24 bg-cream">
      <div className="container-custom">
        <div className="flex justify-between items-end mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tighter uppercase text-brown">Oh, hello</h2>
          <a href="#" className="uppercase text-sm tracking-widest border-b border-brown text-brown hover:opacity-50 transition-opacity">Follow us</a>
        </div>
 
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {instagramImages.map((src, i) => (
            <motion.div 
              key={i}
              className="aspect-square rounded-[1rem] overflow-hidden border border-brown/20 relative group cursor-pointer"
              whileHover={{ scale: 0.98 }}
              transition={{ duration: 0.3 }}
            >
              <img 
                src={src} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                alt="Instagram post"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-orange/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
