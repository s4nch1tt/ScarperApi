"use client";

import { useSession } from "@/lib/auth-client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type DashboardStats = {
  totalApiCalls: number;
  totalQuota: number;
  activeKeys: number;
  successRate: string;
  lastUsed: string | null;
};

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    if (!isPending && session) {
      fetchStats();
    }
  }, [isPending, session]);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/dashboard/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        toast.error("Failed to load dashboard stats");
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Failed to load dashboard stats");
    } finally {
      setIsLoadingStats(false);
    }
  };

  const getTimeAgo = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  if (isPending || isLoadingStats) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {session?.user?.name || "User"}!
        </h1>
        <p className="text-muted-foreground mt-2">
          Here&apos;s what&apos;s happening with your scraping projects today.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="p-6">
          <div className="flex flex-col space-y-2">
            <span className="text-sm font-medium text-muted-foreground">
              Total API Calls
            </span>
            <span className="text-3xl font-bold">
              {stats?.totalApiCalls.toLocaleString() || "0"}
            </span>
            <span className="text-xs text-muted-foreground">
              Out of {stats?.totalQuota || 0} quota
            </span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex flex-col space-y-2">
            <span className="text-sm font-medium text-muted-foreground">
              Active API Keys
            </span>
            <span className="text-3xl font-bold">
              {stats?.activeKeys || 0}
            </span>
            <span className="text-xs text-muted-foreground">
              1 key maximum
            </span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex flex-col space-y-2">
            <span className="text-sm font-medium text-muted-foreground">
              Quota Usage
            </span>
            <span className="text-3xl font-bold">
              {stats?.successRate || "0.0"}%
            </span>
            <span className="text-xs text-muted-foreground">
              Last used {getTimeAgo(stats?.lastUsed || null)}
            </span>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Stats</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <p className="font-medium">API Key Status</p>
              <p className="text-sm text-muted-foreground">
                {stats?.activeKeys ? `${stats.activeKeys} active key` : "No API keys"}
              </p>
            </div>
            <span className={`text-sm ${stats?.activeKeys ? "text-green-600" : "text-yellow-600"}`}>
              {stats?.activeKeys ? "Active" : "Create Key"}
            </span>
          </div>
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <p className="font-medium">Request Count</p>
              <p className="text-sm text-muted-foreground">
                {stats?.totalApiCalls || 0} requests made
              </p>
            </div>
            <span className="text-sm text-blue-600">
              {stats?.totalQuota ? Math.round((stats.totalApiCalls / stats.totalQuota) * 100) : 0}% used
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Last Activity</p>
              <p className="text-sm text-muted-foreground">
                {getTimeAgo(stats?.lastUsed || null)}
              </p>
            </div>
            <span className="text-sm text-green-600">
              {stats?.lastUsed ? "Recent" : "No activity"}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
