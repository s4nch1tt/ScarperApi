import { NextResponse } from 'next/server';
import { load } from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

// Function to categorize download links by provider
function categorizeLink(url: string): { provider: string; type: string; quality?: string } {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('hubcloud')) {
    return { provider: 'HubCloud', type: 'cloud' };
  } else if (urlLower.includes('gdflix')) {
    return { provider: 'GDflix', type: 'gdrive' };
  } else if (urlLower.includes('hubdrive')) {
    return { provider: 'HubDrive', type: 'cloud' };
  } else {
    return { provider: 'Unknown', type: 'other' };
  }
}

// Function to extract quality information from URL or filename
function extractQuality(url: string): string {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('4k') || urlLower.includes('2160p')) return '4K';
  if (urlLower.includes('1080p')) return '1080p';
  if (urlLower.includes('720p')) return '720p';
  if (urlLower.includes('480p')) return '480p';
  if (urlLower.includes('360p')) return '360p';
  if (urlLower.includes('hevc')) return 'HEVC';
  if (urlLower.includes('x265')) return 'x265';
  if (urlLower.includes('x264')) return 'x264';
  
  return 'Unknown';
}

// Main function to scrape download links from GyanGurus
async function scrapeGyanGurusLinks(url: string) {
  try {
    console.log(`Fetching GyanGurus links from: ${url}`);

    const response = await fetch(url, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://gyanigurus.info/'
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch content: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);
    
    const downloadLinks: any[] = [];
    const seenUrls = new Set<string>(); // Track unique URLs to avoid duplicates
    
    // Extract all download links from the specific structure
    $('div[style*="padding-bottom:5px; padding-top:10px; border-bottom:1px solid #ddd"]').each((_, element) => {
      const $element = $(element);
      const $link = $element.find('a.hover_a.link');
      
      if ($link.length > 0) {
        const href = $link.attr('href');
        const linkText = $link.text().trim();
        
        if (href && linkText && !seenUrls.has(href)) {
          const urlLower = href.toLowerCase();
          
          // Only process links from our target providers
          if (urlLower.includes('hubcloud') || 
              urlLower.includes('gdflix') || 
              urlLower.includes('hubdrive')) {
            
            seenUrls.add(href);
            const { provider, type } = categorizeLink(href);
            const quality = extractQuality(href);
            
            // Extract additional info from the link text/URL
            let fileSize = 'Unknown';
            let fileName = '';
            
            // Try to extract file info from the URL path
            const pathParts = href.split('/');
            const lastPart = pathParts[pathParts.length - 1];
            if (lastPart && lastPart.includes('.')) {
              fileName = lastPart;
            }
            
            downloadLinks.push({
              url: href,
              provider,
              type,
              quality,
              fileName,
              fileSize,
              displayText: linkText,
              isWorking: true
            });
          }
        }
      }
    });
    
    // Also check for any other link patterns as fallback (only for target providers)
    $('a[href]').each((_, element) => {
      const $element = $(element);
      const href = $element.attr('href');
      const linkText = $element.text().trim();
      
      if (href && !seenUrls.has(href)) {
        const urlLower = href.toLowerCase();
        
        if (urlLower.includes('hubcloud') || 
            urlLower.includes('gdflix') || 
            urlLower.includes('hubdrive')) {
          
          seenUrls.add(href);
          const { provider, type } = categorizeLink(href);
          const quality = extractQuality(href);
          
          downloadLinks.push({
            url: href,
            provider,
            type,
            quality,
            fileName: '',
            fileSize: 'Unknown',
            displayText: linkText || href,
            isWorking: true
          });
        }
      }
    });

    // Group links by provider for better organization
    const groupedLinks = downloadLinks.reduce((acc, link) => {
      if (!acc[link.provider]) {
        acc[link.provider] = [];
      }
      acc[link.provider].push(link);
      return acc;
    }, {} as Record<string, any[]>);

    console.log(`Found ${downloadLinks.length} download links from ${Object.keys(groupedLinks).length} providers`);

    return {
      totalLinks: downloadLinks.length,
      providers: Object.keys(groupedLinks),
      links: downloadLinks,
      groupedByProvider: groupedLinks,
      sourceUrl: url
    };

  } catch (error) {
    console.error('Error scraping GyanGurus links:', error);
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

    console.log('API key validated successfully for GyanGurus request');

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({
        success: false,
        error: 'URL parameter is required',
        usage: 'Add ?url=<gyanigurus_page_url> parameter'
      }, {
        status: 400
      });
    }

    // Validate URL format - accept both .info and .net domains
    if (!url.includes('gyanigurus.info') && !url.includes('gyanigurus.net')) {
      return NextResponse.json({
        success: false,
        error: 'Invalid URL. Must be a GyanGurus URL (gyanigurus.info or gyanigurus.net)'
      }, {
        status: 400
      });
    }

    try {
      const linksData = await scrapeGyanGurusLinks(url);

      return NextResponse.json({
        success: true,
        data: linksData,
        website: 'GyanGurus',
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed - 1) : 0
      });

    } catch (scrapeError) {
      console.error('GyanGurus scraping error:', scrapeError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch download links from GyanGurus',
        details: scrapeError instanceof Error ? scrapeError.message : 'Unknown scraping error'
      }, {
        status: 500
      });
    }

  } catch (error) {
    console.error('GyanGurus API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, {
      status: 500
    });
  }
}
