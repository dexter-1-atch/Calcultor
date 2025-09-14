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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Private Chat</CardTitle>
          <CardDescription>Select your name and enter password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Choose your account:</p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={selectedUser === 'serish' ? 'default' : 'outline'}
                onClick={() => handleUserSelect('serish')}
                className="h-12"
              >
                Serish
              </Button>
              <Button
                variant={selectedUser === 'jiya' ? 'default' : 'outline'}
                onClick={() => handleUserSelect('jiya')}
                className="h-12"
              >
                Jiya
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
                className="w-full h-12" 
                disabled={!password || isLoading}
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginScreen;