import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

interface Full4MoviesItem {
  id: string;
  title: string;
  imageUrl: string;
  postUrl: string;
  altText: string;
  qualities: string[];
  languages: string[];
  audioFormats: string[];
  isSeries: boolean;
  isDualAudio: boolean;
  isMultiAudio: boolean;
  videoFormats: string[];
  year?: string;
  categories: string[];
}

interface Full4MoviesResponse {
  success: boolean;
  data?: {
    items: Full4MoviesItem[];
    query?: string;
    totalResults: number;
  };
  error?: string;
  message?: string;
  remainingRequests?: number;
}

// Function to normalize image URLs
function normalizeImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('/')) return 'https://1full4movies.monster' + url;
  return url;
}

// Function to extract quality information from title
function extractQualityInfo(title: string): string[] {
  const qualities = [];
  if (title.includes('4K')) qualities.push('4K');
  if (title.includes('2160p')) qualities.push('2160p');
  if (title.includes('1080p')) qualities.push('1080p');
  if (title.includes('720p')) qualities.push('720p');
  if (title.includes('480p')) qualities.push('480p');
  if (title.includes('HDRip') || title.includes('HDR')) qualities.push('HDRip');
  if (title.includes('WEB-HDRip')) qualities.push('WEB-HDRip');
  if (title.includes('BluRay')) qualities.push('BluRay');
  if (title.includes('HDCAM')) qualities.push('HDCAM');
  if (title.includes('WEBRip')) qualities.push('WEBRip');
  return qualities;
}

// Function to extract language information from title
function extractLanguageInfo(title: string): string[] {
  const languages = [];
  if (title.includes('Hindi')) languages.push('Hindi');
  if (title.includes('English')) languages.push('English');
  if (title.includes('Tamil')) languages.push('Tamil');
  if (title.includes('Telugu')) languages.push('Telugu');
  if (title.includes('Malayalam')) languages.push('Malayalam');
  if (title.includes('Kannada')) languages.push('Kannada');
  if (title.includes('Punjabi')) languages.push('Punjabi');
  if (title.includes('Bengali')) languages.push('Bengali');
  if (title.includes('Marathi')) languages.push('Marathi');
  if (title.includes('Multi Audio')) languages.push('Multi Audio');
  return languages;
}

// Function to extract audio format information from title
function extractAudioFormats(title: string): string[] {
  const audioFormats = [];
  if (title.includes('DD5.1') || title.includes('(DD5.1)')) audioFormats.push('DD 5.1');
  if (title.includes('DD2.0') || title.includes('(DD2.0)') || title.includes('(DD 2.0)')) audioFormats.push('DD 2.0');
  if (title.includes('DTS')) audioFormats.push('DTS');
  if (title.includes('Atmos')) audioFormats.push('Atmos');
  if (title.includes('DDP2.0') || title.includes('(DDP2.0)')) audioFormats.push('DDP 2.0');
  return audioFormats;
}

// Function to extract video format information from title
function extractVideoFormats(title: string): string[] {
  const videoFormats = [];
  if (title.includes('x264')) videoFormats.push('x264');
  if (title.includes('x265')) videoFormats.push('x265');
  if (title.includes('HEVC')) videoFormats.push('HEVC');
  if (title.includes('10Bit') || title.includes('10-Bit')) videoFormats.push('10-Bit');
  if (title.includes('WEB-DL')) videoFormats.push('WEB-DL');
  if (title.includes('WEBRip')) videoFormats.push('WEBRip');
  if (title.includes('BluRay')) videoFormats.push('BluRay');
  if (title.includes('HDRip')) videoFormats.push('HDRip');
  if (title.includes('HDTV')) videoFormats.push('HDTV');
  if (title.includes('Pre-DVDRip')) videoFormats.push('Pre-DVDRip');
  return videoFormats;
}

// Function to check if content is a series
function isSeries(title: string): boolean {
  return title.includes('Season') || 
         title.includes('S01') || title.includes('S02') || title.includes('S03') ||
         title.includes('EP ') || title.includes('Episode') ||
         title.includes('Web Series') ||
         title.includes('[ADDED EP') ||
         title.includes('[EP ');
}

// Function to check if content has dual audio
function isDualAudio(title: string): boolean {
  return title.includes('Dual Audio') || 
         title.includes('+ Hindi') ||
         title.includes('+ English') ||
         (title.includes('Hindi') && title.includes('English'));
}

