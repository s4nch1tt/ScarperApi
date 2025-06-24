import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

interface EpisodeLink {
  episode: string;
  episodeNumber: number;
  size: string;
  url: string;
}

interface JioStarExtractorResponse {
  success: boolean;
  data?: {
    title?: string;
    episodes: EpisodeLink[];
    totalEpisodes: number;
  };
  error?: string;
  message?: string;
  remainingRequests?: number;
}

// Function to extract episode number from text
function extractEpisodeNumber(text: string): number {
  const episodeMatch = text.match(/EPISODE\s*-?\s*(\d+)/i);
  return episodeMatch ? parseInt(episodeMatch[1]) : 0;
}

// Function to extract size from text
function extractSize(text: string): string {
  const sizeMatch = text.match(/\(([^)]+(?:MB|GB)[^)]*)\)/i);
  return sizeMatch ? sizeMatch[1] : 'Unknown';
}

export async function GET(request: NextRequest): Promise<NextResponse<JioStarExtractorResponse>> {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      return createUnauthorizedResponse(authResult.error || 'Invalid API key') as NextResponse<JioStarExtractorResponse>;
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json<JioStarExtractorResponse>(
        { 
          success: false, 
          error: 'URL is required',
          message: 'Please provide a JioStar URL'
        },
        { status: 400 }
      );
    }

    // Validate that it's a JioStar URL
    if (!url.includes('jiostar.work')) {
      return NextResponse.json<JioStarExtractorResponse>(
        { 
          success: false, 
          error: 'Invalid URL',
          message: 'URL must be from jiostar.work'
        },
        { status: 400 }
      );
    }

    console.log('Processing JioStar extractor request for URL:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': 'https://jiostar.work/',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);

    // Extract the title from the page
    const title = $('h1.entry-title, .entry-title, title').first().text().trim();

    // Extract episode download links
    const episodes: EpisodeLink[] = [];
    
    // Look for episode links in the entry-content area
    $('.entry-content a[href*="videosaver.me/file/"]').each((_, element) => {
      const $link = $(element);
      const url = $link.attr('href');
      const text = $link.find('.mb-text').text().trim() || $link.text().trim();
      
      if (url && text) {
        const episodeNumber = extractEpisodeNumber(text);
        const size = extractSize(text);
        
        if (episodeNumber > 0) {
          episodes.push({
            episode: text,
            episodeNumber,
            size,
            url
          });
        }
      }
    });

    // Also check for maxbutton links pattern
    $('.maxbutton-1 a[href*="videosaver.me/file/"]').each((_, element) => {
      const $link = $(element);
      const url = $link.attr('href');
      const text = $link.find('.mb-text').text().trim() || $link.text().trim();
      
      if (url && text) {
        const episodeNumber = extractEpisodeNumber(text);
        const size = extractSize(text);
        
        if (episodeNumber > 0) {
          // Check if this episode already exists
          const exists = episodes.some(ep => ep.episodeNumber === episodeNumber);
          if (!exists) {
            episodes.push({
              episode: text,
              episodeNumber,
              size,
              url
            });
          }
        }
      }
    });

    // Sort episodes by episode number
    episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);

    if (episodes.length === 0) {
      return NextResponse.json<JioStarExtractorResponse>({
        success: false,
        error: 'No episodes found',
        message: 'No episode download links could be extracted from the provided page',
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
      });
    }

    console.log(`Successfully extracted ${episodes.length} episodes from JioStar page`);

    return NextResponse.json<JioStarExtractorResponse>({
      success: true,
      data: {
        title: title || undefined,
        episodes,
        totalEpisodes: episodes.length
      },
      remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
    });

  } catch (error: unknown) {
    console.error('JioStar extractor API error:', error);
    
    return NextResponse.json<JioStarExtractorResponse>(
      { 
        success: false, 
        error: 'Failed to extract episodes',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
