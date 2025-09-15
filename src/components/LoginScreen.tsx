import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const LoginScreen: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  const handleUserSelect = (username: string) => {
    setSelectedUser(username);
    setPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !password) return;

    setIsLoading(true);
    const success = await login(selectedUser, password);
    setIsLoading(false);

    if (!success) {
      toast({
        title: "Login Failed",
        description: "Incorrect password. Please try again.",
        variant: "destructive"
      });
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-rose-50 to-purple-50 p-4">
      <Card className="w-full max-w-md shadow-2xl border-pink-200 love-glow animate-fade-in">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold love-gradient bg-clip-text text-transparent animate-heart-beat">
            Private Chat 💕
          </CardTitle>
          <CardDescription className="text-pink-600">Select your name and enter password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Choose your account:</p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={selectedUser === 'serish' ? 'default' : 'outline'}
                onClick={() => handleUserSelect('serish')}
                className="h-12 love-gradient text-white border-pink-300 hover:love-glow"
              >
                UsSeErRish!
              </Button>
              <Button
                variant={selectedUser === 'jiya' ? 'default' : 'outline'}
                onClick={() => handleUserSelect('jiya')}
                className="h-12 love-gradient text-white border-pink-300 hover:love-glow"
              >
                Jiya 💕
              </Button>
            </div>
          </div>

          {selectedUser && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 love-gradient love-glow hover:scale-105 transition-transform" 
                disabled={!password || isLoading}
              >
                {isLoading ? 'Logging in...' : 'Login 💕'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginScreen;