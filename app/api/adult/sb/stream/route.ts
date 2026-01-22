import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';
import {
  validateProviderAccess,
  createProviderErrorResponse,
} from '@/lib/provider-validator';

const BASE_URL = 'https://spankbang.com';

export async function GET(req: NextRequest) {
  const validation = await validateProviderAccess(req, 'Adult');
  if (!validation.valid) {
    return createProviderErrorResponse(validation.error || 'Unauthorized');
  }

  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    const proxyUrl = `https://odd-cloud-1e14.hunternisha55.workers.dev/?url=${encodeURIComponent(
      url
    )}`;

    const response = await fetch(proxyUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.statusText}` },
        { status: response.status }
      );
    }

    const html = await response.text();
    const data = extractStreamData(html);

    if (!data) {
      return NextResponse.json(
        { error: 'Could not extract stream data from the page' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function absoluteUrl(path?: string | null) {
  if (!path) return '';
  return path.startsWith('http') ? path : `${BASE_URL}${path}`;
}

function extractStreamData(html: string) {
  try {
    const $ = load(html);

    // ana_video_id
    const videoIdMatch = html.match(
      /var\s+ana_video_id\s*=\s*'([^']+)'/
    );
    const ana_video_id = videoIdMatch ? videoIdMatch[1] : null;

    // stream_data
    const streamDataMatch = html.match(
      /var\s+stream_data\s*=\s*(\{[\s\S]*?\});/
    );

    let stream_data: any = null;

    if (streamDataMatch) {
      try {
        let jsonStr = streamDataMatch[1];
        jsonStr = jsonStr.replace(/'([^']*?)':/g, '"$1":');
        jsonStr = jsonStr.replace(/:\s*'([^']*?)'/g, ': "$1"');
        jsonStr = jsonStr.replace(/\[\s*'([^']*?)'\s*\]/g, '["$1"]');
        stream_data = JSON.parse(jsonStr);
      } catch {
        try {
          stream_data = JSON.parse(
            streamDataMatch[1].replace(/'/g, '"')
          );
        } catch (e) {
          console.error('stream_data parse failed', e);
        }
      }
    }

    // keywords
    const keywordsMatch = html.match(
      /var\s+live_keywords\s*=\s*'([^']+)'/
    );
    const live_keywords = keywordsMatch ? keywordsMatch[1] : null;

    // similar videos
    const similarVideos: any[] = [];

    $('.video-item[data-testid="video-item"]').each((_, element) => {
      const $item = $(element);

      const id = $item.attr('data-id') || '';

      const $link = $item.find('a[data-testid="video-item-thumb"]');
      const rawUrl = $link.attr('href');
      const url = absoluteUrl(rawUrl);

      const $img = $link.find('picture img');
      const thumbnail =
        $img.attr('data-src') || $img.attr('src') || '';
      const title = $img.attr('alt') || '';

      const duration = $link
        .find('[data-testid="video-item-length"]')
        .text()
        .trim();

      const resolution = $link
        .find('[data-testid="video-item-resolution"]')
        .text()
        .trim();

      const $videoInfo = $item.find(
        '[data-testid="video-info-with-badge"]'
      );

      const views = $videoInfo
        .find('[data-testid="views"] span:last-child')
        .text()
        .trim();

      const rating = $videoInfo
        .find('[data-testid="rates"] span:last-child')
        .text()
        .trim();

      const $channelLink = $videoInfo.find(
        '[data-testid="title"] a'
      );
      const channel = $channelLink.find('span').text().trim();
      const channelUrl = absoluteUrl($channelLink.attr('href'));

      const badgeType =
        $videoInfo
          .find('[data-testid="badge"]')
          .attr('data-badge') || '';

      if (id && title && url) {
        similarVideos.push({
          id,
          title,
          url,
          thumbnail,
          duration,
          resolution,
          views,
          rating,
          channel,
          channelUrl,
          badgeType,
        });
      }
    });

    if (!stream_data && !ana_video_id) {
      return null;
    }

    return {
      ana_video_id,
      live_keywords,
      similarVideos,
      stream_data,
      qualities: stream_data
        ? {
            '240p': stream_data['240p']?.[0] || null,
            '320p': stream_data['320p']?.[0] || null,
            '480p': stream_data['480p']?.[0] || null,
            '720p': stream_data['720p']?.[0] || null,
            '1080p': stream_data['1080p']?.[0] || null,
            '4k': stream_data['4k']?.[0] || null,
          }
        : null,
      hls: stream_data
        ? {
            master: stream_data['m3u8']?.[0] || null,
            '240p': stream_data['m3u8_240p']?.[0] || null,
            '320p': stream_data['m3u8_320p']?.[0] || null,
            '480p': stream_data['m3u8_480p']?.[0] || null,
            '720p': stream_data['m3u8_720p']?.[0] || null,
            '1080p': stream_data['m3u8_1080p']?.[0] || null,
            '4k': stream_data['m3u8_4k']?.[0] || null,
          }
        : null,
      mpd: stream_data?.['mpd']?.[0] || null,
      cover_image: stream_data?.['cover_image'] || null,
      thumbnail: stream_data?.['thumbnail'] || null,
      stream_raw_id: stream_data?.['stream_raw_id'] || null,
      stream_sheet: stream_data?.['stream_sheet'] || null,
      length: stream_data?.['length'] || null,
      main: stream_data?.['main']?.[0] || null,
    };
  } catch (error) {
    console.error('Error extracting stream data:', error);
    return null;
  }
}
