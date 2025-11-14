import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoginScreen from '@/components/LoginScreen';
import ChatScreen from '@/components/ChatScreen';
import SetupScreen from '@/components/SetupScreen';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const { user, isLoading } = useAuth();
  const [needsSetup, setNeedsSetup] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  useEffect(() => {
    checkIfSetupNeeded();
  }, []);

  const checkIfSetupNeeded = async () => {
    try {
      const { data: couples, error } = await supabase
        .from('couples')
        .select('id')
        .limit(1);

      if (error) throw error;

      setNeedsSetup(!couples || couples.length === 0);
    } catch (error) {
      console.error('Error checking setup:', error);
      setNeedsSetup(true);
    } finally {
      setCheckingSetup(false);
    }
  };

  const handleSetupComplete = () => {
    setNeedsSetup(false);
  };

  if (isLoading || checkingSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-accent/20 flex items-center justify-center">
        <div className="text-2xl font-semibold text-foreground">Loading...</div>
      </div>
    );
  }

  if (needsSetup) {
    return <SetupScreen onSetupComplete={handleSetupComplete} />;
  }

  if (user) {
    return <ChatScreen />;
  }

  return <LoginScreen />;
};

export default Index;
