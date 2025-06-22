import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

interface ZinkMoviesMirrorResponse {
  success: boolean;
  data?: {
    hubCloudUrl?: string;
  };
  error?: string;
  message?: string;
  remainingRequests?: number;
}

export async function GET(request: NextRequest): Promise<NextResponse<ZinkMoviesMirrorResponse>> {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      return createUnauthorizedResponse(authResult.error || 'Invalid API key') as NextResponse<ZinkMoviesMirrorResponse>;
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json<ZinkMoviesMirrorResponse>(
        { 
          success: false, 
          error: 'URL is required',
          message: 'Please provide a videosaver.me URL'
        },
        { status: 400 }
      );
    }

    // Validate that it's a videosaver URL
    if (!url.includes('videosaver.me/file/')) {
      return NextResponse.json<ZinkMoviesMirrorResponse>(
        { 
          success: false, 
          error: 'Invalid URL',
          message: 'URL must be from videosaver.me/file/'
        },
        { status: 400 }
      );
    }

    console.log('Processing videosaver mirror request for URL:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);
    
    // Extract HubCloud mirror link
    const hubCloudUrl = $('.mirror-buttons a.hubcloud').attr('href');

    if (!hubCloudUrl) {
      return NextResponse.json<ZinkMoviesMirrorResponse>({
        success: false,
        error: 'Mirror link not found',
        message: 'HubCloud mirror link could not be found on the page',
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
      });
    }

    return NextResponse.json<ZinkMoviesMirrorResponse>({
      success: true,
      data: {
        hubCloudUrl
      },
      remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
    });

  } catch (error: unknown) {
    console.error('ZinkMovies mirror API error:', error);
    
    return NextResponse.json<ZinkMoviesMirrorResponse>(
      { 
        success: false, 
        error: 'Failed to extract mirror link',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
