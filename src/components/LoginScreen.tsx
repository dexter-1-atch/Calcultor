import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const LoginScreen: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  const handleLogin = async () => {
    if (!username || !password) {
      toast({
        title: 'Missing Information',
        description: 'Please enter both username and password',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    const success = await login(username, password);

    if (success) {
      toast({
        title: 'Welcome back! 💕',
        description: 'You are now logged in'
      });
    } else {
      toast({
        title: 'Login Failed',
        description: 'Invalid username or password',
        variant: 'destructive'
      });
    }

    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-accent/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/50 bg-background/95 backdrop-blur shadow-elegant">
        <CardHeader className="space-y-2">
          <CardTitle className="text-3xl font-bold text-center bg-gradient-primary bg-clip-text text-transparent">
            Welcome Back 💕
          </CardTitle>
          <CardDescription className="text-center text-base">
            Login to continue your chat
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={handleKeyPress}
                className="h-12"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                className="h-12"
              />
            </div>
          </div>

          <Button 
            onClick={handleLogin}
            disabled={isLoading || !username || !password}
            className="w-full h-12 text-lg font-semibold bg-gradient-primary hover:opacity-90 transition-opacity"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginScreen;
