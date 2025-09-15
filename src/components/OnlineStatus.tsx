import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface OnlineStatusProps {
  userId: string;
}

const OnlineStatus: React.FC<OnlineStatusProps> = ({ userId }) => {
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<string>('');
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Update our own online status
    const updateOnlineStatus = async () => {
      if (user.id === userId) {
        await supabase
          .from('user_status')
          .upsert({
            user_id: userId,
            is_online: true,
            last_seen: new Date().toISOString()
          });
      }
    };

    updateOnlineStatus();

    // Listen for status changes
    const subscription = supabase
      .channel('user-status')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_status',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        if (payload.new) {
          setIsOnline(payload.new.is_online);
          setLastSeen(payload.new.last_seen);
        }
      })
      .subscribe();

    // Set offline when tab closes
    const handleBeforeUnload = () => {
      if (user.id === userId) {
        supabase
          .from('user_status')
          .update({ 
            is_online: false,
            last_seen: new Date().toISOString()
          })
          .eq('user_id', userId);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (user.id === userId) {
        handleBeforeUnload();
      }
    };
  }, [userId, user]);

  if (userId === user?.id) return null;

  const formatLastSeen = (lastSeenTime: string) => {
    const now = new Date();
    const seen = new Date(lastSeenTime);
    const diffMs = now.getTime() - seen.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${
        isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
      }`} />
      <span className="text-xs text-muted-foreground">
        {isOnline ? 'Online' : `Last seen ${formatLastSeen(lastSeen)}`}
      </span>
    </div>
  );
};

export default OnlineStatus;