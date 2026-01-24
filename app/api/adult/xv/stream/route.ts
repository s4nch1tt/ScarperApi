import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

const PROXY_URL = 'https://odd-cloud-1e14.hunternisha55.workers.dev/';
const BASE_URL = 'https://xvideos.place';

interface RelatedVideo {
  id: number;
  eid: string;
  u: string;
  i: string;
  tf: string;
  t: string;
  d: string;
  r: string;
  n: string;
  p: string;
  pn: string;
  pu: string;
}

interface VideoData {
  success: boolean;
  videoUrl: string | null;
  videoType: string | null;
  imageUrl: string | null;
  title: string | null;
  relatedVideos: RelatedVideo[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoUrl = searchParams.get('url');

    if (!videoUrl) {
      return NextResponse.json(
        { success: false, error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // Step 1: Fetch through proxy to get iframe URL
    const proxyResponse = await axios.get(`${PROXY_URL}?url=${encodeURIComponent(videoUrl)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    const proxyHtml = proxyResponse.data;
    
    // Extract iframe URL
    const iframeMatch = proxyHtml.match(/<iframe\s+id="html5video"\s+src="([^"]+)"/);
    if (!iframeMatch) {
      return NextResponse.json(
        { success: false, error: 'Failed to extract iframe URL' },
        { status: 404 }
      );
    }

    const iframeUrl = iframeMatch[1];

    // Extract related videos from proxy HTML (not iframe)
    let relatedVideos: RelatedVideo[] = [];
    const $proxy = cheerio.load(proxyHtml);
    
    $proxy('script').each((_, script) => {
      const scriptContent = $proxy(script).html();
      if (scriptContent && scriptContent.includes('var video_related')) {
        try {
          // Use regex to extract the array more reliably
          const match = scriptContent.match(/var\s+video_related\s*=\s*(\[[\s\S]*?\]);/);
          if (match && match[1]) {
            relatedVideos = JSON.parse(match[1]);
            console.log(`Successfully parsed ${relatedVideos.length} related videos from proxy HTML`);
            return false; // Break out of .each()
          }
        } catch (parseError) {
          console.error('Error parsing related videos with regex, trying fallback:', parseError);
          
          // Fallback: try to find the array between [ and ];
          const startMatch = scriptContent.match(/var\s+video_related\s*=\s*\[/);
          if (startMatch) {
            const startIndex = scriptContent.indexOf(startMatch[0]) + startMatch[0].length - 1;
            const endMatch = scriptContent.substring(startIndex).match(/\];/);
            if (endMatch) {
              const jsonStr = scriptContent.substring(startIndex, startIndex + endMatch.index! + 1);
              try {
                relatedVideos = JSON.parse(jsonStr);
                console.log(`Successfully parsed ${relatedVideos.length} related videos (fallback method)`);
              } catch (fallbackError) {
                console.error('Fallback parsing also failed:', fallbackError);
              }
            }
          }
        }
      }
    });

    // Transform related videos URLs to include base URL
    relatedVideos = relatedVideos.map(video => ({
      ...video,
      u: video.u.startsWith('http') ? video.u : `${BASE_URL}${video.u}`
    }));

    // Step 2: Fetch iframe content to extract video URL and related videos
    const iframeResponse = await axios.get(iframeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': PROXY_URL
      }
    });

    const iframeHtml = iframeResponse.data;

    // Extract video URL from iframe
    const videoUrlMatch = iframeHtml.match(/var\s+videoUrl\s*=\s*"([^"]+)"/);
    const videoTypeMatch = iframeHtml.match(/var\s+videoType\s*=\s*"([^"]+)"/);
    const imageUrlMatch = iframeHtml.match(/var\s+imageUrl\s*=\s*"([^"]+)"/);

    // Extract video title from HTML5Player initialization in proxy HTML
    const titleMatch = proxyHtml.match(/html5player\.setVideoTitle\('([^']+)'\)/);

    const result: VideoData = {
      success: true,
      videoUrl: videoUrlMatch ? videoUrlMatch[1] : null,
      videoType: videoTypeMatch ? videoTypeMatch[1] : null,
      imageUrl: imageUrlMatch ? imageUrlMatch[1] : null,
      title: titleMatch ? titleMatch[1] : null,
      relatedVideos: relatedVideos
    };

    if (!result.videoUrl) {
      return NextResponse.json(
        { success: false, error: 'Failed to extract video URL from iframe' },
        { status: 404 }
      );
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error processing xv video:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process video',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
