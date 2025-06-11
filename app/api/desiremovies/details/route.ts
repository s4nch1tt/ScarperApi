import { NextResponse } from 'next/server';
import { load } from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

// Function to normalize image URLs
function normalizeImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('//')) return 'https:' + url;
  return url;
}

// Function to extract episodes with download links
function extractEpisodes($: any) {
  const episodes: any[] = [];
  
  // Find all episode headers (h3 with EP pattern)
  $('.entry-content h3').each((_, element) => {
    const $element = $(element);
    const episodeText = $element.text().trim();
    
    // Check if this is an episode header
    const episodeMatch = episodeText.match(/EP\s*(\d+)/i);
    
    if (episodeMatch) {
      const episodeNumber = episodeMatch[1];
      const downloadLinks: any[] = [];
      
      // Find the next h4 elements after this episode header until next episode or end
      let nextElement = $element.next();
      
      while (nextElement.length > 0 && !nextElement.is('h3')) {
        if (nextElement.is('h4')) {
          const h4Text = nextElement.text();
          
          // Check for x264 links
          if (h4Text.includes('x264')) {
            nextElement.find('a').each((_, linkElement) => {
              const $link = $(linkElement);
              const url = $link.attr('href');
              const quality = $link.text().trim();
              
              if (url && quality) {
                downloadLinks.push({
                  quality,
                  downloadUrl: url,
                  encoding: 'x264',
                  type: 'Standard'
                });
              }
            });
          }
          
          // Check for x265 links
          if (h4Text.includes('x265')) {
            nextElement.find('a').each((_, linkElement) => {
              const $link = $(linkElement);
              const url = $link.attr('href');
              const quality = $link.text().trim();
              
              if (url && quality) {
                downloadLinks.push({
                  quality,
                  downloadUrl: url,
                  encoding: 'x265',
                  type: quality.includes('HEVC') ? 'HEVC' : quality.includes('10-Bit') ? '10-Bit' : 'Standard'
                });
              }
            });
          }
        }
        
        nextElement = nextElement.next();
        
        // Break if we hit another episode header
        if (nextElement.is('h3') && nextElement.text().match(/EP\s*\d+/i)) {
          break;
        }
      }
      
      if (downloadLinks.length > 0) {
        episodes.push({
          episodeNumber: parseInt(episodeNumber),
          episodeName: episodeText,
          downloadLinks
        });
      }
    }
  });
  
  return episodes;
}

// Function to extract movie details from the page
function extractMovieDetails($: any) {
  const details: any = {};
  
  // Extract main movie image
  details.posterUrl = normalizeImageUrl($('.entry-content img').first().attr('src'));
  
  // Extract title from the first strong text or h4
  const titleElement = $('.entry-content p strong').first().text() || 
                      $('.entry-content h4 img').attr('alt') || 
                      $('h1.entry-title').text();
  details.title = titleElement.replace(/Download\s+/, '').trim();
  
  // Extract release info
  const releaseInfoText = $('.entry-content').text();
  
  // Extract specific details using regex patterns
  const titleMatch = releaseInfoText.match(/Title\s*:\s*([^\n\r]+)/i);
  if (titleMatch) details.movieTitle = titleMatch[1].trim();
  
  const yearMatch = releaseInfoText.match(/Year\s*:\s*(\d{4})/i);
  if (yearMatch) details.year = yearMatch[1];
  
  const qualityMatch = releaseInfoText.match(/Quality\s*:\s*([^\n\r]+)/i);
  if (qualityMatch) details.availableQualities = qualityMatch[1].trim();
  
  const imdbMatch = releaseInfoText.match(/IMDb\s*:\s*([\d\.\/]+)/i);
  if (imdbMatch) details.imdbRating = imdbMatch[1];
  
  const languageMatch = releaseInfoText.match(/Language\s*:\s*([^\n\r]+)/i);
  if (languageMatch) details.languages = languageMatch[1].trim();
  
  const genreMatch = releaseInfoText.match(/All Genres\s*:\s*([^\n\r]+)/i);
  if (genreMatch) details.genres = genreMatch[1].trim();
  
  const plotMatch = releaseInfoText.match(/Plot:\s*([^\n\r]+)/i);
  if (plotMatch) details.plot = plotMatch[1].trim();
  
  // Check if this is a TV series/episodes content
  const episodes = extractEpisodes($);
  if (episodes.length > 0) {
    details.contentType = 'TV Series';
    details.episodes = episodes;
    details.totalEpisodes = episodes.length;
  } else {
    details.contentType = 'Movie';
  }
  
  return details;
}

