import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, Sparkles, Palette, ArrowRight, ShieldCheck, Zap, Download } from 'lucide-react';
import Button from '../components/ui/Button';

const LandingPage = () => {
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary overflow-hidden">
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-16">
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 w-3/4 h-screen bg-gradient-to-bl from-accent/30 to-transparent -z-10 blur-3xl opacity-60 rounded-bl-[100px]"></div>
        
        {/* Floating Orbs (CSS animated via Tailwind or inline style) */}
        <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-primary/20 rounded-full blur-2xl animate-[pulse_4s_ease-in-out_infinite] -z-10"></div>
        <div className="absolute bottom-1/4 right-1/3 w-40 h-40 bg-blue-300/20 rounded-full blur-2xl animate-[pulse_5s_ease-in-out_infinite] -z-10"></div>
        <div className="absolute top-1/3 right-1/2 w-24 h-24 bg-green-300/20 rounded-full blur-2xl animate-[pulse_6s_ease-in-out_infinite] -z-10"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            
            {/* Left Content */}
            <motion.div 
              className="w-full lg:w-[60%] pt-12 lg:pt-0"
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary-dark font-medium text-sm mb-6 border border-primary/20 shadow-sm">
                <Sparkles size={16} /> AI-Powered Style Assistant
              </motion.div>
              
              <motion.h1 variants={fadeIn} className="text-5xl lg:text-7xl font-bold font-display text-secondary leading-[1.1] mb-6">
                Discover Your <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">Perfect Color</span> Season
              </motion.h1>
              
              <motion.p variants={fadeIn} className="text-lg text-text-secondary mb-10 max-w-xl leading-relaxed">
                Upload a selfie and let our advanced AI analyze your skin tone, hair, and eye color to reveal your true season. Try on clothes virtually and build a wardrobe that makes you shine.
              </motion.p>
              
              <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-4">
                <Link to="/register">
                  <Button size="lg" className="w-full sm:w-auto shadow-lg shadow-primary/20 text-lg">
                    Get Started Free
                  </Button>
                </Link>
                <a href="#how-it-works">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto bg-white/50 backdrop-blur-sm text-lg">
                    See How It Works
                  </Button>
                </a>
              </motion.div>

              <motion.div variants={fadeIn} className="mt-12 flex items-center gap-6 text-sm text-text-muted font-medium">
                <div className="flex items-center gap-2"><ShieldCheck size={18} className="text-success" /> 100% Private</div>
                <div className="flex items-center gap-2"><Zap size={18} className="text-warning" /> Instant Results</div>
              </motion.div>
            </motion.div>

            {/* Right Mockup */}
            <motion.div 
              className="w-full lg:w-[40%] relative"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="relative mx-auto w-full max-w-md">
                {/* Main Mockup Card */}
                <div className="bg-white/80 backdrop-blur-xl border border-white shadow-2xl rounded-3xl p-6 rotate-[-2deg] transform hover:rotate-0 transition-transform duration-500">
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                    <div className="font-display font-bold text-secondary flex items-center gap-2">
                      <span className="text-2xl">🍂</span> Warm Autumn
                    </div>
                    <div className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">98% Match</div>
                  </div>
                  
                  <div className="flex gap-4 mb-6">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/20 shrink-0">
                      <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80" alt="Face" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-secondary mb-1">Your Best Colors</h4>
                      <p className="text-xs text-text-muted leading-tight">Rich, warm, and earthy tones compliment your golden undertones perfectly.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {['#8A3324', '#CD5C5C', '#E2725B', '#D4AF37', '#556B2F'].map((color, i) => (
                      <motion.div 
                        key={color}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.6 + (i * 0.1), type: 'spring' }}
                        className="aspect-square rounded-full shadow-sm border border-black/5"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Floating Elements */}
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -bottom-6 -left-6 bg-white p-3 rounded-2xl shadow-xl border border-border flex items-center gap-3"
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                    <Palette size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-secondary">36 Colors</p>
                    <p className="text-[10px] text-text-muted">Personalized Palette</p>
                  </div>
                </motion.div>
                
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-sm font-bold text-primary uppercase tracking-widest mb-3">How It Works</h2>
            <h3 className="text-4xl font-bold font-display text-secondary mb-6">Your Personal Stylist in 3 Simple Steps</h3>
            <p className="text-lg text-text-secondary">Stop guessing which colors look good on you. Let our AI analyze your features scientifically.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-primary/10 via-primary/30 to-primary/10 border-t-2 border-dashed border-primary/20"></div>

            {[
              {
                icon: Camera,
                title: "Upload Your Photo",
                desc: "Snap a quick selfie in natural lighting or upload a favorite photo.",
                delay: 0.1
              },
              {
                icon: Sparkles,
                title: "AI Analyzes Your Skin",
                desc: "Our model detects your precise undertone, contrast, and color values.",
                delay: 0.2
              },
              {
                icon: Palette,
                title: "Get Your Color Season",
                desc: "Receive your customized palette and virtual wardrobe recommendations.",
                delay: 0.3
              }
            ].map((step, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: step.delay }}
                className="relative flex flex-col items-center text-center group"
              >
                <div className="w-24 h-24 bg-bg-primary rounded-2xl shadow-lg border border-border flex items-center justify-center mb-6 relative z-10 group-hover:-translate-y-2 transition-transform duration-300">
                  <div className="absolute -top-3 -right-3 w-8 h-8 bg-primary text-white rounded-full font-bold flex items-center justify-center shadow-md">
                    {index + 1}
                  </div>
                  <step.icon size={40} className="text-primary" />
                </div>
                <h4 className="text-xl font-bold text-secondary mb-3">{step.title}</h4>
                <p className="text-text-secondary">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 12 Seasons Preview */}
      <section className="py-24 bg-bg-secondary border-y border-border overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div className="max-w-2xl">
              <h2 className="text-4xl font-bold font-display text-secondary mb-4">Discover All 12 Color Seasons</h2>
              <p className="text-lg text-text-secondary">Based on the tonal analysis system, everyone falls into one of these 12 distinct color palettes.</p>
            </div>
            <Link to="/register">
              <Button variant="outline" className="bg-white group">
                Find Yours <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { name: 'Light Spring', colors: ['#FDE2E4', '#C5E1A5', '#FFF59D'], type: 'Spring' },
              { name: 'Warm Spring', colors: ['#FFCC80', '#A5D6A7', '#FFAB91'], type: 'Spring' },
              { name: 'Bright Spring', colors: ['#FF4081', '#00E676', '#FFEA00'], type: 'Spring' },
              { name: 'Light Summer', colors: ['#E1BEE7', '#B3E5FC', '#F8BBD0'], type: 'Summer' },
              { name: 'Cool Summer', colors: ['#9FA8DA', '#81D4FA', '#CE93D8'], type: 'Summer' },
              { name: 'Soft Summer', colors: ['#B0BEC5', '#D7CCC8', '#A1887F'], type: 'Summer' },
              { name: 'Soft Autumn', colors: ['#D7CCC8', '#BCAAA4', '#E6EE9C'], type: 'Autumn' },
              { name: 'Warm Autumn', colors: ['#FFB74D', '#8D6E63', '#9CCC65'], type: 'Autumn' },
              { name: 'Deep Autumn', colors: ['#5D4037', '#E64A19', '#388E3C'], type: 'Autumn' },
              { name: 'Cool Winter', colors: ['#1A237E', '#C2185B', '#00ACC1'], type: 'Winter' },
              { name: 'Deep Winter', colors: ['#311B92', '#880E4F', '#004D40'], type: 'Winter' },
              { name: 'Bright Winter', colors: ['#D50000', '#2962FF', '#00C853'], type: 'Winter' },
            ].map((season, i) => (
              <motion.div 
                key={season.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl p-5 border border-border shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group cursor-pointer"
              >
                <div className="flex h-12 rounded-xl overflow-hidden mb-4 border border-black/5">
                  {season.colors.map(color => (
                    <div key={color} className="flex-1" style={{ backgroundColor: color }}></div>
                  ))}
                </div>
                <h4 className="font-bold text-secondary text-sm md:text-base mb-1">{season.name}</h4>
                <p className="text-xs text-text-muted">{season.type}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary z-0"></div>
        {/* Abstract shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -z-0 translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/10 rounded-full blur-3xl -z-0 -translate-x-1/2 translate-y-1/2"></div>
        
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
          <h2 className="text-4xl md:text-5xl font-bold font-display text-white mb-6 leading-tight">
            Stop Wearing the Wrong Colors. <br /> Start Your Journey Today.
          </h2>
          <p className="text-white/80 text-lg mb-10 max-w-2xl mx-auto">
            Join thousands who have discovered their perfect palette and transformed their confidence through the power of color analysis.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/register">
              <Button size="lg" className="w-full sm:w-auto bg-white text-primary hover:bg-bg-tertiary">
                Analyze My Skin Tone Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};

export default LandingPage;
