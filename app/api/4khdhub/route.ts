import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';
import { get4kHDHubUrl } from '@/lib/utils/providers';

interface FourKHDHubItem {
  id: string;
  title: string;
  imageUrl: string;
  postUrl: string;
  year?: string;
  season?: string;
  altText: string;
  formats: string[];
  type: 'Movie' | 'Series';
}

interface FourKHDHubResponse {
  success: boolean;
  data?: {
    items: FourKHDHubItem[];
    query?: string;
    totalResults: number;
    page?: number;
  };
  error?: string;
  message?: string;
  remainingRequests?: number;
}

// Function to normalize image URLs
async function normalizeImageUrl(url: string | undefined): Promise<string | undefined> {
  if (!url) return undefined;
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('/')) {
    const baseUrl = await get4kHDHubUrl();
    return baseUrl + url;
  }
  return url;
}

// Function to generate ID from URL
function generateIdFromUrl(url: string): string {
  try {
    const urlParts = url.split('/');
    const relevantPart = urlParts.find(part => 
      part.length > 5 && !part.includes('4khdhub') && !part.includes('fans')
    );
    return relevantPart ? relevantPart.replace(/[^a-zA-Z0-9-]/g, '') : '';
  } catch {
    return '';
  }
}

// Function to determine content type
function determineContentType(formats: string[]): 'Movie' | 'Series' {
  if (formats.some(format => format.toLowerCase().includes('series'))) {
    return 'Series';
  }
  return 'Movie';
}

// Main function to scrape 4KHDHub search results
async function scrape4KHDHubSearch(searchQuery: string): Promise<FourKHDHubItem[]> {
  try {
    const baseUrl = await get4kHDHubUrl();
    const searchUrl = `${baseUrl}/?s=${encodeURIComponent(searchQuery)}`;
    
    console.log(`Searching 4KHDHub with query: ${searchQuery}`);
    console.log(`Search URL: ${searchUrl}`);

    const response = await fetch(searchUrl, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': baseUrl + '/',
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch search results: ${response.status}`);
    }

    const html = await response.text();
    return await parseMovieCards(html);
  } catch (error) {
    console.error('Error scraping 4KHDHub search results:', error);
    throw error;
  }
}

// Function to scrape latest content from homepage
async function scrape4KHDHubHomepage(page: number = 1): Promise<FourKHDHubItem[]> {
  try {
    const baseUrl = await get4kHDHubUrl();
    const url = page === 1 
      ? baseUrl + '/' 
      : `${baseUrl}/page/${page}/`;
    
    console.log(`Fetching 4KHDHub homepage content from: ${url}`);

    const response = await fetch(url, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': baseUrl + '/',
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch homepage content: ${response.status}`);
    }

    const html = await response.text();
    return await parseMovieCards(html);
  } catch (error) {
    console.error('Error scraping 4KHDHub homepage:', error);
    throw error;
  }
}

// Helper function to parse movie cards from HTML
async function parseMovieCards(html: string): Promise<FourKHDHubItem[]> {
  const $ = load(html);
  const items: FourKHDHubItem[] = [];
  const baseUrl = await get4kHDHubUrl();

  // Process movie cards from .card-grid .movie-card elements
  for (const element of $('.card-grid .movie-card').toArray()) {
    const $element = $(element);
    
    // Extract post URL from the anchor tag
    const postUrl = $element.attr('href');
    
    // Extract image from .movie-card-image img
    let imageUrl = $element.find('.movie-card-image img').attr('src');
    imageUrl = await normalizeImageUrl(imageUrl);
    
    // Extract alt text from img
    const altText = $element.find('.movie-card-image img').attr('alt') || '';
    
    // Extract title from .movie-card-title
    const title = $element.find('.movie-card-title').text().trim();
    
    // Extract metadata from .movie-card-meta
    const metaText = $element.find('.movie-card-meta').text().trim();
    
    // Extract year and season info from meta text
    let year: string | undefined;
    let season: string | undefined;
    
    // Parse year (4-digit number)
    const yearMatch = metaText.match(/(\d{4})/);
    if (yearMatch) {
      year = yearMatch[1];
    }
    
    // Parse season info (S01-S02, S01, etc.)
    const seasonMatch = metaText.match(/S\d+(?:-S\d+)?/);
    if (seasonMatch) {
      season = seasonMatch[0];
    }
    
    // Extract formats from .movie-card-format spans
    const formats: string[] = [];
    $element.find('.movie-card-format').each((_, formatElement) => {
      const format = $(formatElement).text().trim();
      if (format) {
        formats.push(format);
      }
    });
    
    // Determine content type
    const type = determineContentType(formats);
    
    if (title && postUrl && imageUrl) {
      // Make postUrl absolute if it's relative
      const absolutePostUrl = postUrl.startsWith('/') ? `${baseUrl}${postUrl}` : postUrl;
      
      // Generate ID from URL
      const id = generateIdFromUrl(absolutePostUrl) || `4khdhub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      items.push({
        id,
        title,
        imageUrl,
        postUrl: absolutePostUrl,
        year,
        season,
        altText,
        formats,
        type
      });
    } else {
      console.log('Skipping incomplete item:', { 
        hasTitle: !!title,
        hasUrl: !!postUrl,
        hasImage: !!imageUrl
      });
    }
  }

  console.log(`Successfully parsed ${items.length} movie cards`);
  return items;
}

export async function GET(request: NextRequest): Promise<NextResponse<FourKHDHubResponse>> {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      return createUnauthorizedResponse(authResult.error || 'Invalid API key') as NextResponse<FourKHDHubResponse>;
    }

    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search') || searchParams.get('s');
    const page = parseInt(searchParams.get('page') || '1');

    if (page < 1) {
      return NextResponse.json<FourKHDHubResponse>(
        { 
          success: false, 
          error: 'Page number must be 1 or greater' 
        },
        { status: 400 }
      );
    }

    console.log('Processing 4KHDHub request:', { searchQuery, page });

    let items: FourKHDHubItem[] = [];

    if (searchQuery && searchQuery.trim()) {
      // Perform search
      items = await scrape4KHDHubSearch(searchQuery.trim());
    } else {
      // Get homepage content
      items = await scrape4KHDHubHomepage(page);
    }

    if (!items || items.length === 0) {
      return NextResponse.json<FourKHDHubResponse>({
        success: false,
        error: 'No content found',
        message: searchQuery 
          ? `No results found for search query: "${searchQuery}"` 
          : `No content found on page ${page}`,
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
      });
    }

    return NextResponse.json<FourKHDHubResponse>({
      success: true,
      data: {
        items,
        query: searchQuery || undefined,
        totalResults: items.length,
        page
      },
      remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
    });

  } catch (error: unknown) {
    console.error('4KHDHub API error:', error);
    
    return NextResponse.json<FourKHDHubResponse>(
      { 
        success: false, 
        error: 'Failed to fetch content from 4KHDHub',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
