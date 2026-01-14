import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

interface SearchResult {
  title: string;
  url: string;
  imageUrl: string;
  provider: string;
  [key: string]: unknown;
}

interface ProviderResults {
  provider: string;
  results: SearchResult[];
  success: boolean;
  error?: string;
}

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Available providers with their search endpoints
const PROVIDERS = [
  { name: "4kHDHub", endpoint: "/api/4khdhub/search" },
  { name: "Movies4u", endpoint: "/api/movies4u/search" },
  { name: "Drive", endpoint: "/api/drive/search" },
  { name: "Vega", endpoint: "/api/vega/search" },
  { name: "ZeeFliz", endpoint: "/api/zeefliz/search" },
  { name: "ZinkMovies", endpoint: "/api/zinkmovies/search" },
];

async function searchProvider(
  providerName: string,
  endpoint: string,
  query: string,
  baseUrl: string
): Promise<ProviderResults> {
  try {
    const searchUrl = `${baseUrl}${endpoint}?q=${encodeURIComponent(query)}`;
    
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      return {
        provider: providerName,
        results: [],
        success: false,
        error: `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    
    // Normalize response format
    const results = data.data || data.results || [];
    
    // Add provider name to each result
    const normalizedResults = results.map((result: Record<string, unknown>) => ({
      ...result,
      provider: providerName,
    })) as SearchResult[];

    return {
      provider: providerName,
      results: normalizedResults,
      success: true,
    };
  } catch (error) {
    console.error(`Error searching ${providerName}:`, error);
    return {
      provider: providerName,
      results: [],
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const useCache = searchParams.get("cache") !== "false";

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    // Generate cache key
    const cacheKey = `global-search:${query.toLowerCase()}`;

    // Check cache if enabled
    if (useCache) {
      try {
        const cachedResults = await redis.get(cacheKey);
        if (cachedResults) {
          console.log(`Cache hit for query: ${query}`);
          return NextResponse.json({
            success: true,
            cached: true,
            query,
            ...(typeof cachedResults === 'object' ? cachedResults : {}),
          });
        }
      } catch (cacheError) {
        console.error("Cache read error:", cacheError);
        // Continue without cache
      }
    }

    // Get base URL for API calls
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    console.log(`Searching across ${PROVIDERS.length} providers for: ${query}`);

    // Search all providers in parallel
    const searchPromises = PROVIDERS.map((provider) =>
      searchProvider(provider.name, provider.endpoint, query, baseUrl)
    );

    const providerResults = await Promise.all(searchPromises);

    // Aggregate all results
    const allResults: SearchResult[] = [];
    const providerSummary: { [key: string]: { count: number; success: boolean; error?: string } } = {};

    providerResults.forEach((providerResult) => {
      providerSummary[providerResult.provider] = {
        count: providerResult.results.length,
        success: providerResult.success,
        ...(providerResult.error && { error: providerResult.error }),
      };

      allResults.push(...providerResult.results);
    });

    // Prepare response
    const response = {
      totalResults: allResults.length,
      providers: providerSummary,
      results: allResults,
      resultsByProvider: providerResults.reduce((acc, pr) => {
        acc[pr.provider] = pr.results;
        return acc;
      }, {} as Record<string, SearchResult[]>),
    };

    // Cache results for 1 hour (3600 seconds)
    if (useCache) {
      try {
        await redis.set(cacheKey, response, { ex: 3600 });
        console.log(`Cached results for query: ${query}`);
      } catch (cacheError) {
        console.error("Cache write error:", cacheError);
        // Continue without caching
      }
    }

    return NextResponse.json({
      success: true,
      cached: false,
      query,
      ...response,
    });

  } catch (error) {
    console.error("Error in global search API:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
