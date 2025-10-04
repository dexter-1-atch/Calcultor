import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Send, LogOut, Trash2, Check, CheckCheck, MessageSquare, Smile, Reply, X } from 'lucide-react';
import OnlineStatus from './OnlineStatus';
import ImageUpload from './ImageUpload';
import TypingDisplay, { useTypingIndicator } from './TypingIndicator';
import ImageViewer from './ImageViewer';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  image_url?: string | null;
  read_by?: any;
  deleted_at?: string | null;
  deleted_by?: string | null;
  message_type?: string;
  conversation_id: string;
  updated_at?: string;
  reply_to?: string | null;
}

const ChatScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationId = '00000000-0000-0000-0000-000000000001';
  const { typingUsers, startTyping, stopTyping } = useTypingIndicator({ conversationId });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (user) {
      initializeChat();
      
      // Set online status when user logs in
      updateUserOnlineStatus(true);
      
      // Set up real-time subscription for messages
      const subscription = supabase
        .channel('chat-room')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        }, (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => {
            const exists = prev.find(m => m.id === newMessage.id);
            if (exists) return prev;
            return [...prev, newMessage].sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });
          
          // Mark message as read by current user if it's not from them
          if (newMessage.sender_id !== user.id) {
            markMessageAsRead(newMessage.id);
          }
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        }, (payload) => {
          const updatedMessage = payload.new as Message;
          
          // Handle soft deletions by filtering out deleted messages
          setMessages(prev => {
            if (updatedMessage.deleted_at) {
              return prev.filter(msg => msg.id !== updatedMessage.id);
            }
            return prev.map(msg => 
              msg.id === updatedMessage.id ? updatedMessage : msg
            );
          });
        })
        .subscribe();

      // Set offline when tab closes or page refreshes
      const handleBeforeUnload = () => {
        updateUserOnlineStatus(false);
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);

      // Cleanup on unmount or logout
      return () => {
        updateUserOnlineStatus(false);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        supabase.removeChannel(subscription);
      };
    }
  }, [user]);

  // Track user activity to update online status
  useEffect(() => {
    if (!user) return;

    const updateActivity = () => {
      setLastActivityTime(Date.now());
      updateUserOnlineStatus(true);
    };

    // Update activity on user interactions
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, updateActivity));

    // Check activity every 30 seconds
    const activityInterval = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastActivityTime;
      // If inactive for more than 2 minutes, set as offline
      if (timeSinceLastActivity > 120000) {
        updateUserOnlineStatus(false);
      }
    }, 30000);

    return () => {
      events.forEach(event => window.removeEventListener(event, updateActivity));
      clearInterval(activityInterval);
    };
  }, [user, lastActivityTime]);

  const initializeChat = async () => {
    try {
      // Ensure conversation exists
      const { error: conversationError } = await supabase
        .from('conversations')
        .upsert({
          id: conversationId,
          created_by: user?.id || 'system'
        });

      if (conversationError) {
        console.error('Conversation error:', conversationError);
      }

      await loadMessages();
    } catch (error) {
      console.error('Error initializing chat:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive"
      });
    }
  };

  const updateUserOnlineStatus = async (isOnline: boolean) => {
    if (!user) return;
    
    try {
      await supabase
        .from('user_status')
        .upsert({
          user_id: user.id,
          is_online: isOnline,
          last_seen: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      // Convert to base64 since storage isn't set up
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedImage) || !user) return;

    setIsLoading(true);
    try {
      let imageUrl = null;
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
      }

      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content: newMessage.trim() || '',
          sender_id: user.id,
          image_url: imageUrl,
          message_type: imageUrl ? 'image' : 'text',
          read_by: { [user.id]: true },
          reply_to: replyingTo?.id || null
        });

      if (error) throw error;

      setNewMessage('');
      setSelectedImage(null);
      setReplyingTo(null);
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Failed to send message",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };

  const markMessageAsRead = async (messageId: string) => {
    if (!user) return;
    
    try {
      const message = messages.find(m => m.id === messageId);
      if (message) {
        const currentReadBy = message.read_by || {};
        const updatedReadBy = { ...currentReadBy, [user.id]: true };
        
        await supabase
          .from('messages')
          .update({ read_by: updatedReadBy })
          .eq('id', messageId);
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!user) return;
    
    try {
      await supabase
        .from('messages')
        .update({ 
          deleted_at: new Date().toISOString(),
          deleted_by: user.id 
        })
        .eq('id', messageId);

      toast({
        title: "Message deleted",
        description: "Message has been removed"
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive"
      });
    }
  };

  const getSenderName = (senderId: string): string => {
    if (senderId === 'serish') return 'UsSeErRish!';
    if (senderId === 'jiya') return 'Jiya';
    return senderId;
  };

  const getOtherUserName = (): string => {
    return user?.id === 'serish' ? 'Jiya' : 'UsSeErRish!';
  };

  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getOtherUserId = (): string => {
    return user?.id === 'serish' ? 'jiya' : 'serish';
  };

  const isMessageRead = (message: Message): boolean => {
    const otherUserId = getOtherUserId();
    return message.read_by?.[otherUserId] === true;
  };

  const renderReadStatus = (message: Message) => {
    if (message.sender_id !== user?.id) return null;
    
    const isRead = isMessageRead(message);
    return (
      <div className="flex items-center gap-1 text-xs opacity-70">
        {isRead ? (
          <CheckCheck className="h-3 w-3 text-blue-400" />
        ) : (
          <Check className="h-3 w-3" />
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 shadow-md border-b">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-6 w-6" />
            <div>
              <h1 className="font-semibold text-lg">
                {getOtherUserName()}
              </h1>
              <OnlineStatus userId={getOtherUserId()} />
            </div>
          </div>
          <Button
            onClick={logout}
            variant="ghost" 
            size="sm"
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-w-4xl mx-auto w-full">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground mt-8 animate-fade-in">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium">No messages yet</p>
            <p className="text-sm">Send your first message to start the conversation</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex animate-slide-in ${
                message.sender_id === user?.id ? 'justify-end' : 'justify-start'
              }`}
            >
              <div className="group relative max-w-xs md:max-w-md">
                <div
                  className={`rounded-lg p-3 shadow-sm transition-all duration-200 ${
                    message.sender_id === user?.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-xs font-medium opacity-70 mb-1">
                        {getSenderName(message.sender_id)}
                      </p>
                      
                      {/* Show replied message */}
                      {message.reply_to && (
                        <div className="mb-2 p-2 bg-background/20 border-l-2 border-foreground/30 rounded text-xs opacity-80">
                          {(() => {
                            const repliedMsg = messages.find(m => m.id === message.reply_to);
                            return repliedMsg ? (
                              <div>
                                <p className="font-semibold">{getSenderName(repliedMsg.sender_id)}</p>
                                <p className="truncate">{repliedMsg.content || '📷 Image'}</p>
                              </div>
                            ) : <p>Message deleted</p>;
                          })()}
                        </div>
                      )}
                      
                      {message.image_url && (
                        <div className="mb-2 max-w-xs">
                          <img 
                            src={message.image_url} 
                            alt="Shared image"
                            className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setViewingImage(message.image_url!)}
                            style={{ maxHeight: '200px', objectFit: 'cover' }}
                          />
                        </div>
                      )}
                      
                      {message.content && (
                        <p className="text-sm break-words">{message.content}</p>
                      )}
                      
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <p className="text-xs opacity-60">
                          {formatTime(message.created_at)}
                        </p>
                        {renderReadStatus(message)}
                      </div>
                    </div>
                    
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setReplyingTo(message)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-primary/10"
                      >
                        <Reply className="h-3 w-3" />
                      </Button>
                      {message.sender_id === user?.id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteMessage(message.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        <TypingDisplay typingUsers={typingUsers} />
        <div ref={messagesEndRef} />
      </div>

      <ImageViewer 
        imageUrl={viewingImage} 
        isOpen={!!viewingImage} 
        onClose={() => setViewingImage(null)} 
      />

      {/* Input Area */}
      <div className="p-4 bg-card border-t max-w-4xl mx-auto w-full relative">
        {/* Reply Preview */}
        {replyingTo && (
          <div className="mb-2 p-2 bg-muted rounded-lg flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Reply className="h-3 w-3" />
                <p className="text-xs font-semibold">Replying to {getSenderName(replyingTo.sender_id)}</p>
              </div>
              <p className="text-xs opacity-70 truncate">{replyingTo.content || '📷 Image'}</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setReplyingTo(null)}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div className="absolute bottom-20 left-4 z-50">
            <EmojiPicker onEmojiClick={onEmojiClick} />
          </div>
        )}

        <form onSubmit={sendMessage} className="flex items-end gap-2">
          <div className="flex-1">
            {selectedImage && (
              <div className="mb-2">
                <ImageUpload
                  onImageSelect={setSelectedImage}
                  selectedImage={selectedImage}
                  onRemoveImage={() => setSelectedImage(null)}
                />
              </div>
            )}
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Type a message... 😊"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onFocus={() => startTyping()}
                onBlur={() => stopTyping()}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(e as any);
                  }
                }}
                className="flex-1"
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="h-10 w-10 p-0"
              >
                <Smile className="h-5 w-5" />
              </Button>
              {!selectedImage && (
                <ImageUpload
                  onImageSelect={setSelectedImage}
                  selectedImage={selectedImage}
                  onRemoveImage={() => setSelectedImage(null)}
                />
              )}
            </div>
          </div>
          <Button
            type="submit"
            disabled={(!newMessage.trim() && !selectedImage) || isLoading}
            className="rounded-full h-10 w-10 p-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatScreen;