import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

interface Link {
  title: string;
  episodesLink: string;
}

interface ShowboxDetailsResponse {
  success: boolean;
  data?: {
    title: string;
    rating: string;
    synopsis: string;
    image: string;
    imdbId: string;
    type: 'movie' | 'series';
    linkList: Link[];
  };
  error?: string;
  message?: string;
  remainingRequests?: number;
}

const headers = {
  accept: '*/*',
  'accept-language': 'en-US,en;q=0.9,en-IN;q=0.8',
  'cache-control': 'no-cache',
  'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
  pragma: 'no-cache',
  priority: 'u=1, i',
  'sec-ch-ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Microsoft Edge";v="134"',
  'sec-ch-ua-arch': '"x86"',
  'sec-ch-ua-bitness': '"64"',
  'sec-ch-ua-full-version': '"134.0.3124.83"',
  'sec-ch-ua-full-version-list': '"Chromium";v="134.0.6998.118", "Not:A-Brand";v="24.0.0.0", "Microsoft Edge";v="134.0.3124.83"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-model': '""',
  'sec-ch-ua-platform': '"Windows"',
  'sec-ch-ua-platform-version': '"19.0.0"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'x-requested-with': 'XMLHttpRequest',
  cookie: 'ext_name=ojplmecpdpgccookcobabopnaifgidhf; ci=167dea138333aa; cf_clearance=F3Z5jQdACVu5drghUljgmK3dhdEOZYzsniaa0NdJVNA-1742648415-1.2.1.1-d.Ca2P0QkU14cC0m2vtrvJVSBuwxHAt97GLurkp77PhO8ds7ttvUi4rT70ynq0B0shpfbnBRT0G767aiVcn3K4Pee2kOH_mhpcZQsaba8XYDtv40uA1bOW5H0Ec3rW_ZVI8OHbcc8LOTAEinRFMrUQx1ndtX774eZ4SiDFDofRSJ.UClV22dKqe1qRxAPlBXUl2we9ZaVt3YUFebfaRSup1eqZ8OLDP05X2X3CDk5QBMlPbSgU.cLyJYevWBbcsAh3Jo8UnMBghAcSGwhHeq.bgL4SfK4qLBej9rh7FdTxksN0MsovGgucUNyud_sOrLWMZ.uLlgUAApoXrYR.5PwJODNEFesP9rDXNxwR3PcMc',
  Referer: 'https://www.showbox.media/movie/m-captain-america-brave-new-world-2024',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

async function sbGetInfo(link: string): Promise<{
  title: string;
  rating: string;
  synopsis: string;
  image: string;
  imdbId: string;
  type: 'movie' | 'series';
  linkList: Link[];
}> {
  try {
    const url = link;
    const res = await fetch(url, { headers });
    
    if (!res.ok) {
      throw new Error(`Failed to fetch details: ${res.status}`);
    }
    
    const data = await res.text();
    const $ = load(data);
    
    const type = url.includes('/tv/') ? 'series' : 'movie';
    const imdbId = '';
    const title = $('.heading-name').text();
    
    // find only numbers in the string
    const rating = $('.btn-imdb')
      .text()
      ?.match(/\d+(\.\d+)?/g)?.[0] || '';
    
    const image = $('.cover_follow').attr('style')?.split('url(')[1]?.split(')')[0] || '';
    
    const synopsis = $('.description')
      .text()
      ?.replaceAll(/[\n\t]/g, '')
      ?.trim();

    const febID = $('.heading-name').find('a').attr('href')?.split('/')?.pop();
    const baseUrl = url.split('/').slice(0, 3).join('/');
    const indexUrl = `${baseUrl}/index/share_link?id=${febID}&type=${
      type === 'series' ? '2' : '1'
    }`;

    console.log('Fetching index from:', indexUrl);
    const indexRes = await fetch(indexUrl, { headers });
    
    if (!indexRes.ok) {
      throw new Error(`Failed to fetch index: ${indexRes.status}`);
    }
    
    const indexData = await indexRes.json();
    console.log('Index data:', indexData);
    const febKey = indexData.data.link.split('/').pop();

    let febLink: string;
    
    // For TV shows, use the correct febbox URL format
    if (type === 'series') {
      febLink = `https://www.febbox.com/file/file_share_list?share_key=${febKey}&pwd=&parent_id=&is_html=0`;
      console.log('TV show febbox URL:', febLink);
    } else {
      febLink = `https://www.febbox.com/file/file_share_list?share_key=${febKey}&is_html=0`;
      console.log('Movie febbox URL:', febLink);
    }

    const febRes = await fetch(febLink, { headers });
    
    if (!febRes.ok) {
      throw new Error(`Failed to fetch febbox: ${febRes.status}`);
    }
    
    const febData = await febRes.json();
    console.log('Febbox data:', febData);
    const fileList = febData?.data?.file_list;

    const links: Link[] = [];
    if (fileList) {
      fileList.map((file: any) => {
        const fileName = `${file.file_name} (${file.file_size})`;
        const fileId = file.fid;
        
        // For TV shows, format the episodesLink differently
        if (type === 'series') {
          links.push({
            title: fileName,
            episodesLink: file.is_dir ? `${febKey}&${fileId}` : `${febKey}&${fileId}`,
          });
        } else {
          links.push({
            title: fileName,
            episodesLink: file.is_dir ? `${febKey}&${fileId}` : `${febKey}&`,
          });
        }
      });
    }

    return {
      title,
      rating,
      synopsis,
      image,
      imdbId,
      type,
      linkList: links,
    };
  } catch (err) {
    console.error('sbGetInfo error:', err);
    return {
      title: '',
      rating: '',
      synopsis: '',
      image: '',
      imdbId: '',
      type: 'movie',
      linkList: [],
    };
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<ShowboxDetailsResponse>> {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      return createUnauthorizedResponse(authResult.error || 'Invalid API key') as NextResponse<ShowboxDetailsResponse>;
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json<ShowboxDetailsResponse>(
        { 
          success: false, 
          error: 'URL is required',
          message: 'Please provide a Showbox detail page URL parameter'
        },
        { status: 400 }
      );
    }

    // Validate that it's a Showbox URL
    if (!url.includes('showbox.media')) {
      return NextResponse.json<ShowboxDetailsResponse>(
        { 
          success: false, 
          error: 'Invalid URL',
          message: 'URL must be from showbox.media'
        },
        { status: 400 }
      );
    }

    console.log('Processing Showbox details request for URL:', url);

    const details = await sbGetInfo(url);

    if (!details.title) {
      return NextResponse.json<ShowboxDetailsResponse>({
        success: false,
        error: 'No details found',
        message: 'No details could be extracted from the provided URL',
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
      });
    }

    return NextResponse.json<ShowboxDetailsResponse>({
      success: true,
      data: details,
      remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
    });

  } catch (error: unknown) {
    console.error('Showbox details API error:', error);
    
    return NextResponse.json<ShowboxDetailsResponse>(
      { 
        success: false, 
        error: 'Failed to extract details',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
