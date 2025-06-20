import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

interface StreamingQuality {
  quality: string;
  url: string;
  default?: boolean;
}

interface MovieDetailsResponse {
  success: boolean;
  data?: StreamingQuality[];
  error?: string;
  message?: string;
  remainingRequests?: number;
}

async function fetchMovieDetails(movieId: string): Promise<StreamingQuality[] | null> {
  try {
    console.log(`Fetching movie details for ID: ${movieId}`);
    
    const response = await fetch(`https://api.watch20.space/api/movie/${movieId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      cache: 'no-cache'
    });

    if (!response.ok) {
      console.error(`Failed to fetch movie details: ${response.status}`);
      return null;
    }

    const data = await response.json();
    console.log('Movie details response:', JSON.stringify(data, null, 2));

    if (!data.results || !Array.isArray(data.results) || data.results.length === 0) {
      console.error('No results found in movie details response');
      return null;
    }

    const movieData = data.results[0];

    if (!movieData.subjectid || !movieData.dp) {
      console.error('Missing subjectid or dp in movie details');
      return null;
    }

    // Construct the streaming URL and fetch actual streaming links
    const streamingUrl = constructStreamingUrl(movieData.subjectid, movieData.dp);
    return await fetchStreamingLinks(streamingUrl);

  } catch (error) {
    console.error('Error fetching movie details:', error);
    return null;
  }
}

function constructStreamingUrl(subjectId: string, dp: string): string {
  const url = `https://netmirror.hair/watchbox/?id=${subjectId}&se=0&ep=0&dp=${dp}`;
  console.log('Constructed streaming URL:', url);
  return url;
}

async function fetchStreamingLinks(streamingUrl: string): Promise<StreamingQuality[] | null> {
  try {
    console.log('Fetching streaming links from:', streamingUrl);
    
    const response = await fetch(streamingUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': 'https://netmirror.art/',
      },
      cache: 'no-cache'
    });

    if (!response.ok) {
      console.error(`Failed to fetch streaming page: ${response.status}`);
      return null;
    }

    const html = await response.text();
    console.log('Streaming page HTML length:', html.length);

    // Extract Artplayer script content
    const scriptMatch = html.match(/<script>[\s\S]*?var art = new Artplayer\({[\s\S]*?}\);[\s\S]*?<\/script>/);
    
    if (!scriptMatch) {
      console.error('No Artplayer script found');
      return null;
    }

    const scriptContent = scriptMatch[0];
    console.log('Found Artplayer script:', scriptContent);

    // Extract quality URLs from the script
    const qualities: StreamingQuality[] = [];
    
    // Extract main URL
    const mainUrlMatch = scriptContent.match(/url:\s*'([^']+)'/);
    if (mainUrlMatch) {
      const proxiedUrl = `/api/netmirror/proxy?url=${encodeURIComponent(mainUrlMatch[1])}`;
      qualities.push({
        quality: 'Default',
        url: proxiedUrl,
        default: true
      });
    }

    // Extract quality array
    const qualityArrayMatch = scriptContent.match(/quality:\s*\[([\s\S]*?)\]/);
    if (qualityArrayMatch) {
      const qualityContent = qualityArrayMatch[1];
      
      // Match individual quality objects
      const qualityMatches = qualityContent.matchAll(/{\s*(?:default:\s*true,\s*)?html:\s*'([^']+)',\s*url:\s*'([^']+)',?\s*}/g);
      
      for (const match of qualityMatches) {
        const isDefault = qualityContent.includes('default: true') && match.index !== undefined;
        const proxiedUrl = `/api/netmirror/proxy?url=${encodeURIComponent(match[2])}`;
        qualities.push({
          quality: match[1],
          url: proxiedUrl,
          default: isDefault
        });
      }
    }

    console.log('Extracted streaming qualities:', JSON.stringify(qualities, null, 2));
    return qualities.length > 0 ? qualities : null;

  } catch (error) {
    console.error('Error fetching streaming links:', error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<MovieDetailsResponse>> {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      return createUnauthorizedResponse(authResult.error || 'Invalid API key') as NextResponse<MovieDetailsResponse>;
    }

    const { id: movieId } = await params;

    if (!movieId) {
      return NextResponse.json<MovieDetailsResponse>(
        { 
          success: false, 
          error: 'Movie ID is required' 
        },
        { status: 400 }
      );
    }

    console.log('Processing movie details request for ID:', movieId);

    const streamingQualities = await fetchMovieDetails(movieId);

    if (!streamingQualities) {
      return NextResponse.json<MovieDetailsResponse>({
        success: false,
        error: 'Movie not found',
        message: `No streaming links found for ID: ${movieId}`,
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
      });
    }

    return NextResponse.json<MovieDetailsResponse>({
      success: true,
      data: streamingQualities,
      remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
    });

  } catch (error: unknown) {
    console.error('Movie details API error:', error);
    
    return NextResponse.json<MovieDetailsResponse>(
      { 
        success: false, 
        error: 'Failed to fetch streaming links',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
