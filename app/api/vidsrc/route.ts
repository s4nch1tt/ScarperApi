import axios from "axios";
import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
};

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}

async function extractVidsrcStream(vidsrcUrl: string): Promise<string> {
  console.log(`Processing vidsrc.icu URL: ${vidsrcUrl}`);

  // Make request to the vidsrc.icu embed URL
  const response = await axios.get(vidsrcUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Referer": "https://vidsrc.icu/",
      "Upgrade-Insecure-Requests": "1",
      "Cache-Control": "max-age=0"
    },
    timeout: 15000
  });

  // Extract iframe src from the response
  const iframeRegex = /<iframe[^>]*id="videoIframe"[^>]*src="([^"]*)"[^>]*>/i;
  const match = response.data.match(iframeRegex);

  if (!match || !match[1]) {
    // Try alternative iframe pattern
    const altIframeRegex = /<iframe[^>]*src="([^"]*)"[^>]*id="videoIframe"[^>]*>/i;
    const altMatch = response.data.match(altIframeRegex);
    
    if (!altMatch || !altMatch[1]) {
      throw new Error("Iframe source not found");
    }
  }

  const iframeSrc = match ? match[1] : response.data.match(/<iframe[^>]*src="([^"]*)"[^>]*id="videoIframe"[^>]*>/i)?.[1];
  
  if (!iframeSrc) {
    throw new Error("Iframe source not found");
  }

  console.log(`Found iframe source: ${iframeSrc}`);

  // Make second request to the iframe URL
  const fullIframeSrc = iframeSrc.startsWith('//') ? `https:${iframeSrc}` : iframeSrc;
  
  const iframeResponse = await axios.get(fullIframeSrc, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Referer": vidsrcUrl,
    },
    timeout: 15000
  });

  // Parse the iframe response and extract div with id="the_frame"
  const $ = cheerio.load(iframeResponse.data);
  const theFrameDiv = $('#the_frame');

  if (theFrameDiv.length === 0) {
    throw new Error("Div with id 'the_frame' not found");
  }

  // Get the complete HTML of the div including its contents
  const frameContent = $.html(theFrameDiv);
  
  // Decode HTML entities and extract the iframe src
  const decodedContent = frameContent
    .replace(/\\u003C/g, '<')
    .replace(/\\u003E/g, '>')
    .replace(/\\/g, '')
    .replace(/&quot;/g, '"');

  // Extract the iframe src from the decoded content
  const iframeSrcRegex = /src="([^"]+)"/i;
  const iframeSrcMatch = decodedContent.match(iframeSrcRegex);
  
  let cleanIframeSrc = '';
  if (iframeSrcMatch && iframeSrcMatch[1]) {
    cleanIframeSrc = iframeSrcMatch[1];
    // Convert relative URL to absolute URL
    if (cleanIframeSrc.startsWith('//')) {
      cleanIframeSrc = `https:${cleanIframeSrc}`;
    }
  }

  // Make third request to the clean iframe URL to get the final src
  const finalResponse = await axios.get(cleanIframeSrc, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Referer": "https://vidsrcme.vidsrc.icu/",
    },
    timeout: 15000
  });

  // Extract the src URL from the loadIframe function
  const loadIframeRegex = /src:\s*['"]([^'"]+)['"]/i;
  const loadIframeMatch = finalResponse.data.match(loadIframeRegex);
  
  let finalSrc = '';
  if (loadIframeMatch && loadIframeMatch[1]) {
    finalSrc = loadIframeMatch[1];
    
    // Convert relative URL to absolute URL
    if (finalSrc.startsWith('/')) {
      const baseUrl = new URL(cleanIframeSrc);
      finalSrc = `${baseUrl.protocol}//${baseUrl.host}${finalSrc}`;
    }
  }

  // Make fourth request to get the m3u8 stream URL
  const streamResponse = await axios.get(finalSrc, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Referer": cleanIframeSrc,
    },
    timeout: 15000
  });

  // Extract the m3u8 URL from the Playerjs configuration
  const playerjsRegex = /file:\s*['"]([^'"]*\.m3u8[^'"]*)['"]/i;
  const playerjsMatch = streamResponse.data.match(playerjsRegex);
  
  let m3u8Url = '';
  if (playerjsMatch && playerjsMatch[1]) {
    m3u8Url = playerjsMatch[1];
    
    // Convert relative URL to absolute URL if needed
    if (m3u8Url.startsWith('//')) {
      m3u8Url = `https:${m3u8Url}`;
    } else if (m3u8Url.startsWith('/')) {
      const baseUrl = new URL(finalSrc);
      m3u8Url = `${baseUrl.protocol}//${baseUrl.host}${m3u8Url}`;
    }
  }

  return m3u8Url;
}

export async function GET(request: Request) {
  try {
    // Validate API key first
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      console.log('API key validation failed:', authResult.error);
      return createUnauthorizedResponse(authResult.error || 'Invalid API key');
    }

    console.log('API key validated successfully for VidSrc request');

    const { searchParams } = new URL(request.url);
    const tmdbId = searchParams.get('id');
    const type = searchParams.get('type') || 'movie'; // 'movie' or 'tv'
    const season = searchParams.get('season');
    const episode = searchParams.get('episode');

    if (!tmdbId) {
      return NextResponse.json(
        { 
          success: false,
          error: "Missing required parameter: id (TMDB ID)",
          example: "/api/vidsrc?id=299536&type=movie or /api/vidsrc?id=94605&type=tv&season=1&episode=1"
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate type parameter
    if (type !== 'movie' && type !== 'tv') {
      return NextResponse.json(
        { 
          success: false,
          error: "Invalid type parameter. Must be 'movie' or 'tv'",
          example: "/api/vidsrc?id=299536&type=movie"
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate TV series parameters
    if (type === 'tv') {
      if (!season || !episode) {
        return NextResponse.json(
          { 
            success: false,
            error: "For TV series, both season and episode parameters are required",
            example: "/api/vidsrc?id=94605&type=tv&season=1&episode=1"
          },
          { status: 400, headers: corsHeaders }
        );
      }

      // Validate season and episode are numbers
      if (isNaN(parseInt(season)) || isNaN(parseInt(episode))) {
        return NextResponse.json(
          { 
            success: false,
            error: "Season and episode must be valid numbers",
            example: "/api/vidsrc?id=94605&type=tv&season=1&episode=1"
          },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Construct vidsrc.icu URL based on type
    let vidsrcUrl: string;
    
    if (type === 'movie') {
      vidsrcUrl = `https://vidsrc.icu/embed/movie/${tmdbId}`;
    } else {
      // TV series
      vidsrcUrl = `https://vidsrc.icu/embed/tv/${tmdbId}/${season}/${episode}`;
    }

    console.log(`Constructed vidsrc URL: ${vidsrcUrl}`);

    try {
      const m3u8Url = await extractVidsrcStream(vidsrcUrl);

      if (!m3u8Url) {
        return NextResponse.json(
          { 
            success: false,
            error: "Failed to extract streaming URL",
            tmdbId,
            type,
            ...(type === 'tv' && { season, episode })
          },
          { status: 404, headers: corsHeaders }
        );
      }

      return NextResponse.json(
        { 
          success: true,
          data: {
            streamUrl: m3u8Url,
            tmdbId,
            type,
            ...(type === 'tv' && { season: parseInt(season!), episode: parseInt(episode!) }),
            Referer: "https://cloudnestra.com/",
            Origin: "https://cloudnestra.com"
          },
          remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed - 1) : 0
        },
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );

    } catch (extractError) {
      console.error("Error extracting stream from vidsrc:", extractError);
      
      return NextResponse.json(
        { 
          success: false,
          error: "Failed to extract streaming URL from vidsrc.icu",
          details: extractError instanceof Error ? extractError.message : 'Unknown extraction error',
          tmdbId,
          type,
          ...(type === 'tv' && { season, episode }),
          vidsrcUrl
        },
        { 
          status: 500, 
          headers: corsHeaders 
        }
      );
    }

  } catch (error: any) {
    console.error("VidSrc API error:", error.message);
    return NextResponse.json(
      { 
        success: false,
        error: "Internal server error", 
        message: error.message 
      },
      { 
        status: 500, 
        headers: corsHeaders 
      }
    );
  }
}
