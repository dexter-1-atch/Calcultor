import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Heart, Lock, User, Sparkles, Stars } from 'lucide-react';

const LoginScreen: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  const users = [
    {
      id: 'serish',
      name: 'UsSeErRish!',
      displayName: 'Serish',
      avatar: '💖',
      gradient: 'from-pink-500 to-rose-500'
    },
    {
      id: 'jiya',
      name: 'Jiya',
      displayName: 'Jiya',
      avatar: '💕',
      gradient: 'from-purple-500 to-pink-500'
    }
  ];

  const handleLogin = async () => {
    if (!selectedUser || !password) return;
    
    setIsLoading(true);
    
    const success = await login(selectedUser, password);
    
    if (success) {
      toast({
        title: "Welcome to Love Chat! 💕",
        description: "You're now connected with love!",
      });
    } else {
      toast({
        title: "Login failed",
        description: "Please check your credentials and try again.",
        variant: "destructive"
      });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-rose-50 to-purple-50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-rose-900/20 p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-32 h-32 bg-pink-300/30 rounded-full blur-2xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-purple-300/30 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/3 right-1/4 w-24 h-24 bg-rose-300/20 rounded-full blur-xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-1/3 left-1/4 w-36 h-36 bg-pink-400/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '3s' }} />
        
        {/* Floating hearts */}
        {[...Array(6)].map((_, i) => (
          <Heart 
            key={i}
            className={`absolute h-6 w-6 text-pink-300/50 fill-current animate-bounce`}
            style={{
              left: `${20 + (i * 15)}%`,
              top: `${10 + (i * 12)}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: '3s'
            }}
          />
        ))}
      </div>
      
      <Card className="w-full max-w-lg love-glow border-pink-200/50 bg-white/95 backdrop-blur-xl shadow-2xl relative">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-50/50 via-white/50 to-purple-50/50 rounded-lg" />
        
        <CardHeader className="space-y-6 text-center relative z-10">
          <div className="flex justify-center mb-4 relative">
            <div className="relative">
              <div className="animate-heart-beat">
                <Heart className="h-16 w-16 text-pink-500 fill-current drop-shadow-lg" />
              </div>
              <Sparkles className="h-6 w-6 absolute -top-2 -right-2 text-yellow-400 animate-pulse" />
              <Stars className="h-4 w-4 absolute -bottom-1 -left-1 text-pink-400 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 via-rose-500 to-purple-600 bg-clip-text text-transparent animate-pulse">
              💕 Love Connect 💕
            </h1>
            <p className="text-lg font-medium bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">
              Where Hearts Unite in Digital Harmony
            </p>
            <p className="text-sm text-muted-foreground/80">
              Enter the realm of eternal love and connection
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="relative z-10 px-8 pb-8">
          <div className="space-y-6">
            <div className="space-y-4">
              <label className="text-sm font-semibold flex items-center gap-3 text-gray-700">
                <div className="p-2 rounded-full bg-pink-100">
                  <User className="h-4 w-4 text-pink-600" />
                </div>
                Choose Your Love Identity
              </label>
              
              <div className="grid grid-cols-2 gap-4">
                {users.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUser(user.id)}
                    className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:scale-105 ${
                      selectedUser === user.id
                        ? 'border-pink-400 bg-gradient-to-br from-pink-50 to-rose-50 love-glow'
                        : 'border-pink-200/50 bg-white/80 hover:border-pink-300'
                    }`}
                  >
                    <div className="text-center space-y-3">
                      <div className={`text-4xl animate-pulse bg-gradient-to-r ${user.gradient} bg-clip-text text-transparent`}>
                        {user.avatar}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-800">{user.displayName}</h3>
                        <p className="text-sm text-gray-600">{user.name}</p>
                      </div>
                    </div>
                    
                    {selectedUser === user.id && (
                      <div className="absolute -top-2 -right-2">
                        <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                          <Heart className="h-3 w-3 text-white fill-current" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {selectedUser && (
              <div className="space-y-3">
                <label htmlFor="password" className="text-sm font-semibold flex items-center gap-3 text-gray-700">
                  <div className="p-2 rounded-full bg-purple-100">
                    <Lock className="h-4 w-4 text-purple-600" />
                  </div>
                  Secret Love Code
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Your heart's secret password 🔐"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  className="border-2 border-pink-200/60 focus:border-pink-400 focus:ring-pink-400/50 rounded-xl h-12 bg-white/80 backdrop-blur-sm shadow-inner"
                />
              </div>
            )}
            
            <Button
              onClick={handleLogin}
              disabled={!selectedUser || !password || isLoading}
              className="w-full love-gradient hover:scale-105 transition-all duration-300 love-glow h-14 text-lg font-bold rounded-xl shadow-xl disabled:opacity-50 disabled:hover:scale-100"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5 animate-pulse" />
                  Connecting Hearts...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Enter Love Dimension 
                  <Heart className="h-5 w-5 fill-current" />
                </div>
              )}
            </Button>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground/70">
              ✨ Where every message is sent with infinite love ✨
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginScreen;