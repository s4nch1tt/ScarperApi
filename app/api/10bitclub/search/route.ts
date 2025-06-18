import { NextResponse } from 'next/server';
import { load } from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

// Function to normalize image URLs
function normalizeImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('/')) return 'https://10bitclub.xyz' + url;
  return url;
}

// Function to extract content type from elements
function extractContentType(element: any): string {
  const $ = load('');
  const $element = $(element);
  
  // Check for TV show indicator
  if ($element.find('.tvshows').length > 0) return 'TV Show';
  if ($element.find('.movies').length > 0) return 'Movie';
  
  // Check URL patterns
  const url = $element.find('a').first().attr('href') || '';
  if (url.includes('/tvshows/')) return 'TV Show';
  if (url.includes('/movies/')) return 'Movie';
  
  return 'Unknown';
}

// Function to search 10BitClub content
async function search10BitClubData(searchQuery: string) {
  try {
    const searchUrl = `https://10bitclub.xyz/?s=${encodeURIComponent(searchQuery)}`;
    
    console.log(`Searching 10BitClub with query: ${searchQuery}`);
    console.log(`Search URL: ${searchUrl}`);

    const response = await fetch(searchUrl, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://10bitclub.xyz/'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch search results: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);
    const results = [];

    // Parse search results from .result-item elements
    $('.result-item').each((_, element) => {
      const $element = $(element);
      const $article = $element.find('article');
      
      // Extract image URL
      let imageUrl = $article.find('.image .thumbnail img').attr('src');
      imageUrl = normalizeImageUrl(imageUrl);
      
      // Extract title and URL
      const titleElement = $article.find('.details .title a');
      const title = titleElement.text().trim();
      const postUrl = titleElement.attr('href');
      
      // Extract content type (TV Show or Movie)
      const contentTypeSpan = $article.find('.image .thumbnail span');
      let contentType = 'Movie'; // default
      if (contentTypeSpan.hasClass('tvshows') || contentTypeSpan.text().includes('TV')) {
        contentType = 'TV Show';
      }
      
      // Extract rating
      const ratingElement = $article.find('.details .meta .rating');
      const rating = ratingElement.text().replace('IMDb', '').trim();
      
      // Extract year
      const yearElement = $article.find('.details .meta .year');
      const year = yearElement.text().trim();
      
      // Extract description/content
      const description = $article.find('.details .contenido p').text().trim();
      
      if (title && postUrl) {
        results.push({
          title,
          postUrl,
          imageUrl,
          contentType,
          rating: rating || null,
          year: year || null,
          description: description || null,
          isTV: contentType === 'TV Show',
          website: '10BitClub'
        });
      } else {
        console.log('Skipping incomplete search result:', { 
          hasTitle: !!title,
          hasUrl: !!postUrl,
          elementHTML: $element.html()?.substring(0, 100) + '...'
        });
      }
    });

    console.log(`Successfully parsed ${results.length} search results for query: ${searchQuery}`);
    return results;
  } catch (error) {
    console.error('Error searching 10BitClub data:', error);
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    // Validate API key first
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      console.log('API key validation failed:', authResult.error);
      return createUnauthorizedResponse(authResult.error || 'Invalid API key');
    }

    console.log('API key validated successfully for 10BitClub search request');

    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('q') || searchParams.get('search');

    if (!searchQuery || !searchQuery.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Search query parameter is required',
        example: '/api/10bitclub/search?q=avengers'
      }, {
        status: 400
      });
    }

    try {
      const results = await search10BitClubData(searchQuery.trim());

      return NextResponse.json({
        success: true,
        query: searchQuery.trim(),
        count: results.length,
        results,
        website: '10BitClub',
        searchUrl: `https://10bitclub.xyz/?s=${encodeURIComponent(searchQuery.trim())}`,
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed - 1) : 0
      });
    } catch (scrapeError) {
      console.error('10BitClub search scraping error:', scrapeError);
      return NextResponse.json({
        success: false,
        error: 'Failed to search 10BitClub',
        details: scrapeError instanceof Error ? scrapeError.message : 'Unknown scraping error',
        query: searchQuery
      }, {
        status: 500
      });
    }
  } catch (error) {
    console.error('10BitClub search API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, {
      status: 500
    });
  }
}
