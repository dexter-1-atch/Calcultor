import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Send, LogOut, Trash2, Check, CheckCheck, MessageSquare, Smile, Reply, X, Edit2, Image as ImageIcon, Sparkles, Sticker } from 'lucide-react';
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

  const renderReadStatus = (message: Message) => {
    if (message.sender_id !== user?.id) return null;
    
    const isRead = isMessageRead(message);
    return (
      <div className="flex items-center gap-1 text-xs">
        {isRead ? (
          <CheckCheck className="h-4 w-4 text-blue-400 animate-scale-in" />
        ) : (
          <Check className="h-4 w-4 opacity-60" />
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-primary via-primary/90 to-primary text-primary-foreground p-5 shadow-xl border-b border-white/10 backdrop-blur-xl animate-fade-in-down">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30"></div>
        <div className="flex items-center justify-between max-w-4xl mx-auto relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/15 rounded-2xl backdrop-blur-lg shadow-lg hover-scale">
              <MessageSquare className="h-7 w-7 animate-bounce-subtle" />
            </div>
            <div>
              <h1 className="font-bold text-2xl tracking-tight drop-shadow-sm">
                {getOtherUserName()}
              </h1>
              <OnlineStatus userId={getOtherUserId()} />
            </div>
          </div>
          <Button
            onClick={logout}
            variant="ghost" 
            size="sm"
            className="text-primary-foreground hover:bg-white/20 hover-scale backdrop-blur-md rounded-full px-4 py-2 border border-white/20"
          >
            <LogOut className="h-5 w-5 mr-2" />
            <span className="font-medium">Logout</span>
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-4xl mx-auto w-full">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground mt-16 animate-fade-in-up">
            <div className="inline-block p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl mb-6 shadow-lg">
              <MessageSquare className="h-16 w-16 mx-auto text-primary animate-bounce-subtle drop-shadow-sm" />
            </div>
            <p className="text-2xl font-bold mb-2">No messages yet</p>
            <p className="text-base opacity-70">Send your first message to start the conversation</p>
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
              <div className="group relative max-w-xs md:max-w-lg">
                <div
                  className={`rounded-3xl p-4 shadow-xl smooth-transition hover-lift ${
                    message.sender_id === user?.id
                      ? 'bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground shadow-primary/20'
                      : 'bg-gradient-to-br from-card via-card to-muted border-2 border-border/30 shadow-lg'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-xs font-bold opacity-90 mb-2 tracking-wide">
                        {getSenderName(message.sender_id)}
                      </p>
                      
                      {/* Show replied message */}
                      {message.reply_to && (
                        <div className="mb-3 p-3 bg-background/20 border-l-4 border-white/40 rounded-lg text-xs animate-fade-in backdrop-blur-sm">
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
                        <div className="mb-2 max-w-xs">
                          <img 
                            src={message.image_url} 
                            alt={message.message_type === 'gif' ? 'GIF' : 'Shared image'}
                            className="rounded-xl max-w-full h-auto cursor-pointer hover-scale smooth-transition hover:shadow-2xl border border-white/10"
                            onClick={() => setViewingImage(message.image_url!)}
                            style={{ maxHeight: message.message_type === 'gif' ? '250px' : '200px', objectFit: 'cover' }}
                          />
                        </div>
                      )}
                      
                      {message.content && (
                        <p className="text-base break-words leading-relaxed">{message.content}</p>
                      )}
                      
                      <div className="flex items-center justify-between gap-3 mt-3">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium opacity-70">
                            {formatTime(message.created_at)}
                          </p>
                          {message.updated_at && message.updated_at !== message.created_at && (
                            <span className="text-xs opacity-60 italic flex items-center gap-1">
                              <Edit2 className="h-3 w-3" />
                              edited
                            </span>
                          )}
                        </div>
                        {renderReadStatus(message)}
                      </div>
                    </div>
                    
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setReplyingTo(message)}
                        className="opacity-0 group-hover:opacity-100 smooth-transition h-8 w-8 p-0 hover:bg-white/20 hover-scale rounded-full shadow-md backdrop-blur-sm"
                        title="Reply"
                      >
                        <Reply className="h-4 w-4" />
                      </Button>
                      {message.sender_id === user?.id && message.message_type === 'text' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEditingMessage(message)}
                          className="opacity-0 group-hover:opacity-100 smooth-transition h-8 w-8 p-0 hover:bg-blue-500/20 hover:text-blue-500 hover-scale rounded-full shadow-md backdrop-blur-sm"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                      {message.sender_id === user?.id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteMessage(message.id)}
                          className="opacity-0 group-hover:opacity-100 smooth-transition h-8 w-8 p-0 hover:bg-destructive/20 hover:text-destructive hover-scale rounded-full shadow-md backdrop-blur-sm"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
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
      <div className="p-6 bg-gradient-to-t from-card via-card/98 to-card/95 border-t-2 border-border/50 backdrop-blur-2xl max-w-4xl mx-auto w-full relative shadow-2xl">
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

        {/* GIF Picker */}
        {showGifPicker && !editingMessage && (
          <div className="absolute bottom-24 left-4 right-4 z-50 animate-scale-in bg-gradient-to-br from-card to-card/95 rounded-2xl border-2 border-primary/20 shadow-2xl p-5 max-h-96 overflow-y-auto backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-bold text-lg">Send a GIF</h3>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowGifPicker(false)}
                className="h-9 w-9 p-0 rounded-full hover:bg-destructive/10 hover-scale"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <Grid width={400} columns={2} fetchGifs={fetchGifs} key="gifs" onGifClick={onGifClick} />
          </div>
        )}

        {/* Sticker Picker */}
        {showStickerPicker && !editingMessage && (
          <div className="absolute bottom-24 left-4 right-4 z-50 animate-scale-in bg-gradient-to-br from-card to-card/95 rounded-2xl border-2 border-primary/20 shadow-2xl p-5 max-h-96 overflow-y-auto backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl">
                  <Sticker className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-bold text-lg">Send a Sticker</h3>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowStickerPicker(false)}
                className="h-9 w-9 p-0 rounded-full hover:bg-destructive/10 hover-scale"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <Grid width={400} columns={2} fetchGifs={fetchStickers} key="stickers" onGifClick={onGifClick} />
          </div>
        )}

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div className="absolute bottom-24 left-4 z-50 animate-scale-in shadow-2xl rounded-2xl overflow-hidden border-2 border-primary/20">
            <EmojiPicker onEmojiClick={onEmojiClick} />
          </div>
        )}

        {!editingMessage && (
          <form onSubmit={sendMessage} className="flex items-end gap-3">
            <div className="flex-1">
              {selectedImage && (
                <div className="mb-3 animate-fade-in">
                  <ImageUpload
                    onImageSelect={setSelectedImage}
                    selectedImage={selectedImage}
                    onRemoveImage={() => setSelectedImage(null)}
                  />
                </div>
              )}
              <div className="flex gap-2 bg-muted/30 p-2 rounded-3xl border-2 border-border/50">
                <Input
                  type="text"
                  placeholder="Type a message... 💬"
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
                  className="flex-1 smooth-transition focus:shadow-xl focus:ring-2 focus:ring-primary/50 rounded-full px-6 h-12 text-base border-0 bg-transparent focus-visible:ring-offset-0"
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
                    className={`h-12 w-12 p-0 hover-scale rounded-full transition-all ${showEmojiPicker ? 'bg-primary/20 text-primary' : 'hover:bg-primary/10'}`}
                    title="Emoji"
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
                    className={`h-12 px-3 hover-scale rounded-full transition-all ${showGifPicker ? 'bg-primary/20 text-primary' : 'hover:bg-primary/10'}`}
                    title="GIF"
                  >
                    <div className="flex items-center gap-1">
                      <Sparkles className="h-5 w-5" />
                      <span className="text-sm font-bold">GIF</span>
                    </div>
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
                    className={`h-12 w-12 p-0 hover-scale rounded-full transition-all ${showStickerPicker ? 'bg-primary/20 text-primary' : 'hover:bg-primary/10'}`}
                    title="Sticker"
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
              className="rounded-full h-14 w-14 p-0 hover-scale smooth-transition hover:shadow-2xl bg-gradient-to-br from-primary via-primary to-primary/90 shadow-lg shadow-primary/30 disabled:opacity-50"
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