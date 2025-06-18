"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Film, Globe, Key } from "lucide-react";
import AllMoviesDocs from "@/components/ui/allmovies-docs";
import TenBitClubDocs from "@/components/ui/10bitclub-docs";

export default function ApiDocsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <h1 className="text-lg font-semibold">API Documentation</h1>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0 overflow-y-auto">
        <Card>
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Movie Streaming APIs
            </CardTitle>
            <CardDescription className="text-sm">
              Comprehensive documentation for our movie and TV show streaming APIs. Test endpoints, view code examples, and integrate with your applications.
            </CardDescription>
          </CardHeader>
        </Card>

        <Tabs defaultValue="allmovies" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="allmovies" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Globe className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">AllMoviesHub</span>
              <span className="xs:hidden">AllMovies</span>
            </TabsTrigger>
            <TabsTrigger value="10bitclub" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Film className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">10BitClub</span>
              <span className="xs:hidden">10Bit</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="allmovies">
            <AllMoviesDocs apiKey={apiKey} onApiKeyChange={setApiKey} />
          </TabsContent>

          <TabsContent value="10bitclub">
            <TenBitClubDocs apiKey={apiKey} onApiKeyChange={setApiKey} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
