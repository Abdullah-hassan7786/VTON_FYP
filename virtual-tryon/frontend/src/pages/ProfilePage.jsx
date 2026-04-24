import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { User, Mail, Bell, Shield, LogOut, AlertTriangle, Key } from 'lucide-react';

import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const displayNameFromMeta = user?.user_metadata?.display_name || user?.user_metadata?.full_name || '';
  const [displayName, setDisplayName] = useState(displayNameFromMeta);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!displayName.trim() || displayName === displayNameFromMeta) return;
    
    setIsUpdating(true);
    try {
      // Update Supabase Auth user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { display_name: displayName }
      });
      if (authError) throw authError;

      // Also update the users table if it exists
      const { error: dbError } = await supabase
        .from('users')
        .update({ full_name: displayName })
        .eq('id', user.id);
      
      if (dbError) console.warn('Could not update users table:', dbError.message);
      
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to log out');
    }
  };

  const handleDeleteAccount = async () => {
    // Note: Supabase requires server-side admin privileges to delete a user account.
    // In a real app, you would call a server-side function.
    toast('Account deletion requires admin action. Please contact support.', { icon: 'ℹ️' });
    setIsDeleteModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-bg-secondary pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-display text-secondary mb-2">Profile Settings</h1>
          <p className="text-text-secondary">Manage your account and preferences.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Left Column - Profile Card */}
          <div className="md:col-span-1 space-y-6">
            <Card className="p-6 text-center">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary font-bold text-3xl font-display shadow-inner border border-primary/20 overflow-hidden">
                 {user?.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                 ) : (
                    displayNameFromMeta?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'
                 )}
              </div>
              <h2 className="text-xl font-bold text-secondary mb-1 truncate">{displayNameFromMeta || 'User'}</h2>
              <p className="text-sm text-text-muted mb-6 truncate">{user?.email}</p>
              
              <div className="text-xs text-text-muted border-t border-border pt-4">
                Member since {new Date(user?.created_at || Date.now()).toLocaleDateString()}
              </div>
            </Card>

            <Button variant="outline" className="w-full bg-white text-error hover:bg-error/5 hover:border-error" onClick={handleLogout}>
              <LogOut size={16} className="mr-2" /> Sign Out
            </Button>
          </div>

          {/* Right Column - Settings */}
          <div className="md:col-span-2 space-y-6">
            
            <Card className="p-6 sm:p-8">
              <h3 className="text-lg font-bold text-secondary mb-6 flex items-center gap-2 border-b border-border pb-4">
                <User size={20} className="text-primary" /> Personal Information
              </h3>
              
              <form onSubmit={handleUpdateProfile} className="space-y-5">
                <Input 
                  label="Display Name" 
                  icon={User} 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
                <Input 
                  label="Email Address" 
                  icon={Mail} 
                  value={user?.email || ''}
                  disabled
                  className="opacity-70"
                />
                
                <div className="pt-2 flex justify-end">
                  <Button type="submit" isLoading={isUpdating} disabled={displayName === displayNameFromMeta || !displayName.trim()}>
                    Save Changes
                  </Button>
                </div>
              </form>
            </Card>

            <Card className="p-6 sm:p-8">
              <h3 className="text-lg font-bold text-secondary mb-6 flex items-center gap-2 border-b border-border pb-4">
                <Bell size={20} className="text-blue-500" /> Notifications
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <div>
                    <h4 className="font-medium text-secondary text-sm">Email Recommendations</h4>
                    <p className="text-xs text-text-muted">Get weekly outfit ideas based on your season.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-bg-tertiary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <h4 className="font-medium text-secondary text-sm">App Updates</h4>
                    <p className="text-xs text-text-muted">News about new features and catalog updates.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-bg-tertiary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </Card>

            <Card className="p-6 sm:p-8 border-error/30 bg-error/5">
              <h3 className="text-lg font-bold text-error mb-4 flex items-center gap-2">
                <Shield size={20} /> Danger Zone
              </h3>
              <p className="text-sm text-text-secondary mb-6">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <Button variant="danger" onClick={() => setIsDeleteModalOpen(true)}>
                Delete Account
              </Button>
            </Card>

          </div>
        </div>
      </div>

      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Account">
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-4 text-error">
            <AlertTriangle size={32} />
          </div>
          <h3 className="text-xl font-bold text-secondary mb-2">Are you absolutely sure?</h3>
          <p className="text-text-secondary text-sm mb-8">
            This action cannot be undone. This will permanently delete your account, analyses history, and saved looks.
          </p>
          <div className="flex gap-4 w-full">
            <Button variant="outline" className="flex-1 bg-white" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
            <Button variant="danger" className="flex-1" onClick={handleDeleteAccount}>Yes, delete it</Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default ProfilePage;
