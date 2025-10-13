import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';
import { validate4kHDHubUrl } from '@/lib/utils/providers';

interface DownloadLink {
  name: string;
  url: string;
  type: 'HubDrive' | 'HubCloud';
}

interface EpisodeFile {
  title: string;
  size: string;
  episodeNumber: string;
  links: DownloadLink[];
}

interface SeasonPack {
  id: string;
  title: string;
  season: string;
  size: string;
  languages: string[];
  quality: string;
  format: string;
  source: string;
  badges: string[];
  links: DownloadLink[];
}

interface EpisodeSeason {
  id: string;
  title: string;
  season: string;
  episodeCount: number;
  languages: string[];
  quality: string;
  episodes: EpisodeFile[];
}

interface FourKHDHubDetailsResponse {
  success: boolean;
  data?: {
    title: string;
    url: string;
    completePacks: SeasonPack[];
    episodeSeasons: EpisodeSeason[];
    totalPacks: number;
    totalEpisodeSeasons: number;
  };
  error?: string;
  message?: string;
  remainingRequests?: number;
}

// Function to extract download links
function extractDownloadLinks($: any, $element: any): DownloadLink[] {
  const links: DownloadLink[] = [];
  
  $element.find('a[href*="techyboy4u.com"]').each((_, linkElement: any) => {
    const $link = $(linkElement);
    const url = $link.attr('href');
    const text = $link.text().trim();
    
    if (url && text) {
      let type: 'HubDrive' | 'HubCloud' = 'HubDrive';
      if (text.toLowerCase().includes('hubcloud')) {
        type = 'HubCloud';
      }
      
      links.push({
        name: text.replace(/\s+/g, ' '),
        url: url,
        type: type
      });
    }
  });
  
  return links;
}

// Function to extract badges/metadata
function extractBadges($: any, $element: any): string[] {
  const badges: string[] = [];
  
  $element.find('.badge').each((_: any, badgeElement: any) => {
    const badgeText = $(badgeElement).text().trim();
    if (badgeText) {
      badges.push(badgeText);
    }
  });
  
  return badges;
}

// Function to parse language badges
function extractLanguages(badges: string[]): string[] {
  const languageBadge = badges.find(badge => 
    badge.includes(',') || 
    badge.toLowerCase().includes('hindi') ||
    badge.toLowerCase().includes('english') ||
    badge.toLowerCase().includes('tamil') ||
    badge.toLowerCase().includes('telugu')
  );
  
  if (languageBadge && languageBadge.includes(',')) {
    return languageBadge.split(',').map(lang => lang.trim());
  }
  
  return languageBadge ? [languageBadge] : [];
}

