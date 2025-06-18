import { NextResponse } from 'next/server';
import { load } from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

// Function to normalize image URLs - handling protocol-relative URLs
function normalizeImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('/')) return 'https://10bitclub.xyz' + url;
  return url;
}

// Main function to fetch and parse HTML content
async function scrape10BitClubData(page: number = 1) {
  try {
    const url = page === 1 
      ? 'https://10bitclub.xyz/' 
      : `https://10bitclub.xyz/page/${page}/`;
    
    console.log(`Fetching content from: ${url}`);

    // Fetch the page content
    const response = await fetch(url, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.google.com/'
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch content: ${response.status}`);
    }

    const html = await response.text();
    
    // Debug: Check if we're getting HTML content
    console.log(`Received HTML content (first 500 chars): ${html.substring(0, 500)}`);
    
    const $ = load(html);
    const posts = [];

    // Process both featured and normal movie items
    const movieItems = $('article.item.movies');
    console.log(`Found ${movieItems.length} movie items`);
    
    if (movieItems.length === 0) {
      // If no specific items found, log the page structure for debugging
      console.log('No movie items found with article.item.movies selector. Page structure:', {
        bodyContent: $('body').text().substring(0, 200),
        hasArticleElements: $('article').length > 0,
        classesOnArticles: $('article').first().attr('class'),
        mainContentArea: $('#content, .content, #main, .main').length > 0
      });
    }

    // Process each movie item
    movieItems.each((_, element) => {
      const $element = $(element);
      
      // Extract image from poster img
      let imageUrl = $element.find('.poster img').attr('data-src') || $element.find('.poster img').attr('src');
      imageUrl = normalizeImageUrl(imageUrl);
      
      // Extract title from h3 > a
      const title = $element.find('.data h3 a').text().trim();
      
      // Extract post URL from h3 > a
      const postUrl = $element.find('.data h3 a').attr('href') || 
                     $element.find('.poster a').attr('href');
      
      // Extract rating
      const rating = $element.find('.rating').text().trim();
      
      // Extract year/date
      const yearOrDate = $element.find('.data span').text().trim();
      
      // Extract quality if available
      const quality = $element.find('.quality').text().trim();
      
      // Check if it's featured
      const isFeatured = $element.find('.featu').length > 0;
      
      // Add to posts array if we have at least title and URL
      if (title && postUrl) {
        posts.push({
          imageUrl,
          title,
          postUrl,
          rating: rating || null,
          year: yearOrDate,
          quality: quality || null,
          featured: isFeatured
        });
      } else {
        console.log('Skipping incomplete movie item:', { 
          hasImage: !!imageUrl,
          title: title || '(missing)', 
          hasUrl: !!postUrl,
          elementHTML: $element.html()?.substring(0, 100) + '...'
        });
      }
    });

    console.log(`Successfully parsed ${posts.length} movie items`);
    return posts;
  } catch (error) {
    console.error('Error scraping 10BitClub data:', error);
    throw error;
  }
}

// Function to search content
async function search10BitClubData(searchQuery: string) {
  try {
    const searchUrl = `https://10bitclub.xyz/?s=${encodeURIComponent(searchQuery)}`;
    
    const response = await fetch(searchUrl, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.google.com/'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch search results: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);
    const posts = [];

    // Parse search results from both .result-item and article.item.movies
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
      
      // Extract rating
      const ratingElement = $article.find('.details .meta .rating');
      const rating = ratingElement.text().replace('IMDb', '').trim();
      
      // Extract year
      const yearElement = $article.find('.details .meta .year');
      const yearOrDate = yearElement.text().trim();
      
      // Check for TV show indicator
      const contentTypeSpan = $article.find('.image .thumbnail span');
      const isTVShow = contentTypeSpan.hasClass('tvshows') || contentTypeSpan.text().includes('TV');
      
      if (title && postUrl) {
        posts.push({
          imageUrl,
          title,
          postUrl,
          rating: rating || null,
          year: yearOrDate,
          quality: null, // Not available in search results
          featured: false,
          contentType: isTVShow ? 'TV Show' : 'Movie'
        });
      }
    });

    // Also check for regular movie items in search results
    $('article.item.movies').each((_, element) => {
      const $element = $(element);
      
      // Extract image
      let imageUrl = $element.find('.poster img').attr('data-src') || $element.find('.poster img').attr('src');
      imageUrl = normalizeImageUrl(imageUrl);
      
      // Extract title
      const title = $element.find('.data h3 a').text().trim();
      
      // Extract post URL
      const postUrl = $element.find('.data h3 a').attr('href') || 
                     $element.find('.poster a').attr('href');
      
      // Extract rating
      const rating = $element.find('.rating').text().trim();
      
      // Extract year/date
      const yearOrDate = $element.find('.data span').text().trim();
      
      // Extract quality if available
      const quality = $element.find('.quality').text().trim();
      
      // Check if it's featured
      const isFeatured = $element.find('.featu').length > 0;
      
      if (title && postUrl) {
        // Check if this result is already added from .result-item
        const existingPost = posts.find(post => post.postUrl === postUrl);
        if (!existingPost) {
          posts.push({
            imageUrl,
            title,
            postUrl,
            rating: rating || null,
            year: yearOrDate,
            quality: quality || null,
            featured: isFeatured,
            contentType: 'Movie'
          });
        }
      }
    });

    return posts;
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

    console.log('API key validated successfully for 10BitClub request');

    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search');
    const pageParam = searchParams.get('page');
    const page = pageParam ? parseInt(pageParam, 10) : 1;

    let posts = [];

    try {
      if (searchQuery) {
        // Use search functionality if a search query is provided
        posts = await search10BitClubData(searchQuery);
      } else {
        // Otherwise get regular page content
        posts = await scrape10BitClubData(page);
      }

      return NextResponse.json({
        success: true,
        count: posts.length,
        posts,
        searchQuery: searchQuery || null,
        page,
        source: searchQuery ? 'search' : 'page',
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed - 1) : 0
      });
    } catch (scrapeError) {
      console.error('10BitClub scraping error:', scrapeError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch movie data from 10BitClub',
        details: scrapeError instanceof Error ? scrapeError.message : 'Unknown scraping error'
      }, {
        status: 500
      });
    }
  } catch (error) {
    console.error('10BitClub API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, {
      status: 500
    });
  }
}
