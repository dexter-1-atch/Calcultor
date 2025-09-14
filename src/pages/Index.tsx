import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoginScreen from '@/components/LoginScreen';
import ChatScreen from '@/components/ChatScreen';

const Index = () => {
  const { user } = useAuth();

  return user ? <ChatScreen /> : <LoginScreen />;
};

export default Index;
