import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const LoginPage = () => {
  const [email, setEmail] = useState('ali@gmail.com');
  const [password, setPassword] = useState('1111');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  const { login, loginWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err) {
      console.error(err);
      setError('Failed to sign in. Please check your credentials.');
      toast.error('Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err) {
      console.error(err);
      setError('Failed to sign in with Google.');
      toast.error('Google sign in failed');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-bg-primary">
      {/* Left Brand Panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-secondary relative overflow-hidden flex-col justify-center p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary to-secondary/80 mix-blend-multiply z-10"></div>
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none z-0">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        {/* Floating Decorative Swatches */}
        <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 4, repeat: Infinity }} className="absolute top-1/4 right-1/4 w-24 h-24 rounded-full bg-primary shadow-[0_0_50px_rgba(255,107,53,0.5)] z-20"></motion.div>
        <motion.div animate={{ y: [0, 20, 0] }} transition={{ duration: 5, repeat: Infinity }} className="absolute bottom-1/4 left-1/4 w-32 h-32 rounded-full bg-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.5)] z-20 opacity-80"></motion.div>

        <div className="relative z-30 max-w-md mx-auto text-center">
          <Link to="/" className="inline-flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-display font-bold text-3xl">R</div>
            <span className="font-display font-bold text-4xl text-white">Rizz-Up</span>
          </Link>
          <h2 className="text-3xl font-display font-bold text-white mb-4 leading-tight">Your Virtual <br/>Style Architect</h2>
          <p className="text-text-muted text-lg">Discover your perfect color season and try on outfits that actually match your skin tone.</p>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="w-full lg:w-[55%] flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md">
          
          <div className="lg:hidden flex justify-center mb-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-display font-bold text-2xl">R</div>
              <span className="font-display font-bold text-2xl text-secondary">Rizz-Up</span>
            </Link>
          </div>

          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold font-display text-secondary mb-2">Welcome back</h1>
            <p className="text-text-secondary">Please enter your details to sign in.</p>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-error/10 border border-error/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="text-error shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-error font-medium">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input 
              label="Email" 
              type="email" 
              placeholder="Enter your email" 
              icon={Mail} 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            
            <div className="space-y-1">
              <Input 
                label="Password" 
                type="password" 
                placeholder="••••••••" 
                icon={Lock}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div className="flex justify-end">
                <a href="#" className="text-sm font-medium text-primary hover:text-primary-dark transition-colors">Forgot password?</a>
              </div>
            </div>

            <Button type="submit" className="w-full mt-6" isLoading={isLoading}>
              Sign In
            </Button>
          </form>

          <div className="mt-8 flex items-center gap-4">
            <div className="h-px bg-border flex-1"></div>
            <span className="text-sm text-text-muted font-medium">OR</span>
            <div className="h-px bg-border flex-1"></div>
          </div>

          <div className="mt-8 space-y-4">
            <Button 
              type="button" 
              variant="outline" 
              className="w-full bg-white text-text-primary hover:bg-bg-tertiary font-medium"
              onClick={handleGoogleLogin}
              isLoading={isGoogleLoading}
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </Button>
          </div>

          <p className="mt-8 text-center text-sm text-text-secondary">
            Don't have an account? <Link to="/register" className="font-medium text-primary hover:text-primary-dark transition-colors">Sign up</Link>
          </p>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
