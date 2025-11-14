import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type User = {
  id: string;
  name: string;
  coupleId: string;
};

type AuthContextType = {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored session
    const storedUser = localStorage.getItem('chatUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const passwordHash = await hashPassword(password);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, display_name, couple_id')
        .eq('username', username.toLowerCase())
        .eq('password_hash', passwordHash)
        .single();

      if (error || !profile) {
        return false;
      }

      const userData = {
        id: profile.id,
        name: profile.display_name,
        coupleId: profile.couple_id
      };

      setUser(userData);
      localStorage.setItem('chatUser', JSON.stringify(userData));
      
      // Set online status
      await supabase
        .from('user_status')
        .upsert({
          user_id: profile.id,
          is_online: true,
          last_seen: new Date().toISOString()
        });

      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    if (user) {
      try {
        await supabase
          .from('user_status')
          .upsert({
            user_id: user.id,
            is_online: false,
            last_seen: new Date().toISOString()
          });
      } catch (error) {
        console.error('Error setting offline status:', error);
      }
    }
    
    setUser(null);
    localStorage.removeItem('chatUser');
    window.location.reload();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};