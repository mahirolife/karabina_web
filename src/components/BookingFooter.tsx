export function BookingFooter() {
  return (
    <section className="py-24 lg:py-48 text-center bg-cream border-t border-brown/10">
      <div className="container-custom max-w-2xl text-brown">
        <h2 className="text-3xl lg:text-5xl uppercase tracking-tight mb-12 font-medium">
          Caffeinate your inbox with tasty updates, specials & more.
        </h2>
        <form className="flex flex-col sm:flex-row gap-4 justify-center">
          <input 
            type="email" 
            placeholder="EMAIL ADDRESS" 
            className="flex-1 bg-transparent border-2 border-brown rounded-full px-8 py-4 uppercase text-sm tracking-widest outline-none focus:bg-orange/5 placeholder:text-brown/40 text-brown"
          />
          <button className="bg-orange text-cream px-12 py-4 rounded-full uppercase text-sm tracking-widest font-bold hover:bg-brown transition-colors">
            Subscribe
          </button>
        </form>
      </div>
    </section>
  );
}
