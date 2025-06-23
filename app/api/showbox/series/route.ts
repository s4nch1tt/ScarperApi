import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

interface ShowboxSeriesResponse {
  success: boolean;
  data?: any;
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

export async function GET(request: NextRequest): Promise<NextResponse<ShowboxSeriesResponse>> {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      return createUnauthorizedResponse(authResult.error || 'Invalid API key') as NextResponse<ShowboxSeriesResponse>;
    }

    const { searchParams } = new URL(request.url);
    const episodeId = searchParams.get('episode_id') || searchParams.get('id');

    if (!episodeId) {
      return NextResponse.json<ShowboxSeriesResponse>(
        { 
          success: false, 
          error: 'Episode ID is required',
          message: 'Please provide an episode_id parameter (e.g., vzqprWJd&2798715)'
        },
        { status: 400 }
      );
    }

    // Check if episodeId contains & to extract share_key and file_id
    if (!episodeId.includes('&')) {
      return NextResponse.json<ShowboxSeriesResponse>(
        { 
          success: false, 
          error: 'Invalid episode ID format',
          message: 'Episode ID must contain & separator (e.g., vzqprWJd&2798715)'
        },
        { status: 400 }
      );
    }

    const [shareKey, fileId] = episodeId.split('&');

    if (!shareKey || !fileId) {
      return NextResponse.json<ShowboxSeriesResponse>(
        { 
          success: false, 
          error: 'Invalid episode ID format',
          message: 'Episode ID must be in format: shareKey&fileId (e.g., vzqprWJd&2798715)'
        },
        { status: 400 }
      );
    }

    console.log('Processing TV series request for Episode ID:', episodeId);
    console.log('Extracted - Share Key:', shareKey, 'File ID:', fileId);

    // Create the febbox URL as requested
    const febboxUrl = `https://www.febbox.com/file/file_share_list?share_key=${shareKey}&pwd=&parent_id=${fileId}&is_html=0`;
    console.log('Constructed febbox URL:', febboxUrl);

    const response = await fetch(febboxUrl, { headers });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from febbox: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Febbox response:', data);

    return NextResponse.json<ShowboxSeriesResponse>({
      success: true,
      data: data,
      remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
    });

  } catch (error: unknown) {
    console.error('Showbox series API error:', error);
    
    return NextResponse.json<ShowboxSeriesResponse>(
      { 
        success: false, 
        error: 'Failed to fetch series episodes',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
