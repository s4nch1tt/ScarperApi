import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { hmasterBaseUrl } from '@/app/url/baseurl';
import { validateProviderAccess, createProviderErrorResponse } from '@/lib/provider-validator';

export async function GET(request: NextRequest) {
  const validation = await validateProviderAccess(request, "Adult");
  if (!validation.valid) {
    return createProviderErrorResponse(validation.error || "Unauthorized");
  }

  try {
    const baseUrl = Buffer.from(hmasterBaseUrl, 'base64').toString('utf-8');

    const data: {
      videos: Array<{
        id: number;
        title: string;
        duration: number;
        created: number;
        videoType: string;
        pageURL: string;
        thumbURL: string;
        imageURL: string;
        previewThumbURL: string;
        spriteURL: string;
        trailerURL: string;
        views: number;
        landing: {
          type: string;
          id: number;
          name: string;
          logo: string;
          link: string;
          subscribers: number | null;
        };
      }>;
    } = {
      videos: []
    };

    const extractVideos = ($: ReturnType<typeof cheerio.load>) => {
      const videos: typeof data.videos = [];
      
      try {
        $('script').each((_, script) => {
          const scriptContent = $(script).html();
          if (scriptContent && scriptContent.includes('videoThumbProps')) {
            try {
              const jsonMatch = scriptContent.match(/window\.initials\s*=\s*({[\s\S]*?});/);
              if (jsonMatch) {
                const jsonData = JSON.parse(jsonMatch[1]);
                
                // Navigate to videoThumbProps
                if (jsonData?.layoutPage?.videoListProps?.videoThumbProps) {
                  const videoThumbProps = jsonData.layoutPage.videoListProps.videoThumbProps;
                  
                  videoThumbProps.forEach((video: {
                    id: number;
                    title: string;
                    duration: number;
                    created: number;
                    videoType: string;
                    pageURL: string;
                    thumbURL: string;
                    imageURL: string;
                    previewThumbURL: string;
                    spriteURL: string;
                    trailerURL: string;
                    views: number;
                    landing?: {
                      type?: string;
                      id?: number;
                      name?: string;
                      logo?: string;
                      link?: string;
                      subscribers?: number | null;
                    };
                  }) => {
                    if (video.id && video.title) {
                      videos.push({
                        id: video.id,
                        title: video.title,
                        duration: video.duration,
                        created: video.created,
                        videoType: video.videoType,
                        pageURL: video.pageURL,
                        thumbURL: video.thumbURL,
                        imageURL: video.imageURL,
                        previewThumbURL: video.previewThumbURL,
                        spriteURL: video.spriteURL,
                        trailerURL: video.trailerURL,
                        views: video.views,
                        landing: {
                          type: video.landing?.type || '',
                          id: video.landing?.id || 0,
                          name: video.landing?.name || '',
                          logo: video.landing?.logo || '',
                          link: video.landing?.link || '',
                          subscribers: video.landing?.subscribers || null
                        }
                      });
                    }
                  });
                }
              }
            } catch (parseError) {
              console.error('Error parsing JSON from script:', parseError);
            }
          }
        });
      } catch (error) {
        console.error('Error extracting videos:', error);
      }
      
      return videos;
    };

    // Fetch and parse 5 pages with custom headers
    const headers = {
      'sec-ch-ua': '"Brave";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-platform': '"Android"',
      'sec-ch-ua-platform-version': '"13"',
      'upgrade-insecure-requests': '1',
      'user-agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36',
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.9',
      'accept-encoding': 'gzip, deflate, br'
    };

    for (let page = 1; page <= 5; page++) {
      const pageUrl = page === 1 ? baseUrl : `${baseUrl}/${page}`;
      
      try {
        const response = await axios.get(pageUrl, { headers });
        const html = response.data;
        const $ = cheerio.load(html);
        const videos = extractVideos($);
        data.videos.push(...videos);
        console.log(`Fetched ${videos.length} videos from page ${page}`);
      } catch (pageError) {
        console.error(`Error fetching page ${page}:`, pageError);
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching xmaster data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch xmaster data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}