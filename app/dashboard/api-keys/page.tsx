"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Loader2, Key, Plus, Trash2, Eye, EyeOff, Copy, Check, TrendingUp, Activity, Calendar } from 'lucide-react';
import { ApiKey } from '@/lib/db/schema';
import { toast } from 'sonner';

export default function ApiKeysPage() {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [userRequestsUsed, setUserRequestsUsed] = useState(0);
  const [userRequestsLimit, setUserRequestsLimit] = useState(1000);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  const usagePercentage = Math.round((userRequestsUsed / userRequestsLimit) * 100) || 0;
  const remainingRequests = userRequestsLimit - userRequestsUsed;

  useEffect(() => {
    if (user) {
      fetchApiKeys();
    }
  }, [user]);

  const fetchApiKeys = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/api-keys?userId=${user.uid}`);
      const data = await response.json();

      if (data.success) {
        setApiKeys(data.apiKeys || []);
        // Fix: Use the correct data structure from API response
        setUserRequestsUsed(Number(data.userRequestsUsed) || 0);
        setUserRequestsLimit(Number(data.userRequestsLimit) || 1000);
        
        console.log('API Keys data:', {
          requestsUsed: data.userRequestsUsed,
          requestsLimit: data.userRequestsLimit,
          user: data.user
        });
      } else {
        setError(data.error || 'Failed to fetch API keys');
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
      setError('Failed to fetch API keys');
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async () => {
    if (!user || !newKeyName.trim()) return;

    try {
      setCreating(true);
      setError('');

      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          keyName: newKeyName.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setApiKeys([...apiKeys, data.apiKey]);
        setNewKeyName('');
        setIsDialogOpen(false);
      } else {
        setError(data.error || 'Failed to create API key');
      }
    } catch (error) {
      setError('Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const deleteApiKey = async (keyId: string) => {
    if (!user) return;

    try {
      const response = await fetch(`/api/api-keys?userId=${user.uid}&keyId=${keyId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setApiKeys(apiKeys.filter(key => key.id !== keyId));
      } else {
        setError(data.error || 'Failed to delete API key');
      }
    } catch (error) {
      setError('Failed to delete API key');
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    const newVisibleKeys = new Set(visibleKeys);
    if (newVisibleKeys.has(keyId)) {
      newVisibleKeys.delete(keyId);
    } else {
      newVisibleKeys.add(keyId);
    }
    setVisibleKeys(newVisibleKeys);
  };

  const copyToClipboard = async (text: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKeyId(keyId);
      setTimeout(() => setCopiedKeyId(null), 2000);
      
      // Show success toast
      toast.success('API key copied successfully!', {
        description: 'The API key has been copied to your clipboard.',
      });
    } catch (error) {
      console.error('Failed to copy:', error);
      
      // Show error toast
      toast.error('Failed to copy API key', {
        description: 'Please try again or copy manually.',
      });
    }
  };

  const formatKeyValue = (keyValue: string, keyId: string) => {
    if (visibleKeys.has(keyId)) {
      return keyValue;
    }
    return `${keyValue.slice(0, 8)}${'*'.repeat(32)}${keyValue.slice(-8)}`;
  };

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
              <Key className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">API Keys</h1>
              <p className="text-sm text-muted-foreground">Manage your API access</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-1 flex-col gap-6 p-6">
        {/* Usage Overview Section */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Usage Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userRequestsUsed.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                of {userRequestsLimit.toLocaleString()} requests
              </p>
            </CardContent>
          </Card>

          {/* Remaining Requests Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Remaining</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{remainingRequests.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                requests left
              </p>
            </CardContent>
          </Card>

          {/* Usage Percentage Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usage Rate</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usagePercentage}%</div>
              <Progress value={usagePercentage} className="mt-2" />
            </CardContent>
          </Card>

          {/* Active Keys Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Keys</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{apiKeys.filter(key => key.isActive).length}</div>
              <p className="text-xs text-muted-foreground">
                of {apiKeys.length} total keys
              </p>
            </CardContent>
          </Card>
        </div>

        {/* API Keys Management Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  API Keys
                </CardTitle>
                <CardDescription>
                  Create and manage your API keys for accessing our services
                </CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button disabled={userRequestsUsed >= userRequestsLimit}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Key
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New API Key</DialogTitle>
                    <DialogDescription>
                      Give your API key a name to help you identify it later.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="keyName">Key Name</Label>
                      <Input
                        id="keyName"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="My API Key"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={createApiKey}
                      disabled={creating || !newKeyName.trim()}
                    >
                      {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Create Key
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {error && (
              <Alert variant="destructive" className="mx-6 mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span className="text-muted-foreground">Loading API keys...</span>
              </div>
            ) : apiKeys.length === 0 ? (
              <div className="text-center py-12 px-6">
                <div className="w-20 h-20 mx-auto mb-4 bg-muted/50 rounded-full flex items-center justify-center">
                  <Key className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No API Keys</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  You haven't created any API keys yet. Create one to get started with our API services.
                </p>
                <Button 
                  onClick={() => setIsDialogOpen(true)} 
                  size="lg"
                  disabled={userRequestsUsed >= userRequestsLimit}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Key
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-12 px-6">Name</TableHead>
                      <TableHead className="h-12">Key</TableHead>
                      <TableHead className="h-12">Status</TableHead>
                      <TableHead className="h-12">Created</TableHead>
                      <TableHead className="h-12 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map((apiKey) => (
                      <TableRow key={apiKey.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium px-6 py-4">{apiKey.keyName}</TableCell>
                        <TableCell className="font-mono text-sm py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-muted px-2 py-1 rounded">
                              {formatKeyValue(apiKey.keyValue, apiKey.id)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleKeyVisibility(apiKey.id)}
                              className="h-8 w-8 p-0"
                            >
                              {visibleKeys.has(apiKey.id) ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(apiKey.keyValue, apiKey.id)}
                              className="h-8 w-8 p-0"
                            >
                              {copiedKeyId === apiKey.id ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge variant={apiKey.isActive ? "default" : "secondary"} className="font-medium">
                            {apiKey.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(apiKey.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteApiKey(apiKey.id)}
                            className="text-destructive hover:text-destructive-foreground hover:bg-destructive/10 h-8 w-8 p-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage Limit Warning */}
        {usagePercentage >= 80 && (
          <Alert className={usagePercentage >= 100 ? "border-destructive" : "border-orange-500"}>
            <TrendingUp className="h-4 w-4" />
            <AlertDescription>
              {usagePercentage >= 100 
                ? "You've reached your request limit. Some API calls may be restricted."
                : `You've used ${usagePercentage}% of your request limit. Consider monitoring your usage.`
              }
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
