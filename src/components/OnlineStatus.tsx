import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface OnlineStatusProps {
  userId: string;
}

interface UserStatus {
  user_id: string;
  is_online: boolean;
  last_seen: string;
}

const OnlineStatus: React.FC<OnlineStatusProps> = ({ userId }) => {
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<string>('');
  const { user } = useAuth();

  useEffect(() => {
    // Fetch initial status
    const fetchStatus = async () => {
      const { data, error } = await supabase
        .from('user_status')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (data) {
        setIsOnline(data.is_online);
        setLastSeen(data.last_seen);
      } else {
        // If no status record exists, user is offline
        setIsOnline(false);
        setLastSeen('');
      }
    };

    fetchStatus();

    // Listen for status changes
    const subscription = supabase
      .channel('user-status')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_status',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        const newData = payload.new as UserStatus;
        if (newData) {
          setIsOnline(newData.is_online);
          setLastSeen(newData.last_seen);
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  if (userId === user?.id) return null;

  const formatLastSeen = (lastSeenTime: string) => {
    if (!lastSeenTime) return '';
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
    <div className="flex items-center gap-2 animate-fade-in">
      <div className={`w-2 h-2 rounded-full ${
        isOnline ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50' : 'bg-gray-400'
      }`} />
      <span className="text-xs text-muted-foreground">
        {isOnline ? 'Online' : lastSeen ? `Last seen ${formatLastSeen(lastSeen)}` : 'Offline'}
      </span>
    </div>
  );
};

export default OnlineStatus;