// Function to extract download links
function extractDownloadLinks($: any) {
  const downloadLinks: any[] = [];
  
  // Find all download sections
  $('.entry-content').find('p').each((_, element) => {
    const $element = $(element);
    const text = $element.text().trim();
    
    // Check if this paragraph contains quality and size info
    const qualityMatch = text.match(/^(4K|1080p|720p|480p|720p HEVC)\s*\[([^\]]+)\]$/);
    
    if (qualityMatch) {
      const quality = qualityMatch[1];
      const size = qualityMatch[2];
      
      // Find the next paragraph with download link
      const nextP = $element.next('p');
      const downloadLink = nextP.find('a').attr('href');
      const linkText = nextP.find('a').text().trim();
      
      if (downloadLink && linkText.includes('DOWNLOAD')) {
        downloadLinks.push({
          quality,
          size,
          downloadUrl: downloadLink,
          type: quality.includes('HEVC') ? 'HEVC' : 'Standard'
        });
      }
    }
  });
  
  // Also check for main download link at the top
  const mainDownloadLink = $('.entry-content a').first().attr('href');
  const mainDownloadText = $('.entry-content a').first().text();
  
  if (mainDownloadLink && mainDownloadText.includes('DOWNLOAD')) {
    downloadLinks.unshift({
      quality: 'Multiple',
      size: 'Various',
      downloadUrl: mainDownloadLink,
      type: 'Main Download',
      isMainLink: true
    });
  }
  
  return downloadLinks;
}

// Main function to scrape movie details
async function scrapeMovieDetails(movieUrl: string) {
  try {
    console.log(`Fetching movie details from: ${movieUrl}`);

    const response = await fetch(movieUrl, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch movie details: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);

    // Extract movie details
    const movieDetails = extractMovieDetails($);
    
    // Only extract movie-style download links if it's not a TV series
    let downloadLinks = [];
    if (movieDetails.contentType === 'Movie') {
      downloadLinks = extractDownloadLinks($);
    }

    return {
      ...movieDetails,
      ...(downloadLinks.length > 0 && { downloadLinks })
    };

  } catch (error) {
    console.error('Error scraping movie details:', error);
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      console.log('API key validation failed:', authResult.error);
      return createUnauthorizedResponse(authResult.error || 'Invalid API key');
    }

    console.log('API key validated successfully for DesireMovies details request');

    const { searchParams } = new URL(request.url);
    const movieUrl = searchParams.get('url');

    if (!movieUrl) {
      return NextResponse.json({
        success: false,
        error: 'Movie URL is required',
        usage: 'Add ?url=<movie_page_url> parameter'
      }, {
        status: 400
      });
    }

    // Validate URL format
    if (!movieUrl.includes('desiremovies.cologne')) {
      return NextResponse.json({
        success: false,
        error: 'Invalid URL. Must be a DesireMovies URL'
      }, {
        status: 400
      });
    }

    try {
      const movieDetails = await scrapeMovieDetails(movieUrl);

      return NextResponse.json({
        success: true,
        movieDetails,
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed - 1) : 0
      });

    } catch (scrapeError) {
      console.error('Movie details scraping error:', scrapeError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch movie details from DesireMovies',
        details: scrapeError instanceof Error ? scrapeError.message : 'Unknown scraping error'
      }, {
        status: 500
      });
    }

  } catch (error) {
    console.error('DesireMovies details API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, {
      status: 500
    });
  }
}
