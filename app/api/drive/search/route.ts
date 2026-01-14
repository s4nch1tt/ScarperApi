import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/baseurl";
import * as cheerio from "cheerio";

interface SearchResult {
  title: string;
  url: string;
  imageUrl: string;
  quality: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    const baseUrl = await getBaseUrl("drive");
    const encodedQuery = query.replace(/\s+/g, "+");
    const searchUrl = `${baseUrl}search.html?q=${encodedQuery}`;

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Cookie": "_gid=GA1.2.1940160670.1768385387; _ga=GA1.1.968681502.1767881093; _ga_YLNESKK47K=GS2.1.s1768385387$o3$g1$t1768388135$j56$l0$h0",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch search results from Drive" },
        { status: response.status }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const results: SearchResult[] = [];

    $("#results-grid .poster-card").each((_, element) => {
      const $card = $(element);
      const $link = $card.parent("a");
      const $img = $card.find(".poster-image img");
      
      const title = $img.attr("alt") || $card.find(".poster-title").text().trim();
      const url = $link.attr("href") || '';
      const imageUrl = $img.attr("src") || $img.attr("data-src") || '';
      const quality = $card.find(".quality-badge, .video-label").text().trim();

      if (title && url) {
        results.push({
          title,
          url: url.startsWith('http') ? url : `${baseUrl}${url}`,
          imageUrl,
          quality,
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: results,
      searchQuery: query,
      resultsCount: results.length,
    });

  } catch (error) {
    console.error("Error in Drive search API:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
