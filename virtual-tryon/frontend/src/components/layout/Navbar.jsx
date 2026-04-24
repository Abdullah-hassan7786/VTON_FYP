import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { Menu, X, Bell, User, LogOut, Settings, Shield } from 'lucide-react';
import Button from '../ui/Button';

const Navbar = () => {
  const { user, isAdmin, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      setUserMenuOpen(false);
      setMobileMenuOpen(false);
      navigate('/');
      toast.success('Logged out successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to log out');
    }
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }, [location]);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Catalog', path: '/catalog' },
    { name: 'Try-On', path: '/try-on' },
    { name: 'My History', path: '/history' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/80 backdrop-blur-md shadow-sm border-b border-border' : 'bg-white'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-display font-bold text-xl">R</div>
            <span className="font-display font-bold text-xl text-secondary">Rizz-Up</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link 
                key={link.name} 
                to={link.path}
                className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname === link.path ? 'text-primary' : 'text-text-secondary'}`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Right Section */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <button className="text-text-secondary hover:text-primary transition-colors relative">
                  <Bell size={20} />
                  <span className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full border border-white"></span>
                </button>
                
                <div className="relative">
                  <button 
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 focus:outline-none"
                  >
                    <div className="w-9 h-9 rounded-full bg-bg-tertiary flex items-center justify-center text-primary font-bold border border-border overflow-hidden">
                      {user.user_metadata?.avatar_url ? (
                        <img src={user.user_metadata.avatar_url} alt={user.user_metadata?.display_name} className="w-full h-full object-cover" />
                      ) : (
                        (user.user_metadata?.display_name || user.email)?.charAt(0).toUpperCase()
                      )}
                    </div>
                  </button>

                  {/* User Dropdown */}
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-border py-2 overflow-hidden">
                      <div className="px-4 py-2 border-b border-border mb-1">
                        <p className="text-sm font-medium text-secondary truncate">{user.user_metadata?.display_name || 'User'}</p>
                        <p className="text-xs text-text-muted truncate">{user.email}</p>
                      </div>
                      <Link to="/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:bg-bg-tertiary hover:text-primary transition-colors">
                        <User size={16} /> Profile
                      </Link>
                      {isAdmin && (
                        <Link to="/admin" className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:bg-bg-tertiary hover:text-primary transition-colors">
                          <Shield size={16} /> Admin Panel
                        </Link>
                      )}
                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-error hover:bg-error/10 transition-colors mt-1"
                      >
                        <LogOut size={16} /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-text-secondary hover:text-primary transition-colors">
                  Sign In
                </Link>
                <Link to="/register">
                  <Button size="sm">Get Started</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-text-secondary hover:text-primary focus:outline-none p-2"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-border shadow-lg absolute top-16 left-0 right-0 max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="px-4 pt-2 pb-6 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`block px-3 py-3 rounded-lg text-base font-medium ${location.pathname === link.path ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-bg-tertiary hover:text-primary'}`}
              >
                {link.name}
              </Link>
            ))}
            
            <div className="h-px bg-border my-4"></div>
            
            {user ? (
              <div className="space-y-1">
                <div className="px-3 py-2 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-bg-tertiary flex items-center justify-center text-primary font-bold overflow-hidden">
                     {user.user_metadata?.avatar_url ? (
                        <img src={user.user_metadata.avatar_url} alt={user.user_metadata?.display_name} className="w-full h-full object-cover" />
                      ) : (
                        (user.user_metadata?.display_name || user.email)?.charAt(0).toUpperCase()
                      )}
                  </div>
                  <div>
                    <div className="font-medium text-secondary">{user.user_metadata?.display_name || 'User'}</div>
                    <div className="text-sm text-text-muted">{user.email}</div>
                  </div>
                </div>
                <Link to="/profile" className="block px-3 py-3 rounded-lg text-base font-medium text-text-secondary hover:bg-bg-tertiary hover:text-primary">
                  Profile Settings
                </Link>
                {isAdmin && (
                  <Link to="/admin" className="block px-3 py-3 rounded-lg text-base font-medium text-text-secondary hover:bg-bg-tertiary hover:text-primary">
                    Admin Dashboard
                  </Link>
                )}
                <button 
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-3 rounded-lg text-base font-medium text-error hover:bg-error/10"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 px-3 pt-2">
                <Link to="/login">
                  <Button variant="outline" className="w-full">Sign In</Button>
                </Link>
                <Link to="/register">
                  <Button className="w-full">Get Started</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
