import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoginScreen from '@/components/LoginScreen';
import ChatScreen from '@/components/ChatScreen';
import Calculator from '@/components/Calculator';

const Index = () => {
  const { user } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  const handleSecretCode = () => {
    setShowLogin(true);
  };

  if (user) {
    return <ChatScreen />;
  }

  if (showLogin) {
    return <LoginScreen />;
  }

  return <Calculator onSecretCode={handleSecretCode} />;
};

export default Index;
