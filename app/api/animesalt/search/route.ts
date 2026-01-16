import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/baseurl";
import * as cheerio from "cheerio";
import { validateApiKey, createUnauthorizedResponse } from "@/lib/api-auth";

interface SearchResult {
  title: string;
  url: string;
  image: string;
  type: "series" | "movie" | "unknown";
  year?: string;
}

export async function GET(req: NextRequest) {
  // Validate API key
  const validation = await validateApiKey(req);
  if (!validation.valid) {
    return createUnauthorizedResponse(validation.error || "Unauthorized");
  }

  try {
    const searchParams = req.nextUrl.searchParams;
    const q = searchParams.get("q");

    if (!q) {
      return NextResponse.json(
        { error: "Query parameter is required" },
        { status: 400 }
      );
    }

    const baseUrl = await getBaseUrl("animesalt");
    const searchUrl = `${baseUrl}/?s=${encodeURIComponent(q).replace(/%20/g, '+')}`;

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: ${response.statusText}` },
        { status: response.status }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const results: SearchResult[] = [];

    // Parse search results from the post list
    $(".post-lst li").each((_, element) => {
      const $item = $(element);
      const $article = $item.find("article");
      
      const title = $item.find(".entry-title").text().trim();
      const url = $item.find("a.lnk-blk").attr("href") || "";
      let image =
        $item.find(".post-thumbnail img").attr("data-src") ||
        $item.find(".post-thumbnail img").attr("src") ||
        "";
      
      // Filter out lazy load placeholder
      if (image.startsWith("data:image/svg+xml")) {
        image = $item.find(".post-thumbnail img").attr("data-src") || "";
      }
      // Add protocol if missing
      if (image.startsWith("//")) {
        image = "https:" + image;
      }

      // Determine type from li class attributes
      let type: "series" | "movie" | "unknown" = "unknown";
      const itemClass = $item.attr("class") || "";
      if (itemClass.includes("type-series")) {
        type = "series";
      } else if (itemClass.includes("type-movies")) {
        type = "movie";
      }

      // Extract year from class (annee-XXXX)
      const yearMatch = itemClass.match(/annee-(\d+)/);
      const year = yearMatch ? yearMatch[1] : undefined;

      if (title && url) {
        results.push({
          title,
          url: url.startsWith("http") ? url : `${baseUrl}${url}`,
          image,
          type,
          year: year || undefined,
        });
      }
    });

    return NextResponse.json({
      success: true,
      q,
      results,
      count: results.length,
    });
  } catch (error) {
    console.error("Error in animesalt search API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
