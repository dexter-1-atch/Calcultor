import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SetupScreenProps {
  onSetupComplete: () => void;
}

const SetupScreen: React.FC<SetupScreenProps> = ({ onSetupComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [profile1, setProfile1] = useState({
    displayName: '',
    username: '',
    password: ''
  });

  const [profile2, setProfile2] = useState({
    displayName: '',
    username: '',
    password: ''
  });

  const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const handleSetup = async () => {
    if (!profile1.displayName || !profile1.username || !profile1.password) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in your profile details',
        variant: 'destructive'
      });
      return;
    }

    if (!profile2.displayName || !profile2.username || !profile2.password) {
      toast({
        title: 'Missing Information',
        description: "Please fill in your partner's profile details",
        variant: 'destructive'
      });
      return;
    }

    if (profile1.username === profile2.username) {
      toast({
        title: 'Invalid Usernames',
        description: 'Usernames must be different',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      // Create couple
      const { data: couple, error: coupleError } = await supabase
        .from('couples')
        .insert({ setup_complete: true })
        .select()
        .single();

      if (coupleError) throw coupleError;

      // Hash passwords
      const password1Hash = await hashPassword(profile1.password);
      const password2Hash = await hashPassword(profile2.password);

      // Create both profiles
      const { error: profilesError } = await supabase
        .from('profiles')
        .insert([
          {
            couple_id: couple.id,
            username: profile1.username.toLowerCase(),
            display_name: profile1.displayName,
            password_hash: password1Hash,
            is_creator: true
          },
          {
            couple_id: couple.id,
            username: profile2.username.toLowerCase(),
            display_name: profile2.displayName,
            password_hash: password2Hash,
            is_creator: false
          }
        ]);

      if (profilesError) throw profilesError;

      toast({
        title: 'Setup Complete! 🎉',
        description: 'Both accounts created successfully. You can now login!'
      });

      onSetupComplete();
    } catch (error: any) {
      console.error('Setup error:', error);
      toast({
        title: 'Setup Failed',
        description: error.message || 'Failed to create accounts',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-accent/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-border/50 bg-background/95 backdrop-blur shadow-elegant">
        <CardHeader className="space-y-2">
          <CardTitle className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Setup Your Couple Chat 💕
          </CardTitle>
          <CardDescription className="text-base">
            Create both accounts to start chatting privately
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Profile 1 */}
          <div className="space-y-4 p-4 rounded-lg bg-gradient-primary/10 border border-primary/20">
            <h3 className="font-semibold text-lg text-foreground">Your Profile</h3>
            
            <div className="space-y-2">
              <Label htmlFor="displayName1">Display Name</Label>
              <Input
                id="displayName1"
                placeholder="Your name"
                value={profile1.displayName}
                onChange={(e) => setProfile1({ ...profile1, displayName: e.target.value })}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username1">Username</Label>
              <Input
                id="username1"
                placeholder="username"
                value={profile1.username}
                onChange={(e) => setProfile1({ ...profile1, username: e.target.value })}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password1">Password</Label>
              <Input
                id="password1"
                type="password"
                placeholder="Create password"
                value={profile1.password}
                onChange={(e) => setProfile1({ ...profile1, password: e.target.value })}
                className="h-12"
              />
            </div>
          </div>

          {/* Profile 2 */}
          <div className="space-y-4 p-4 rounded-lg bg-accent/10 border border-accent/20">
            <h3 className="font-semibold text-lg text-foreground">Partner's Profile</h3>
            
            <div className="space-y-2">
              <Label htmlFor="displayName2">Display Name</Label>
              <Input
                id="displayName2"
                placeholder="Partner's name"
                value={profile2.displayName}
                onChange={(e) => setProfile2({ ...profile2, displayName: e.target.value })}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username2">Username</Label>
              <Input
                id="username2"
                placeholder="username"
                value={profile2.username}
                onChange={(e) => setProfile2({ ...profile2, username: e.target.value })}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password2">Password</Label>
              <Input
                id="password2"
                type="password"
                placeholder="Create password"
                value={profile2.password}
                onChange={(e) => setProfile2({ ...profile2, password: e.target.value })}
                className="h-12"
              />
            </div>
          </div>

          <Button 
            onClick={handleSetup}
            disabled={isLoading}
            className="w-full h-12 text-lg font-semibold bg-gradient-primary hover:opacity-90 transition-opacity"
          >
            {isLoading ? 'Creating Accounts...' : 'Create Both Accounts'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SetupScreen;
