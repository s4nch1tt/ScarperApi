import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'Referer': 'https://www.showbox.media/',
};

interface EpisodeData {
  title: string;
  season: number;
  episode: number;
  link: string;
  fileSize?: string;
}

interface SeasonData {
  seasonNumber: number;
  episodes: EpisodeData[];
}

interface ApiResponse {
  success: boolean;
  data?: {
    title: string;
    type: 'movie' | 'series';
    seasons: SeasonData[];
  };
  error?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url || typeof url !== 'string') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // Step 1: Get metadata from the showbox page
    const pageRes = await fetch(url, { 
      headers,
      cache: 'no-cache'
    });
    
    if (!pageRes.ok) {
      throw new Error(`Failed to fetch page: ${pageRes.status} ${pageRes.statusText}`);
    }
    
    const pageHtml = await pageRes.text();
    const $ = load(pageHtml);
    
    const type = url.includes('tv') ? 'series' : 'movie';
    const title = $('.heading-name').text().trim();
    
    // Get febID from the heading link
    const febID = $('.heading-name').find('a').attr('href')?.split('/')?.pop();
    if (!febID) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Could not extract febID' },
        { status: 400 }
      );
    }

    // Step 2: Get share link
    const baseUrl = url.split('/').slice(0, 3).join('/');
    const indexUrl = `${baseUrl}/index/share_link?id=${febID}&type=${type === 'movie' ? '1' : '2'}`;
    
    const indexRes = await fetch(indexUrl, { 
      headers,
      cache: 'no-cache'
    });
    
    if (!indexRes.ok) {
      throw new Error(`Failed to fetch share link: ${indexRes.status} ${indexRes.statusText}`);
    }
    
    const indexData = await indexRes.json();
    const febKey = indexData.data.link.split('/').pop();

    // Step 3: Get file list from Febbox
    const febLink = `https://www.febbox.com/file/file_share_list?share_key=${febKey}&is_html=0`;
    const febRes = await fetch(febLink, { 
      headers: {
        ...headers,
        'Referer': 'https://www.febbox.com/',
      },
      cache: 'no-cache'
    });
    
    if (!febRes.ok) {
      throw new Error(`Failed to fetch febbox data: ${febRes.status} ${febRes.statusText}`);
    }
    
    const febData = await febRes.json();
    const fileList = febData?.data?.file_list;

    if (!fileList) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No files found' },
        { status: 404 }
      );
    }

    const seasons: SeasonData[] = [];

    if (type === 'movie') {
      // For movies, create a single "season" with the movie file
      const movieFiles = fileList.filter((file: any) => !file.is_dir);
      if (movieFiles.length > 0) {
        seasons.push({
          seasonNumber: 1,
          episodes: movieFiles.map((file: any, index: number) => ({
            title: file.file_name,
            season: 1,
            episode: index + 1,
            link: `${febKey}&${file.fid}`,
            fileSize: file.file_size
          }))
        });
      }
    } else {
      // For series, process each season folder
      const seasonFolders = fileList.filter((file: any) => file.is_dir);
      
      for (const folder of seasonFolders) {
        // Get episodes from each season folder
        const seasonLink = `https://www.febbox.com/file/file_share_list?share_key=${febKey}&pwd=&parent_id=${folder.fid}&is_html=0`;
        const seasonRes = await fetch(seasonLink, { 
          headers: {
            ...headers,
            'Referer': 'https://www.febbox.com/',
          },
          cache: 'no-cache'
        });
        
        if (!seasonRes.ok) {
          console.warn(`Failed to fetch season data for folder ${folder.fid}: ${seasonRes.status}`);
          continue;
        }
        
        const seasonData = await seasonRes.json();
        const episodeList = seasonData?.data?.file_list || [];
        
        const episodes: EpisodeData[] = [];
        
        episodeList.forEach((file: any) => {
          if (!file.is_dir) {
            const episodeInfo = parseEpisodeTitle(file.file_name);
            episodes.push({
              title: episodeInfo.formattedTitle,
              season: episodeInfo.season,
              episode: episodeInfo.episode,
              link: `${febKey}&${file.fid}`,
              fileSize: file.file_size
            });
          }
        });

        if (episodes.length > 0) {
          // Sort episodes by episode number
          episodes.sort((a, b) => a.episode - b.episode);
          
          seasons.push({
            seasonNumber: episodes[0].season,
            episodes
          });
        }
      }
      
      // Sort seasons by season number
      seasons.sort((a, b) => a.seasonNumber - b.seasonNumber);
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        title,
        type,
        seasons
      }
    });

  } catch (error) {
    console.error('Showbox API Error:', error);
    return NextResponse.json<ApiResponse>(
      { 
        success: false, 
        error: 'Failed to fetch episode data',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

function parseEpisodeTitle(title: string): { season: number; episode: number; formattedTitle: string } {
  const regex = /[sS](\d+)\s*[eE](\d+)/;
  const match = title.match(regex);
  
  if (match) {
    const season = parseInt(match[1]);
    const episode = parseInt(match[2]);
    const formattedTitle = `Season${season.toString().padStart(2, '0')} Episode${episode.toString().padStart(2, '0')}`;
    
    return { season, episode, formattedTitle };
  }
  
  // Fallback for non-standard naming
  return { season: 1, episode: 1, formattedTitle: title };
}