// Main function to scrape 4KHDHub details page
async function scrape4KHDHubDetails(url: string): Promise<any> {
  try {
    console.log(`Scraping 4KHDHub details from: ${url}`);

    const response = await fetch(url, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': new URL(url).origin + '/',
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch details: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);
    
    // Extract page title
    const pageTitle = $('title').text().trim() || 'Unknown Title';
    
    // Parse Complete Packs
    const completePacks: SeasonPack[] = [];
    
    // First, try the new content-section structure
    $('.content-section .download-item').each((_, packElement) => {
      const $pack = $(packElement);
      const header = $pack.find('.download-header');
      const content = $pack.find('div[id^="content-"]');
      
      // Extract data-file-id from header
      const fileId = header.attr('data-file-id') || '';
      
      // Extract title from the flex-1 div (get first text node, not including <br> and <code>)
      const titleElement = header.find('.flex-1');
      let mainTitle = '';
      
      // Get the first text node before any <br> or <code> tags
      titleElement.contents().each((_, node) => {
        if (node.nodeType === 3) { // Text node
          const text = $(node).text().trim();
          if (text && !mainTitle) {
            mainTitle = text;
            return false; // Break the loop
          }
        } else if (node.nodeName.toLowerCase() === 'br') {
          return false; // Stop at <br>
        }
      });
      
      // Clean up title
      mainTitle = mainTitle.replace(/\s+/g, ' ').trim();
      
      // Extract badges from header (inside <code> element)
      const headerBadges = extractBadges($, header);
      
      // Extract full file title from content
      const fullTitle = content.find('.file-title').text().trim();
      
      // Extract additional badges from content
      const contentBadges = extractBadges($, content);
      
      // Combine all badges
      const allBadges = [...headerBadges, ...contentBadges];
      
      // Extract download links from the grid
      const links = extractDownloadLinks($, content);
      
      if (mainTitle && links.length > 0) {
        const languages = extractLanguages(allBadges);
        const sizeBadge = allBadges.find(b => b.includes('GB') || b.includes('MB'));
        const qualityBadge = allBadges.find(b => 
          b.includes('1080p') || 
          b.includes('2160p') || 
          b.includes('720p') || 
          b.includes('4K')
        );
        const formatBadge = allBadges.find(b => 
          b.includes('BluRay') || 
          b.includes('WEB-DL') || 
          b.includes('REMUX') ||
          b.includes('HEVC') ||
          b.includes('x264') ||
          b.includes('x265') ||
          b.includes('HDR') ||
          b.includes('DV')
        );
        
        completePacks.push({
          id: fileId,
          title: fullTitle || mainTitle,
          season: mainTitle, // Use main title as season identifier
          size: sizeBadge || 'Unknown',
          languages: languages,
          quality: qualityBadge || 'Unknown',
          format: formatBadge || 'Unknown',
          source: '4kHDHub.Com',
          badges: allBadges,
          links: links
        });
      }
    });
    
    // If no content found with new structure, try the old structure as fallback
    if (completePacks.length === 0) {
      $('#complete-pack .download-item').each((_, packElement) => {
        const $pack = $(packElement);
        const header = $pack.find('.download-header');
        const content = $pack.find('.px-4');
        
        const season = header.find('.episode-number').text().trim();
        const titleElement = header.find('.flex-1');
        const mainTitle = titleElement.contents().first().text().trim();
        const badges = extractBadges($, header);
        
        const fileId = header.attr('data-file-id') || '';
        const fullTitle = content.find('.file-title').text().trim();
        const links = extractDownloadLinks($, content);
        
        if (season && mainTitle && links.length > 0) {
          const languages = extractLanguages(badges);
          const sizeBadge = badges.find(b => b.includes('GB') || b.includes('MB'));
          const qualityBadge = badges.find(b => 
            b.includes('1080p') || 
            b.includes('2160p') || 
            b.includes('720p') || 
            b.includes('4K')
          );
          const formatBadge = badges.find(b => 
            b.includes('BluRay') || 
            b.includes('WEB-DL') || 
            b.includes('REMUX')
          );
          
          completePacks.push({
            id: fileId,
            title: fullTitle || mainTitle,
            season: season,
            size: sizeBadge || 'Unknown',
            languages: languages,
            quality: qualityBadge || 'Unknown',
            format: formatBadge || 'Unknown',
            source: '4KHDHub.com',
            badges: badges,
            links: links
          });
        }
      });
    }
    
    // Parse Individual Episodes (keeping existing logic)
    const episodeSeasons: EpisodeSeason[] = [];
    $('#episodes .episode-item').each((_, seasonElement) => {
      const $season = $(seasonElement);
      const header = $season.find('.episode-header');
      const content = $season.find('.episode-content');
      
      const seasonNum = header.find('.episode-number').text().trim();
      const seasonTitle = header.find('.episode-title').text().trim();
      const metaBadges = extractBadges($, header.find('.episode-meta'));
      
      const episodeId = header.attr('data-episode-id') || '';
      const languages = extractLanguages(metaBadges);
      const episodeCountBadge = metaBadges.find(b => b.includes('Episodes'));
      const episodeCount = episodeCountBadge ? 
        parseInt(episodeCountBadge.replace('Episodes', '').trim()) : 0;
      
      // Extract individual episode files
      const episodes: EpisodeFile[] = [];
      content.find('.episode-download-item').each((_, episodeElement) => {
        const $episode = $(episodeElement);
        const episodeTitle = $episode.find('.episode-file-title').text().trim();
        const episodeInfo = $episode.find('.episode-file-info');
        const episodeNumber = episodeInfo.find('.badge-psa').text().trim();
        const episodeSize = episodeInfo.find('.badge-size').text().trim();
        const episodeLinks = extractDownloadLinks($, $episode.find('.episode-links'));
        
        if (episodeTitle && episodeNumber && episodeLinks.length > 0) {
          episodes.push({
            title: episodeTitle,
            size: episodeSize,
            episodeNumber: episodeNumber,
            links: episodeLinks
          });
        }
      });
      
      if (seasonNum && seasonTitle && episodes.length > 0) {
        episodeSeasons.push({
          id: episodeId,
          title: seasonTitle,
          season: seasonNum,
          episodeCount: episodeCount,
          languages: languages,
          quality: seasonTitle,
          episodes: episodes
        });
      }
    });
    
    return {
      title: pageTitle,
      url: url,
      completePacks: completePacks,
      episodeSeasons: episodeSeasons,
      totalPacks: completePacks.length,
      totalEpisodeSeasons: episodeSeasons.length
    };
    
  } catch (error) {
    console.error('Error scraping 4KHDHub details:', error);
    throw error;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<FourKHDHubDetailsResponse>> {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      return createUnauthorizedResponse(authResult.error || 'Invalid API key') as NextResponse<FourKHDHubDetailsResponse>;
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url || !url.trim()) {
      return NextResponse.json<FourKHDHubDetailsResponse>(
        { 
          success: false, 
          error: 'URL parameter is required',
          message: 'Please provide a valid 4KHDHub URL'
        },
        { status: 400 }
      );
    }

    // Validate URL format
    const isValidUrl = await validate4kHDHubUrl(url.trim());
    if (!isValidUrl) {
      return NextResponse.json<FourKHDHubDetailsResponse>(
        { 
          success: false, 
          error: 'Invalid URL format',
          message: 'URL must be from a valid 4kHDHub domain'
        },
        { status: 400 }
      );
    }

    console.log('Processing 4KHDHub details request:', { url });

    const data = await scrape4KHDHubDetails(url.trim());

    if (!data || (data.completePacks.length === 0 && data.episodeSeasons.length === 0)) {
      return NextResponse.json<FourKHDHubDetailsResponse>({
        success: false,
        error: 'No content found',
        message: 'No download content found on this page',
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
      });
    }

    return NextResponse.json<FourKHDHubDetailsResponse>({
      success: true,
      data: data,
      remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
    });

  } catch (error: unknown) {
    console.error('4KHDHub Details API error:', error);
    
    return NextResponse.json<FourKHDHubDetailsResponse>(
      { 
        success: false, 
        error: 'Failed to extract details from 4KHDHub',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
