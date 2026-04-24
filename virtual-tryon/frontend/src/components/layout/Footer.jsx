import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Twitter, Github } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-secondary text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-display font-bold text-xl">R</div>
              <span className="font-display font-bold text-xl text-white">Rizz-Up</span>
            </Link>
            <p className="text-text-muted text-sm mb-6 max-w-xs">
              Your personal AI stylist. Discover your perfect color season and virtually try on clothes that match your skin tone.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary hover:text-white transition-colors text-text-muted">
                <Instagram size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary hover:text-white transition-colors text-text-muted">
                <Twitter size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary hover:text-white transition-colors text-text-muted">
                <Github size={18} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-6 text-white">Features</h4>
            <ul className="space-y-4">
              <li><Link to="/upload" className="text-text-muted hover:text-primary transition-colors text-sm">Skin Tone Analysis</Link></li>
              <li><Link to="/catalog" className="text-text-muted hover:text-primary transition-colors text-sm">Color Catalog</Link></li>
              <li><Link to="/try-on" className="text-text-muted hover:text-primary transition-colors text-sm">Virtual Try-On</Link></li>
              <li><Link to="/history" className="text-text-muted hover:text-primary transition-colors text-sm">Saved Looks</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6 text-white">Company</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-text-muted hover:text-primary transition-colors text-sm">About Us</a></li>
              <li><a href="#" className="text-text-muted hover:text-primary transition-colors text-sm">Careers</a></li>
              <li><a href="#" className="text-text-muted hover:text-primary transition-colors text-sm">Privacy Policy</a></li>
              <li><a href="#" className="text-text-muted hover:text-primary transition-colors text-sm">Terms of Service</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6 text-white">Newsletter</h4>
            <p className="text-text-muted text-sm mb-4">Get styling tips and new feature updates.</p>
            <form className="flex" onSubmit={(e) => e.preventDefault()}>
              <input 
                type="email" 
                placeholder="Your email" 
                className="bg-white/10 border-transparent focus:border-primary focus:ring-primary rounded-l-lg px-4 py-2 text-sm text-white placeholder:text-text-muted w-full focus:outline-none"
              />
              <button 
                type="submit" 
                className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-r-lg text-sm font-medium transition-colors"
              >
                Subscribe
              </button>
            </form>
          </div>

        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-text-muted text-sm text-center md:text-left">
            &copy; {new Date().getFullYear()} Rizz-Up Virtual Try-On Platform. Built for FYP.
          </p>
          <div className="flex gap-6">
            <span className="text-text-muted text-xs">Made with React & Tailwind</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
