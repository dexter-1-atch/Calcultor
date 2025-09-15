import React, { createContext, useContext, useState, ReactNode } from 'react';

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

  const logout = () => {
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