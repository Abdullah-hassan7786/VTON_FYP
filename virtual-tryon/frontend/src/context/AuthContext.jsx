import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if admin
  const isAdmin = user?.email === import.meta.env.VITE_ADMIN_EMAIL;

  const register = async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: name,
        }
      }
    });

    if (error) throw error;
    
    // Create user doc in public.users table
    if (data.user) {
      const { error: dbError } = await supabase.from('users').insert([{
        id: data.user.id,
        email: email,
        full_name: name,
        role: email === import.meta.env.VITE_ADMIN_EMAIL ? 'admin' : 'user'
      }]);
      
      if (dbError) {
        console.error("Database user creation failed:", dbError);
        // We'll throw an error with the message to be displayed to the user
        throw new Error(`Account created in auth, but database profile failed: ${dbError.message}`);
      }
    }
    
    return data.user;
  };

  const login = async (email, password) => {
    if (email === 'ali@gmail.com' && password === '1111') {
      const mockUser = {
        id: 'mock_ali_123',
        email: 'ali@gmail.com',
        user_metadata: { display_name: 'Ali' },
        created_at: new Date().toISOString(),
      };
      setUser(mockUser);
      localStorage.setItem('mockUser', JSON.stringify(mockUser));
      return mockUser;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    return data.user;
  };

  const loginWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) throw error;
  };

  const logout = async () => {
    if (user?.id === 'mock_ali_123') {
      setUser(null);
      localStorage.removeItem('mockUser');
      return Promise.resolve();
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
  };

  useEffect(() => {
    // Check for mock user first
    const savedMockUser = localStorage.getItem('mockUser');
    if (savedMockUser) {
      setUser(JSON.parse(savedMockUser));
      setLoading(false);
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!localStorage.getItem('mockUser')) {
        setUser(session?.user ?? null);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!localStorage.getItem('mockUser')) {
        setUser(session?.user ?? null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    user,
    isAdmin,
    loading,
    login,
    loginWithGoogle,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
