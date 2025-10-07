import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UseTypingIndicatorProps {
  conversationId: string;
}

export const useTypingIndicator = ({ conversationId }: UseTypingIndicatorProps) => {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(`typing-${conversationId}`)
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const typers = Object.keys(presenceState).filter(userId => userId !== user.id);
        setTypingUsers(typers);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        if (key !== user.id) {
          setTypingUsers(prev => prev.includes(key) ? prev : [...prev, key]);
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setTypingUsers(prev => prev.filter(id => id !== key));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user]);

  const startTyping = () => {
    if (!user) return;
    const channel = supabase.channel(`typing-${conversationId}`);
    channel.track({ user_id: user.id, typing: true });
  };

  const stopTyping = () => {
    if (!user) return;
    const channel = supabase.channel(`typing-${conversationId}`);
    channel.untrack();
  };

  return {
    typingUsers,
    startTyping,
    stopTyping
  };
};

interface TypingDisplayProps {
  typingUsers: string[];
}

const TypingDisplay: React.FC<TypingDisplayProps> = ({ typingUsers }) => {
  const getSenderName = (senderId: string): string => {
    if (senderId === 'serish') return 'UsSeErRish!';
    if (senderId === 'jiya') return 'Jiya';
    return senderId;
  };

  if (typingUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 animate-fade-in-up">
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-sm text-muted-foreground">
        {getSenderName(typingUsers[0])} is typing...
      </span>
    </div>
  );
};

export default TypingDisplay;