// Function to check if content has multi audio
function isMultiAudio(title: string): boolean {
  return title.includes('Multi Audio') ||
         title.includes('+ Hindi+ Tamil + Kannada + Malayalam') ||
         title.includes('+ Telugu + Hindi') ||
         (title.match(/\+/g) || []).length >= 2; // Multiple + signs indicate multi-audio
}

// Function to extract year from title
function extractYear(title: string): string | undefined {
  const yearMatch = title.match(/\((\d{4})\)/);
  return yearMatch ? yearMatch[1] : undefined;
}

// Function to extract categories from article classes
function extractCategories(classStr: string): string[] {
  const categories = [];
  
  if (classStr.includes('web-series')) categories.push('Web Series');
  if (classStr.includes('dual-audio')) categories.push('Dual Audio');
  if (classStr.includes('multi-audio')) categories.push('Multi Audio');
  if (classStr.includes('featured')) categories.push('Featured');
  if (classStr.includes('new-releases-movies')) categories.push('New Releases');
  if (classStr.includes('hollywood-movies')) categories.push('Hollywood');
  if (classStr.includes('bollywood-movies')) categories.push('Bollywood');
  if (classStr.includes('tamil-movies')) categories.push('Tamil');
  if (classStr.includes('telugu-movies') || classStr.includes('new-telugu-movies')) categories.push('Telugu');
  if (classStr.includes('malayalam-movies')) categories.push('Malayalam');
  if (classStr.includes('kannada-movies')) categories.push('Kannada');
  if (classStr.includes('punjabi-movies')) categories.push('Punjabi');
  if (classStr.includes('south-indian-hindi-dubbed-movies')) categories.push('South Indian');
  if (classStr.includes('300mb-movies-list')) categories.push('300MB');
  if (classStr.includes('hevc-720p')) categories.push('HEVC 720p');
  if (classStr.includes('unofficial-dubbed')) categories.push('Unofficial Dubbed');
  if (classStr.includes('webtv')) categories.push('Web TV');
  
  return categories;
}

// Function to generate ID from URL
function generateIdFromUrl(url: string): string {
  try {
    const urlParts = url.split('/');
    const relevantPart = urlParts.find(part => 
      part.length > 5 && !part.includes('1full4movies.monster')
    );
    return relevantPart ? relevantPart.replace(/[^a-zA-Z0-9-]/g, '') : '';
  } catch {
    return '';
  }
}

