import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { getBaseUrl } from "@/lib/baseurl";
import { validateApiKey, createUnauthorizedResponse } from "@/lib/api-auth";

interface Movie {
  id: string;
  title: string;
  url: string;
  image: string;
  imageAlt: string;
}

interface KMMoviesSearchResponse {
  success: boolean;
  data?: {
    query: string;
    results: Movie[];
    totalResults: number;
  };
  error?: string;
}

export async function GET(request: NextRequest) {
  // Validate API key
  const validation = await validateApiKey(request);
  if (!validation.valid) {
    return createUnauthorizedResponse(validation.error || "Unauthorized");
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ;

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: "Query parameter is required",
        } as KMMoviesSearchResponse,
        { status: 400 }
      );
    }

    // Get base URL from baseurl.ts
    const baseUrl = await getBaseUrl("KMMovies");
    const searchUrl = `${baseUrl}/?s=${encodeURIComponent(query)}`;

    // Fetch the search results page
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch search results: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const results: Movie[] = [];

    // Parse search result articles
    $("article.post").each((_, element) => {
      const article = $(element);
      const id = article.attr("id")?.replace("post-", "") || "";
      const link = article.find("figure a.post-thumbnail, h3.entry-title a").first();
      const url = link.attr("href") || article.find("h3.entry-title a").attr("href") || "";
      const image = article.find("figure img").attr("src") || "";
      const imageAlt = article.find("figure img").attr("alt") || "";
      const title = article.find("h3.entry-title a").text().trim() || imageAlt;

      if (id && url && title) {
        results.push({
          id,
          title,
          url,
          image,
          imageAlt,
        });
      }
    });

    const responseData: KMMoviesSearchResponse = {
      success: true,
      data: {
        query,
        results,
        totalResults: results.length,
      },
    };

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    console.error("Error searching KMMovies:", error);

    const errorResponse: KMMoviesSearchResponse = {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to search movies",
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
