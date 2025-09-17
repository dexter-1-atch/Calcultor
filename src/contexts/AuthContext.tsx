import React, { createContext, useContext, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

type User = {
  id: string;
  name: string;
};

type AuthContextType = {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS = {
  serish: { id: 'serish', name: 'UsSeErRish!', password: 'serish12' },
  jiya: { id: 'jiya', name: 'Jiya', password: 'jiya' }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = async (username: string, password: string): Promise<boolean> => {
    const userKey = username.toLowerCase() as keyof typeof USERS;
    const userData = USERS[userKey];
    
    if (userData && userData.password === password) {
      setUser({ id: userData.id, name: userData.name });
      return true;
    }
    return false;
  };

  const logout = async () => {
    if (user) {
      // Set user as offline before logging out
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
    // Reset to calculator view on logout
    window.location.reload();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
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