// Main function to scrape 1Full4Movies search results
async function scrape1Full4MoviesSearch(searchQuery: string): Promise<Full4MoviesItem[]> {
  try {
    const searchUrl = `https://1full4movies.monster/?s=${encodeURIComponent(searchQuery)}`;
    
    console.log(`Searching 1Full4Movies with query: ${searchQuery}`);
    console.log(`Search URL: ${searchUrl}`);

    const response = await fetch(searchUrl, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://1full4movies.monster/',
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch search results: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);
    const items: Full4MoviesItem[] = [];

    // Process search results from .posts-wrapper article elements
    $('.posts-wrapper article').each((_, element) => {
      const $element = $(element);
      
      // Extract post ID from article id attribute
      const articleId = $element.attr('id') || '';
      const postId = articleId.replace('post-', '');
      
      // Extract categories from article class
      const articleClasses = $element.attr('class') || '';
      const categories = extractCategories(articleClasses);
      
      // Extract image from .nv-post-thumbnail-wrap img
      let imageUrl = $element.find('.nv-post-thumbnail-wrap img').attr('src');
      imageUrl = normalizeImageUrl(imageUrl);
      
      // Extract alt text from img
      const altText = $element.find('.nv-post-thumbnail-wrap img').attr('alt') || '';
      
      // Extract title from .blog-entry-title a
      const title = $element.find('.blog-entry-title a').text().trim();
      
      // Extract post URL from .blog-entry-title a or .nv-post-thumbnail-wrap a
      const postUrl = $element.find('.blog-entry-title a').attr('href') || 
                     $element.find('.nv-post-thumbnail-wrap a').attr('href');
      
      if (title && postUrl && imageUrl) {
        // Extract all the metadata from the title
        const qualities = extractQualityInfo(title);
        const languages = extractLanguageInfo(title);
        const audioFormats = extractAudioFormats(title);
        const videoFormats = extractVideoFormats(title);
        const isSeriesContent = isSeries(title);
        const isDualAudioContent = isDualAudio(title);
        const isMultiAudioContent = isMultiAudio(title);
        const year = extractYear(title);
        
        // Generate ID from URL or use post ID
        const id = generateIdFromUrl(postUrl) || postId || `1full4movies-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        items.push({
          id,
          title,
          imageUrl,
          postUrl,
          altText,
          qualities,
          languages,
          audioFormats,
          isSeries: isSeriesContent,
          isDualAudio: isDualAudioContent,
          isMultiAudio: isMultiAudioContent,
          videoFormats,
          year,
          categories
        });
      } else {
        console.log('Skipping incomplete item:', { 
          hasTitle: !!title,
          hasUrl: !!postUrl,
          hasImage: !!imageUrl
        });
      }
    });

    console.log(`Successfully parsed ${items.length} search results for query: ${searchQuery}`);
    return items;
  } catch (error) {
    console.error('Error scraping 1Full4Movies search results:', error);
    throw error;
  }
}

// Function to scrape latest content from homepage
async function scrape1Full4MoviesHomepage(page: number = 1): Promise<Full4MoviesItem[]> {
  try {
    const url = page === 1 
      ? 'https://1full4movies.monster/' 
      : `https://1full4movies.monster/page/${page}/`;
    
    console.log(`Fetching 1Full4Movies homepage content from: ${url}`);

    const response = await fetch(url, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://1full4movies.monster/',
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch homepage content: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);
    const items: Full4MoviesItem[] = [];

    // Process content from .posts-wrapper article elements
    $('.posts-wrapper article').each((_, element) => {
      const $element = $(element);
      
      const articleId = $element.attr('id') || '';
      const postId = articleId.replace('post-', '');
      
      const articleClasses = $element.attr('class') || '';
      const categories = extractCategories(articleClasses);
      
      let imageUrl = $element.find('.nv-post-thumbnail-wrap img').attr('src');
      imageUrl = normalizeImageUrl(imageUrl);
      
      const altText = $element.find('.nv-post-thumbnail-wrap img').attr('alt') || '';
      const title = $element.find('.blog-entry-title a').text().trim();
      const postUrl = $element.find('.blog-entry-title a').attr('href') || 
                     $element.find('.nv-post-thumbnail-wrap a').attr('href');
      
      if (title && postUrl && imageUrl) {
        const qualities = extractQualityInfo(title);
        const languages = extractLanguageInfo(title);
        const audioFormats = extractAudioFormats(title);
        const videoFormats = extractVideoFormats(title);
        const isSeriesContent = isSeries(title);
        const isDualAudioContent = isDualAudio(title);
        const isMultiAudioContent = isMultiAudio(title);
        const year = extractYear(title);
        
        const id = generateIdFromUrl(postUrl) || postId || `1full4movies-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        items.push({
          id,
          title,
          imageUrl,
          postUrl,
          altText,
          qualities,
          languages,
          audioFormats,
          isSeries: isSeriesContent,
          isDualAudio: isDualAudioContent,
          isMultiAudio: isMultiAudioContent,
          videoFormats,
          year,
          categories
        });
      }
    });

    console.log(`Successfully parsed ${items.length} homepage items`);
    return items;
  } catch (error) {
    console.error('Error scraping 1Full4Movies homepage:', error);
    throw error;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<Full4MoviesResponse>> {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      return createUnauthorizedResponse(authResult.error || 'Invalid API key') as NextResponse<Full4MoviesResponse>;
    }

    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search') || searchParams.get('s');
    const page = parseInt(searchParams.get('page') || '1');

    if (page < 1) {
      return NextResponse.json<Full4MoviesResponse>(
        { 
          success: false, 
          error: 'Page number must be 1 or greater' 
        },
        { status: 400 }
      );
    }

    console.log('Processing 1Full4Movies request:', { searchQuery, page });

    let items: Full4MoviesItem[] = [];

    if (searchQuery && searchQuery.trim()) {
      // Perform search
      items = await scrape1Full4MoviesSearch(searchQuery.trim());
    } else {
      // Get homepage content
      items = await scrape1Full4MoviesHomepage(page);
    }

    if (!items || items.length === 0) {
      return NextResponse.json<Full4MoviesResponse>({
        success: false,
        error: 'No content found',
        message: searchQuery 
          ? `No results found for search query: "${searchQuery}"` 
          : `No content found on page ${page}`,
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
      });
    }

    return NextResponse.json<Full4MoviesResponse>({
      success: true,
      data: {
        items,
        query: searchQuery || undefined,
        totalResults: items.length
      },
      remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
    });

  } catch (error: unknown) {
    console.error('1Full4Movies API error:', error);
    
    return NextResponse.json<Full4MoviesResponse>(
      { 
        success: false, 
        error: 'Failed to fetch content from 1Full4Movies',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
