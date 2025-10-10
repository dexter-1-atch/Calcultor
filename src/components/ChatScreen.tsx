import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Send, LogOut, Trash2, Check, CheckCheck, MessageSquare, Smile, Reply, X, Edit2, Image as ImageIcon, Sparkles, Sticker, Heart, ThumbsUp, Laugh } from 'lucide-react';
import OnlineStatus from './OnlineStatus';
import ImageUpload from './ImageUpload';
import TypingDisplay, { useTypingIndicator } from './TypingIndicator';
import ImageViewer from './ImageViewer';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { Grid } from '@giphy/react-components';
import { GiphyFetch } from '@giphy/js-fetch-api';

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
  reactions?: Record<string, string[]>; // emoji -> array of user IDs
}

const gf = new GiphyFetch('sXpGFDGZs0Dv1mmNFvYaGUvYwKX0PWIh');

const ChatScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editContent, setEditContent] = useState('');
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [longPressMessage, setLongPressMessage] = useState<string | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
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
          const newMessage = payload.new as any;
          const typedMessage: Message = {
            ...newMessage,
            reactions: newMessage.reactions || {}
          };
          setMessages(prev => {
            const exists = prev.find(m => m.id === typedMessage.id);
            if (exists) return prev;
            return [...prev, typedMessage].sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });
          
          // Mark message as read by current user if it's not from them
          if (typedMessage.sender_id !== user.id) {
            markMessageAsRead(typedMessage.id);
          }
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        }, (payload) => {
          const updatedMessage = payload.new as any;
          const typedMessage: Message = {
            ...updatedMessage,
            reactions: updatedMessage.reactions || {}
          };
          
          // Handle soft deletions by filtering out deleted messages
          setMessages(prev => {
            if (typedMessage.deleted_at) {
              return prev.filter(msg => msg.id !== typedMessage.id);
            }
            return prev.map(msg => 
              msg.id === typedMessage.id ? typedMessage : msg
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

      // Add both users as participants (ignore if already exist)
      const participants = [
        { conversation_id: conversationId, user_id: 'serish' },
        { conversation_id: conversationId, user_id: 'jiya' }
      ];

      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .upsert(participants, { 
          onConflict: 'conversation_id,user_id',
          ignoreDuplicates: true 
        });

      if (participantsError && participantsError.code !== '23505') {
        console.error('Participants error:', participantsError);
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
      setMessages((data || []).map(msg => ({
        ...msg,
        reactions: (msg.reactions as any) || {}
      })));
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
    if (editingMessage) {
      setEditContent(prev => prev + emojiData.emoji);
    } else {
      setNewMessage(prev => prev + emojiData.emoji);
    }
  };

  const onGifClick = async (gif: any, e: any) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content: '',
          sender_id: user.id,
          image_url: gif.images.original.url,
          message_type: 'gif',
          read_by: { [user.id]: true },
          reply_to: replyingTo?.id || null
        });

      if (error) throw error;

      setReplyingTo(null);
      setShowGifPicker(false);
    } catch (error) {
      console.error('Error sending GIF:', error);
      toast({
        title: "Failed to send GIF",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGifs = (offset: number) => gf.trending({ offset, limit: 10 });
  const fetchStickers = (offset: number) => gf.search('sticker', { offset, limit: 10, type: 'stickers' });

  const startEditingMessage = (message: Message) => {
    setEditingMessage(message);
    setEditContent(message.content);
    setShowEmojiPicker(false);
    setShowGifPicker(false);
    setShowStickerPicker(false);
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setEditContent('');
  };

  const saveEdit = async () => {
    if (!editingMessage || !user || !editContent.trim()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('messages')
        .update({ 
          content: editContent.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', editingMessage.id);

      if (error) throw error;

      toast({
        title: "Message updated",
        description: "Your message has been edited"
      });
      
      setEditingMessage(null);
      setEditContent('');
    } catch (error) {
      console.error('Error updating message:', error);
      toast({
        title: "Failed to update message",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
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

  const handleLongPressStart = (messageId: string) => {
    const timer = setTimeout(() => {
      setLongPressMessage(messageId);
      setShowReactions(null);
    }, 500); // 500ms long press
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const addReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    
    try {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;
      
      const currentReactions = message.reactions || {};
      const emojiReactions = currentReactions[emoji] || [];
      
      // Toggle reaction
      const updatedReactions = emojiReactions.includes(user.id)
        ? emojiReactions.filter(id => id !== user.id)
        : [...emojiReactions, user.id];
      
      const newReactions = {
        ...currentReactions,
        [emoji]: updatedReactions
      };
      
      // Remove empty arrays
      Object.keys(newReactions).forEach(key => {
        if (newReactions[key].length === 0) delete newReactions[key];
      });
      
      await supabase
        .from('messages')
        .update({ reactions: newReactions })
        .eq('id', messageId);
        
      setLongPressMessage(null);
      setShowReactions(null);
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const renderReadStatus = (message: Message) => {
    if (message.sender_id !== user?.id) return null;
    
    const isRead = isMessageRead(message);
    return (
      <div className="flex items-center gap-1 text-xs">
        {isRead ? (
          <CheckCheck className="h-4 w-4 text-accent animate-scale-in" />
        ) : (
          <Check className="h-4 w-4 opacity-60" />
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-[hsl(291,64%,42%)] via-[hsl(340,82%,52%)] to-[hsl(25,95%,53%)]">
      {/* Header - Mobile optimized */}
      <div className="relative bg-gradient-to-r from-primary via-accent to-[hsl(var(--primary-orange))] text-primary-foreground p-4 md:p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between w-full relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 md:p-3 bg-white/20 rounded-2xl backdrop-blur-lg shadow-xl">
              <MessageSquare className="h-6 w-6 md:h-7 md:w-7" />
            </div>
            <div>
              <h1 className="font-bold text-xl md:text-2xl tracking-tight drop-shadow-lg">
                {getOtherUserName()}
              </h1>
              <OnlineStatus userId={getOtherUserId()} />
            </div>
          </div>
          <Button
            onClick={logout}
            variant="ghost" 
            size="sm"
            className="text-primary-foreground hover:bg-white/20 backdrop-blur-md rounded-full px-3 py-2 border border-white/30 shadow-lg"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages - Mobile optimized */}
      <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-3 w-full bg-gradient-to-b from-white/95 to-white/90 dark:from-black/40 dark:to-black/60">
        {messages.length === 0 ? (
          <div className="text-center text-white mt-16 animate-fade-in-up">
            <div className="inline-block p-6 bg-white/20 backdrop-blur-xl rounded-3xl mb-6 shadow-2xl">
              <MessageSquare className="h-16 w-16 mx-auto text-white drop-shadow-lg" />
            </div>
            <p className="text-2xl font-bold mb-2 text-white drop-shadow-lg">No messages yet</p>
            <p className="text-base text-white/80 drop-shadow-md">Send your first message to start the conversation</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex message-appear ${
                message.sender_id === user?.id ? 'justify-end' : 'justify-start'
              }`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="group relative max-w-[85%] md:max-w-lg">
                <div
                  className={`rounded-[24px] p-3.5 shadow-2xl smooth-transition ${
                    message.sender_id === user?.id
                      ? 'bg-gradient-to-br from-primary via-accent to-[hsl(var(--primary-pink))] text-white'
                      : 'bg-white dark:bg-card border border-border/50 text-foreground'
                  }`}
                  onMouseDown={() => handleLongPressStart(message.id)}
                  onMouseUp={handleLongPressEnd}
                  onMouseLeave={handleLongPressEnd}
                  onTouchStart={() => handleLongPressStart(message.id)}
                  onTouchEnd={handleLongPressEnd}
                >
                  <div className="flex-1">
                    <p className="text-xs font-bold opacity-80 mb-1.5">
                      {getSenderName(message.sender_id)}
                    </p>
                    
                    {/* Show replied message */}
                    {message.reply_to && (
                      <div className="mb-2 p-2 bg-black/10 dark:bg-white/10 border-l-4 border-current rounded-lg text-xs">
                        {(() => {
                          const repliedMsg = messages.find(m => m.id === message.reply_to);
                          return repliedMsg ? (
                            <div>
                              <p className="font-bold mb-1 flex items-center gap-1">
                                <Reply className="h-3 w-3" />
                                {getSenderName(repliedMsg.sender_id)}
                              </p>
                              <p className="truncate opacity-80">{repliedMsg.content || '📷 Image'}</p>
                            </div>
                          ) : <p className="italic opacity-70">Message deleted</p>;
                        })()}
                      </div>
                    )}
                    
                    {message.image_url && (
                      <div className="mb-2">
                        <img 
                          src={message.image_url} 
                          alt={message.message_type === 'gif' ? 'GIF' : 'Shared image'}
                          className="rounded-2xl max-w-full h-auto cursor-pointer hover-scale smooth-transition shadow-lg"
                          onClick={() => setViewingImage(message.image_url!)}
                          style={{ maxHeight: message.message_type === 'gif' ? '250px' : '200px', objectFit: 'cover' }}
                        />
                      </div>
                    )}
                    
                    {message.content && (
                      <p className="text-[15px] break-words leading-relaxed">{message.content}</p>
                    )}
                    
                    {/* Reactions Display */}
                    {message.reactions && Object.keys(message.reactions).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {Object.entries(message.reactions).map(([emoji, users]) => (
                          users.length > 0 && (
                            <button
                              key={emoji}
                              onClick={() => addReaction(message.id, emoji)}
                              className="px-2 py-0.5 bg-white/20 dark:bg-black/20 backdrop-blur-sm rounded-full text-xs font-semibold flex items-center gap-1 hover-scale"
                            >
                              <span>{emoji}</span>
                              <span className="opacity-70">{users.length}</span>
                            </button>
                          )
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between gap-2 mt-1.5">
                      <p className="text-[11px] font-medium opacity-60">
                        {formatTime(message.created_at)}
                        {message.updated_at && message.updated_at !== message.created_at && (
                          <span className="ml-1 italic">(edited)</span>
                        )}
                      </p>
                      {renderReadStatus(message)}
                    </div>
                  </div>
                </div>
                
                {/* Long Press Action Menu */}
                {longPressMessage === message.id && (
                  <>
                    <div 
                      className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                      onClick={() => setLongPressMessage(null)}
                    />
                    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white dark:bg-card rounded-3xl shadow-2xl p-4 min-w-[280px] animate-scale-in border-2 border-primary/20">
                      <div className="space-y-2">
                        <Button
                          onClick={() => {
                            setShowReactions(message.id);
                            setLongPressMessage(null);
                          }}
                          className="w-full justify-start gap-3 h-12 text-base bg-gradient-to-r from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20"
                          variant="ghost"
                        >
                          <span className="text-xl">❤️</span>
                          React
                        </Button>
                        <Button
                          onClick={() => {
                            setReplyingTo(message);
                            setLongPressMessage(null);
                          }}
                          className="w-full justify-start gap-3 h-12 text-base hover:bg-muted"
                          variant="ghost"
                        >
                          <Reply className="h-5 w-5" />
                          Reply
                        </Button>
                        {message.sender_id === user?.id && message.message_type === 'text' && (
                          <Button
                            onClick={() => {
                              startEditingMessage(message);
                              setLongPressMessage(null);
                            }}
                            className="w-full justify-start gap-3 h-12 text-base hover:bg-muted"
                            variant="ghost"
                          >
                            <Edit2 className="h-5 w-5" />
                            Edit
                          </Button>
                        )}
                        {message.sender_id === user?.id && (
                          <Button
                            onClick={() => {
                              deleteMessage(message.id);
                              setLongPressMessage(null);
                            }}
                            className="w-full justify-start gap-3 h-12 text-base text-destructive hover:bg-destructive/10"
                            variant="ghost"
                          >
                            <Trash2 className="h-5 w-5" />
                            Delete
                          </Button>
                        )}
                        <Button
                          onClick={() => setLongPressMessage(null)}
                          className="w-full h-12 text-base mt-2"
                          variant="outline"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </>
                )}
                
                {/* Reaction Picker Popup */}
                {showReactions === message.id && (
                  <>
                    <div 
                      className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                      onClick={() => setShowReactions(null)}
                    />
                    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white dark:bg-card rounded-3xl shadow-2xl p-6 animate-scale-in border-2 border-primary/20">
                      <h3 className="text-lg font-bold mb-4 text-center">Choose a reaction</h3>
                      <div className="flex gap-4 justify-center">
                        {['❤️', '👍', '😂', '😮', '😢', '🔥'].map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => addReaction(message.id, emoji)}
                            className="text-4xl hover-scale transition-transform active:scale-90"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
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

      {/* Input Area - Mobile optimized, bigger */}
      <div className="p-4 md:p-6 bg-white/95 dark:bg-card/95 backdrop-blur-2xl w-full relative shadow-2xl border-t border-border/30">
        {/* Edit Mode */}
        {editingMessage && (
          <div className="mb-4 p-4 bg-gradient-to-r from-blue-500/10 to-blue-400/10 rounded-2xl border-2 border-blue-500/30 flex items-start justify-between gap-3 animate-fade-in-up shadow-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-blue-500/20 rounded-full">
                  <Edit2 className="h-4 w-4 text-blue-500" />
                </div>
                <p className="text-sm font-bold text-blue-600">Edit Message</p>
              </div>
              <Input
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="mb-3 rounded-xl border-2 focus:border-blue-500 h-11"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={saveEdit}
                  disabled={!editContent.trim() || isLoading}
                  className="hover-scale rounded-full px-5 font-semibold"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={cancelEdit}
                  className="hover-scale rounded-full px-5 font-semibold"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Reply Preview */}
        {replyingTo && !editingMessage && (
          <div className="mb-4 p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl border-2 border-primary/30 flex items-start justify-between gap-3 animate-fade-in-up shadow-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-primary/20 rounded-full">
                  <Reply className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm font-bold">Replying to {getSenderName(replyingTo.sender_id)}</p>
              </div>
              <p className="text-sm opacity-80 truncate pl-2 border-l-2 border-primary/40">{replyingTo.content || '📷 Image'}</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setReplyingTo(null)}
              className="h-8 w-8 p-0 hover-scale rounded-full hover:bg-destructive/10"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* GIF Picker - Mobile optimized */}
        {showGifPicker && !editingMessage && (
          <div className="absolute bottom-20 md:bottom-24 left-2 right-2 md:left-4 md:right-4 z-50 animate-scale-in bg-white dark:bg-card rounded-3xl shadow-2xl p-4 max-h-[60vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-base">Send a GIF</h3>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowGifPicker(false)}
                className="h-8 w-8 p-0 rounded-full hover-scale"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <Grid width={window.innerWidth - 40} columns={2} fetchGifs={fetchGifs} key="gifs" onGifClick={onGifClick} />
          </div>
        )}

        {/* Sticker Picker - Mobile optimized */}
        {showStickerPicker && !editingMessage && (
          <div className="absolute bottom-20 md:bottom-24 left-2 right-2 md:left-4 md:right-4 z-50 animate-scale-in bg-white dark:bg-card rounded-3xl shadow-2xl p-4 max-h-[60vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sticker className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-base">Send a Sticker</h3>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowStickerPicker(false)}
                className="h-8 w-8 p-0 rounded-full hover-scale"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <Grid width={window.innerWidth - 40} columns={2} fetchGifs={fetchStickers} key="stickers" onGifClick={onGifClick} />
          </div>
        )}

        {/* Emoji Picker - Mobile optimized */}
        {showEmojiPicker && (
          <div className="absolute bottom-20 md:bottom-24 left-2 md:left-4 z-50 animate-scale-in shadow-2xl rounded-3xl overflow-hidden">
            <EmojiPicker onEmojiClick={onEmojiClick} width={window.innerWidth - 40} />
          </div>
        )}

        {!editingMessage && (
          <form onSubmit={sendMessage} className="flex items-end gap-2">
            <div className="flex-1">
              {selectedImage && (
                <div className="mb-2 animate-fade-in">
                  <ImageUpload
                    onImageSelect={setSelectedImage}
                    selectedImage={selectedImage}
                    onRemoveImage={() => setSelectedImage(null)}
                  />
                </div>
              )}
              <div className="flex gap-2 items-center bg-muted/50 dark:bg-muted/30 p-1.5 rounded-[28px] border border-border/30 shadow-lg">
                <Input
                  type="text"
                  placeholder="Message..."
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
                  className="flex-1 rounded-full px-5 h-14 md:h-12 text-[15px] border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                  disabled={isLoading}
                />
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowEmojiPicker(!showEmojiPicker);
                      setShowGifPicker(false);
                      setShowStickerPicker(false);
                    }}
                    className={`h-11 w-11 p-0 hover-scale rounded-full ${showEmojiPicker ? 'bg-gradient-to-br from-primary to-accent text-white' : ''}`}
                  >
                    <Smile className="h-6 w-6" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowGifPicker(!showGifPicker);
                      setShowEmojiPicker(false);
                      setShowStickerPicker(false);
                    }}
                    className={`h-11 w-11 p-0 hover-scale rounded-full ${showGifPicker ? 'bg-gradient-to-br from-primary to-accent text-white' : ''}`}
                  >
                    <Sparkles className="h-6 w-6" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowStickerPicker(!showStickerPicker);
                      setShowEmojiPicker(false);
                      setShowGifPicker(false);
                    }}
                    className={`h-11 w-11 p-0 hover-scale rounded-full ${showStickerPicker ? 'bg-gradient-to-br from-primary to-accent text-white' : ''}`}
                  >
                    <Sticker className="h-6 w-6" />
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
            </div>
            <Button
              type="submit"
              disabled={(!newMessage.trim() && !selectedImage) || isLoading}
              className="rounded-full h-14 w-14 md:h-12 md:w-12 p-0 hover-scale bg-gradient-to-br from-primary via-accent to-[hsl(var(--primary-pink))] shadow-xl disabled:opacity-50"
            >
              <Send className="h-6 w-6" />
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ChatScreen;