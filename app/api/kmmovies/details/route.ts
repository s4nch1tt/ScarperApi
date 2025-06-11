import { NextResponse } from 'next/server';
import { load } from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

// Function to normalize URLs
function normalizeUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('//')) return 'https:' + url;
  return url;
}

async function getKMmoviesDetails(url: string) {
  try {
    console.log(`Fetching KMmovies details from: ${url}`);

    const response = await fetch(url, {
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
    
    // Extract main image from entry-meta section
    const mainImage = $('.entry-meta .post-thumbnail img').attr('src') || 
                      $('.entry-meta img').first().attr('src');
    
    // Extract title from h1 or page title
    const title = $('h1.entry-title').text().trim() || 
                  $('title').text().split('|')[0]?.trim();
    
    // Extract storyline from mip-movie-info section
    const storylineElement = $('.mip-movie-info h3:contains("Storyline:")');
    const storyline = storylineElement.next('p').text().trim() || 
                      $('.mip-movie-info p').first().text().trim();
    
    // Extract movie info details from "Movie Info:" section
    const movieInfoElement = $('.mip-movie-info h3:contains("Movie Info:")');
    const movieInfoDetails = movieInfoElement.next('p').html() || '';
    
    // Parse movie info details
    const parseMovieInfo = (infoHtml: string) => {
      const info: any = {};
      const lines = infoHtml.split('<br />').map(line => line.replace(/<[^>]*>/g, '').trim());
      
      lines.forEach(line => {
        if (line.includes('IMDb Rating:')) {
          const rating = line.split('IMDb Rating:')[1]?.trim();
          if (rating && rating !== 'N/A') {
            info.imdbRating = {
              text: rating.split('(')[0].trim(),
              url: `https://www.imdb.com/`
            };
          }
        }
        if (line.includes('Movie Name:')) {
          info.movieName = line.split('Movie Name:')[1]?.trim();
        }
        if (line.includes('Directed By:')) {
          info.director = line.split('Directed By:')[1]?.trim();
        }
        if (line.includes('Starring:')) {
          info.cast = line.split('Starring:')[1]?.trim();
        }
        if (line.includes('Movie Genres:')) {
          info.genres = line.split('Movie Genres:')[1]?.trim();
        }
        if (line.includes('Running Time:')) {
          info.duration = line.split('Running Time:')[1]?.trim();
        }
        if (line.includes('Release Date:')) {
          info.releaseDate = line.split('Release Date:')[1]?.trim();
        }
        if (line.includes('Quality:')) {
          info.qualities = line.split('Quality:')[1]?.trim();
        }
        if (line.includes('Language:')) {
          info.language = line.split('Language:')[1]?.trim();
        }
        if (line.includes('OTT:')) {
          info.ott = line.split('OTT:')[1]?.trim();
        }
        if (line.includes('Writer:')) {
          info.writer = line.split('Writer:')[1]?.trim();
        }
      });
      
      return info;
    };

    const movieInfo = parseMovieInfo(movieInfoDetails);
    
    // Extract download links from both download-buttons and download-card sections
    const downloadLinks: Array<{url: string, quality: string, size: string, text: string}> = [];
    
    // Method 1: Original download-buttons structure
    $('.download-buttons h4').each((index, element) => {
      const $h4 = $(element);
      const qualityText = $h4.text().trim();
      const $link = $h4.next('p').find('a');
      const href = $link.attr('href');
      const linkText = $link.text().trim();
      
      if (href && qualityText) {
        // Extract quality and size from text like "|| 480p File Size: 460.9MB ||"
        const qualityMatch = qualityText.match(/(\d+p(?:\s+\w+)?)/);
        const sizeMatch = qualityText.match(/File Size:\s*([^|]+)/);
        
        if (qualityMatch) {
          downloadLinks.push({
            url: href,
            quality: qualityMatch[1].trim(),
            size: sizeMatch ? sizeMatch[1].trim() : 'Unknown',
            text: linkText
          });
        }
      }
    });
    
    // Method 2: New download-card structure
    if (downloadLinks.length === 0) {
      $('.download-card').each((index, element) => {
        const $card = $(element);
        
        // Extract quality from download-quality-text
        const qualityText = $card.find('.download-quality-text').text().trim();
        
        // Extract size from download-size-info (look for text content, not tooltip)
        const $sizeInfo = $card.find('.download-size-info');
        let size = 'Unknown';
        
        // Get the text content and extract size (like "2.9GB", "4.1GB", etc.)
        const sizeText = $sizeInfo.clone().children().remove().end().text().trim();
        const sizeMatch = sizeText.match(/(\d+(?:\.\d+)?\s*(?:GB|MB))/i);
        if (sizeMatch) {
          size = sizeMatch[1].trim();
        }
        
        // Extract download link
        const $link = $card.find('.tabs-download-button, a[href*="magiclinks"]');
        const href = $link.attr('href');
        const linkText = $link.text().trim();
        
        if (href && qualityText) {
          downloadLinks.push({
            url: href,
            quality: qualityText,
            size: size,
            text: linkText || 'FAST DOWNLOAD'
          });
        }
      });
    }
    
    // Method 3: Fallback - look for any magiclinks directly
    if (downloadLinks.length === 0) {
      $('a[href*="magiclinks"]').each((index, element) => {
        const $link = $(element);
        const href = $link.attr('href');
        const linkText = $link.text().trim();
        
        if (href) {
          // Try to find quality info from nearby elements
          const $parent = $link.closest('.download-card, .download-option, div');
          let quality = 'Unknown';
          let size = 'Unknown';
          
          // Look for quality indicators in parent or sibling elements
          const qualityElement = $parent.find('[class*="quality"], .download-quality-text').first();
          if (qualityElement.length) {
            quality = qualityElement.text().trim();
          }
          
          // Look for size indicators
          const sizeElement = $parent.find('[class*="size"], .download-size-info').first();
          if (sizeElement.length) {
            const sizeText = sizeElement.text();
            const sizeMatch = sizeText.match(/(\d+(?:\.\d+)?\s*(?:GB|MB))/i);
            if (sizeMatch) {
              size = sizeMatch[1].trim();
            }
          }
          
          downloadLinks.push({
            url: href,
            quality: quality,
            size: size,
            text: linkText || 'Download'
          });
        }
      });
    }

    // Extract screenshot image
    const screenshotImg = $('.mip-movie-info img[title*="screenshot"], .mip-movie-info img[alt*="screenshot"]').attr('src');
    
    // Extract available qualities from the content
    const availableQualities = downloadLinks.map(link => link.quality);
    
    // Extract language information
    const languages = [];
    const languageInfo = movieInfo.language || '';
    if (/hindi/i.test(languageInfo) || /hindi/i.test(title)) languages.push('Hindi');
    if (/english/i.test(languageInfo) || /english/i.test(title)) languages.push('English');
    if (/tamil/i.test(languageInfo) || /tamil/i.test(title)) languages.push('Tamil');
    if (/telugu/i.test(languageInfo) || /telugu/i.test(title)) languages.push('Telugu');
    if (/malayalam/i.test(languageInfo) || /malayalam/i.test(title)) languages.push('Malayalam');
    if (/dual\s*audio/i.test(languageInfo) || /dual\s*audio/i.test(title)) languages.push('Dual Audio');
    
    // Extract release year
    const releaseYear = movieInfo.releaseDate?.match(/(\d{4})/)?.[1] || 
                       title.match(/(\d{4})/)?.[1] || 
                       'Unknown';
    
    console.log(`Found ${downloadLinks.length} download links`);

    return {
      title: movieInfo.movieName || title,
      mainImage: normalizeUrl(mainImage),
      storyline: storyline === 'N/A' ? 'No storyline available.' : storyline,
      releaseYear,
      director: movieInfo.director,
      cast: movieInfo.cast,
      genres: movieInfo.genres,
      duration: movieInfo.duration,
      writer: movieInfo.writer,
      ott: movieInfo.ott,
      isSeries: false, // KMmovies typically has movies
      languages,
      availableQualities: [...new Set(availableQualities)],
      downloadLinks,
      screenshot: normalizeUrl(screenshotImg),
      imdbRating: movieInfo.imdbRating,
      sourceUrl: url
    };
  } catch (error) {
    console.error('Error fetching KMmovies details:', error);
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

    console.log('API key validated successfully for KMmovies details request');

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({
        success: false,
        error: 'URL parameter is required'
      }, { status: 400 });
    }

    // Make sure the URL is from kmmovies.mobi
    if (!url.includes('kmmovies.mobi')) {
      return NextResponse.json({
        success: false,
        error: 'Only KMmovies URLs are supported'
      }, { status: 400 });
    }

    try {
      const movieDetails = await getKMmoviesDetails(url);

      return NextResponse.json({
        success: true,
        data: movieDetails,
        website: 'KMmovies',
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed - 1) : 0
      });
    } catch (scrapeError) {
      console.error('KMmovies details scraping error:', scrapeError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch movie details from KMmovies',
        details: scrapeError instanceof Error ? scrapeError.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('KMmovies details API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
