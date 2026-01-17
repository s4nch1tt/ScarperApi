"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState, useEffect } from "react";
import { ALL_PROVIDERS, type ProviderName } from "@/lib/provider-cache";
import { useIsMobile } from "@/hooks/use-mobile";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  const [enabledProviders, setEnabledProviders] = useState<ProviderName[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdultConfirm, setShowAdultConfirm] = useState(false);
  const [showProviderManagement, setShowProviderManagement] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const res = await fetch("/api/providers/settings");
      if (res.ok) {
        const data = await res.json();
        setEnabledProviders(data.enabledProviders || []);
      }
    } catch (error) {
      console.error("Error fetching providers:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleProvider = (provider: ProviderName) => {
    if (provider === "Adult" && !enabledProviders.includes("Adult")) {
      setShowAdultConfirm(true);
      return;
    }
    
    setEnabledProviders((prev) =>
      prev.includes(provider)
        ? prev.filter((p) => p !== provider)
        : [...prev, provider]
    );
  };

  const handleAdultConfirm = () => {
    setEnabledProviders((prev) => [...prev, "Adult"]);
    setShowAdultConfirm(false);
  };

  const saveProviders = async () => {
    setSaving(true);
    try {
      const hasAdult = enabledProviders.includes("Adult");
      const res = await fetch("/api/providers/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          enabledProviders,
          adultConsent: hasAdult 
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setEnabledProviders(data.enabledProviders);
        setShowProviderManagement(false);
        alert("Provider settings saved successfully");
      } else {
        alert("Failed to save provider settings");
      }
    } catch (error) {
      console.error("Error saving providers:", error);
      alert("Failed to save provider settings");
    } finally {
      setSaving(false);
    }
  };

  const providersList = (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Enable or disable content providers for API access
      </p>
      {!loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ALL_PROVIDERS.map((provider) => (
            <div 
              key={provider} 
              className={`flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors ${
                provider === "Adult" ? "border-red-500/50" : ""
              }`}
            >
              <div className="flex-1">
                <Label className="cursor-pointer font-medium flex items-center gap-2">
                  {provider}
                  {provider === "Adult" && (
                    <span className="text-xs text-red-500">(18+)</span>
                  )}
                </Label>
              </div>
              <Switch
                checked={enabledProviders.includes(provider)}
                onCheckedChange={() => toggleProvider(provider)}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Loading...</p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Providers</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {enabledProviders.length} of {ALL_PROVIDERS.length} providers enabled
            </p>
          </div>
          <Button 
            onClick={() => setShowProviderManagement(true)}
            variant="outline"
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Manage Providers
          </Button>
        </div>
      </Card>

      {isMobile ? (
        <Drawer open={showProviderManagement} onOpenChange={setShowProviderManagement}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Manage Providers</DrawerTitle>
              <DrawerDescription>
                Enable or disable content providers for API access
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 max-h-[60vh] overflow-y-auto">
              {providersList}
            </div>
            <DrawerFooter>
              <Button onClick={saveProviders} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={showProviderManagement} onOpenChange={setShowProviderManagement}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Providers</DialogTitle>
              <DialogDescription>
                Enable or disable content providers for API access
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {providersList}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowProviderManagement(false)}
              >
                Cancel
              </Button>
              <Button onClick={saveProviders} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={showAdultConfirm} onOpenChange={setShowAdultConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Adult Content Confirmation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you 18 years or older? By enabling this provider, you confirm that you are at least 18 years of age and agree to access adult content. This action will be logged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAdultConfirm} className="bg-red-600 hover:bg-red-700">
              Yes, I am 18+
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
