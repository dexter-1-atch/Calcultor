import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Lock, User } from 'lucide-react';

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
      displayName: 'Serish'
    },
    {
      id: 'jiya',
      name: 'Jiya',
      displayName: 'Jiya'
    }
  ];

  const handleLogin = async () => {
    if (!selectedUser || !password) return;
    
    setIsLoading(true);
    
    const success = await login(selectedUser, password);
    
    if (success) {
      toast({
        title: "Login successful",
        description: "Welcome to the chat!",
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg animate-scale-in hover-lift">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary flex items-center justify-center animate-pulse-glow">
            <MessageSquare className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold animate-fade-in">
            Login to Chat
          </CardTitle>
          <CardDescription className="text-base animate-fade-in-up">
            Choose your profile to continue
          </CardDescription>
        </CardHeader>
        
        <CardContent className="px-6 pb-6">
          <div className="space-y-6">
            <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Select User
              </label>
              
              <div className="grid grid-cols-2 gap-3">
                {users.map((user, index) => (
                  <Button
                    key={user.id}
                    onClick={() => setSelectedUser(user.id)}
                    variant={selectedUser === user.id ? 'default' : 'outline'}
                    className={`h-auto py-6 smooth-transition hover-lift ${
                      selectedUser === user.id
                        ? 'scale-105 shadow-md'
                        : ''
                    }`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center smooth-transition ${
                        selectedUser === user.id
                          ? 'bg-primary-foreground/20 animate-pulse-glow'
                          : 'bg-muted'
                      }`}>
                        <User className="h-5 w-5" />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold">{user.displayName}</p>
                        <p className="text-xs opacity-70">{user.name}</p>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
            
            {selectedUser && (
              <div className="space-y-3 animate-fade-in-up">
                <label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  className="h-11 smooth-transition focus:shadow-lg"
                />
              </div>
            )}
            
            <Button
              onClick={handleLogin}
              disabled={!selectedUser || !password || isLoading}
              className="w-full h-11 font-semibold hover-lift smooth-transition animate-fade-in-up"
              style={{ animationDelay: '0.2s' }}
            >
              {isLoading ? 'Logging in...' : `Login as ${selectedUser ? users.find(u => u.id === selectedUser)?.displayName : ''}`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginScreen;
