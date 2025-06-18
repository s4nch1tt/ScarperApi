import { NextResponse } from 'next/server';
import { load } from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

interface DownloadLink {
  quality: string;
  size: string;
  url: string;
  text: string;
  fileDetails?: any; // File details from kmmovies API
}

interface MovieDownloadData {
  movieName: string;
  title: string;
  url: string;
  downloadLinks: DownloadLink[];
  metadata?: {
    releaseYear?: string;
    languages?: string[];
    format?: string;
    description?: string;
  };
}

// Function to fetch file details from kmmovies API
async function fetchFileDetails(fileUrl: string): Promise<any> {
  try {
    const apiUrl = `https://kmmovies-ansh.8man.me/api/allmovieshub/file?url=${encodeURIComponent(fileUrl)}`;
    
    console.log(`Fetching file details from: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 10000 // 10 second timeout
    });

    if (!response.ok) {
      console.warn(`Failed to fetch file details for ${fileUrl}: ${response.status} ${response.statusText}`);
      return {
        error: `HTTP ${response.status}: ${response.statusText}`,
        success: false
      };
    }

    const data = await response.json();
    console.log(`Successfully fetched file details for: ${fileUrl}`);
    return data;

  } catch (error) {
    console.error(`Error fetching file details for ${fileUrl}:`, error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    };
  }
}

// Function to extract download links from the movie page
async function scrapeMovieDownloadLinks(movieName: string): Promise<MovieDownloadData> {
  try {
    const movieUrl = `https://allmovieshub.yoga/${movieName}/`;
    
    console.log(`Fetching movie download page: ${movieUrl}`);

    const response = await fetch(movieUrl, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://allmovieshub.yoga/'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch movie page: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const $ = load(html);
    const downloadLinks: DownloadLink[] = [];

    // Extract page title
    const pageTitle = $('title').text().trim() || $('h1').first().text().trim() || 'Unknown Movie';

    // Method 1: Look for h3 elements with download links
    $('h3').each((_, element) => {
      const $element = $(element);
      const linkElement = $element.find('a');
      
      if (linkElement.length > 0) {
        const href = linkElement.attr('href');
        const linkText = linkElement.find('em').text().trim() || linkElement.text().trim();
        
        if (href && linkText) {
          // Extract quality and size from text (e.g., "480p Links [410MB]")
          const qualityMatch = linkText.match(/(\d+p)/i);
          const sizeMatch = linkText.match(/\[([^\]]+)\]/);
          
          if (qualityMatch && (href.includes('bollydrive') || href.includes('drive') || href.includes('file'))) {
            downloadLinks.push({
              quality: qualityMatch[1],
              size: sizeMatch ? sizeMatch[1] : 'Unknown',
              url: href,
              text: linkText
            });
          }
        }
      }
    });

    // Method 2: Look for specific div containers with download links
    $('div[style*="text-align: center"] a[style*="color: #ff9900"]').each((_, element) => {
      const $element = $(element);
      const href = $element.attr('href');
      const linkText = $element.find('em').text().trim() || $element.text().trim();
      
      if (href && linkText) {
        const qualityMatch = linkText.match(/(\d+p)/i);
        const sizeMatch = linkText.match(/\[([^\]]+)\]/);
        
        if (qualityMatch && (href.includes('bollydrive') || href.includes('drive') || href.includes('file'))) {
          // Check if this link already exists
          const existingLink = downloadLinks.find(link => link.url === href);
          if (!existingLink) {
            downloadLinks.push({
              quality: qualityMatch[1],
              size: sizeMatch ? sizeMatch[1] : 'Unknown',
              url: href,
              text: linkText
            });
          }
        }
      }
    });

    // Method 3: Look for any links containing quality information in orange color
    $('a[style*="#ff9900"], a[style*="color: orange"]').each((_, element) => {
      const $element = $(element);
      const href = $element.attr('href');
      const linkText = $element.find('em').text().trim() || $element.text().trim();
      
      if (href && linkText) {
        const qualityMatch = linkText.match(/(\d+p)/i);
        const sizeMatch = linkText.match(/\[([^\]]+)\]/);
        
        if (qualityMatch && (href.includes('bollydrive') || href.includes('drive') || href.includes('file'))) {
          const existingLink = downloadLinks.find(link => link.url === href);
          if (!existingLink) {
            downloadLinks.push({
              quality: qualityMatch[1],
              size: sizeMatch ? sizeMatch[1] : 'Unknown',
              url: href,
              text: linkText
            });
          }
        }
      }
    });

    // Fetch file details for each download link
    console.log(`Found ${downloadLinks.length} download links, fetching file details...`);
    
    const linksWithDetails = await Promise.all(
      downloadLinks.map(async (link) => {
        try {
          const fileDetails = await fetchFileDetails(link.url);
          return {
            ...link,
            fileDetails
          };
        } catch (error) {
          console.error(`Failed to fetch details for ${link.url}:`, error);
          return {
            ...link,
            fileDetails: {
              error: 'Failed to fetch file details',
              success: false
            }
          };
        }
      })
    );

    // Extract metadata
    const description = $('.entry-content p').first().text().trim();
    const yearMatch = pageTitle.match(/(\d{4})/);
    
    // Extract language information
    const languages: string[] = [];
    const titleLower = pageTitle.toLowerCase();
    if (titleLower.includes('hindi')) languages.push('Hindi');
    if (titleLower.includes('english')) languages.push('English');
    if (titleLower.includes('tamil')) languages.push('Tamil');
    if (titleLower.includes('telugu')) languages.push('Telugu');
    if (titleLower.includes('dual audio')) languages.push('Dual Audio');

    // Extract format information
    let format = 'Unknown';
    if (titleLower.includes('bluray')) format = 'BluRay';
    else if (titleLower.includes('web-dl')) format = 'WEB-DL';
    else if (titleLower.includes('webrip')) format = 'WEBRip';
    else if (titleLower.includes('hdrip')) format = 'HDRip';
    else if (titleLower.includes('hdtc')) format = 'HDTC';
    else if (titleLower.includes('cam')) format = 'CAM';

    // Sort download links by quality
    linksWithDetails.sort((a, b) => {
      const qualityA = parseInt(a.quality.replace('p', ''));
      const qualityB = parseInt(b.quality.replace('p', ''));
      return qualityA - qualityB;
    });

    return {
      movieName,
      title: pageTitle,
      url: movieUrl,
      downloadLinks: linksWithDetails,
      metadata: {
        releaseYear: yearMatch ? yearMatch[1] : undefined,
        languages: languages.length > 0 ? languages : undefined,
        format,
        description: description || undefined
      }
    };

  } catch (error) {
    console.error('Error scraping movie download links:', error);
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

    console.log('API key validated successfully for AllMoviesHub download request');

    const { searchParams } = new URL(request.url);
    const movieName = searchParams.get('movie');

    if (!movieName) {
      return NextResponse.json({
        success: false,
        error: 'Movie name parameter is required'
      }, {
        status: 400
      });
    }

    try {
      const movieData = await scrapeMovieDownloadLinks(movieName);

      if (movieData.downloadLinks.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No download links found for this movie',
          movieData: {
            movieName,
            title: movieData.title,
            url: movieData.url
          }
        }, {
          status: 404
        });
      }

      // Separate successful and failed file details
      const successfulLinks = movieData.downloadLinks.filter(link => 
        link.fileDetails && link.fileDetails.success !== false
      );
      
      const failedLinks = movieData.downloadLinks.filter(link => 
        !link.fileDetails || link.fileDetails.success === false
      );

      return NextResponse.json({
        success: true,
        movieData: {
          ...movieData,
          downloadLinks: movieData.downloadLinks
        },
        linksCount: movieData.downloadLinks.length,
        successfulFileDetails: successfulLinks.length,
        failedFileDetails: failedLinks.length,
        availableQualities: [...new Set(movieData.downloadLinks.map(link => link.quality))],
        website: 'AllMoviesHub',
        kmmoviesApiStatus: {
          total: movieData.downloadLinks.length,
          successful: successfulLinks.length,
          failed: failedLinks.length
        },
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed - 1) : 0
      });

    } catch (scrapeError) {
      console.error('AllMoviesHub download scraping error:', scrapeError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch download links from AllMoviesHub',
        details: scrapeError instanceof Error ? scrapeError.message : 'Unknown scraping error',
        movieName
      }, {
        status: 500
      });
    }

  } catch (error) {
    console.error('AllMoviesHub download API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, {
      status: 500
    });
  }
}
