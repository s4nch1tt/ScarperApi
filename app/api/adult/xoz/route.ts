import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { xozillaBaseUrl } from '@/app/url/baseurl';
import { validateProviderAccess, createProviderErrorResponse } from '@/lib/provider-validator';
import { fetchWithScraperApi } from '@/lib/scraper-api';

export async function GET(request: NextRequest) {
  const validation = await validateProviderAccess(request, "Adult");
  if (!validation.valid) {
    return createProviderErrorResponse(validation.error || "Unauthorized");
  }
  try {
    // Fetch the homepage HTML
    const html = await fetchWithScraperApi(xozillaBaseUrl);
    const $ = cheerio.load(html);

    // Initialize data structure
    const data: {
      videosWatchedRightNow: Array<{
        title: string;
        url: string;
        imageUrl: string;
        videoPreviewUrl?: string;
        duration?: string;
        hdLabel?: boolean;
      }>;
      sections: Array<{
        sectionName: string;
        videos: Array<{
          title: string;
          url: string;
          imageUrl: string;
          videoPreviewUrl?: string;
          duration?: string;
          hdLabel?: boolean;
        }>;
      }>;
    } = {
      videosWatchedRightNow: [],
      sections: []
    };

    // Extract videos from "Videos Watched Right Now" section
    $('#list_videos_videos_watched_right_now_items a.item').each((_, element) => {
      const $el = $(element);
      const url = $el.attr('href') || '';
      const vthumb = $el.attr('vthumb') || '';
      const title = $el.find('strong.title').text().trim();
      const $img = $el.find('img.thumb');
      const imageUrl = $img.attr('data-original') || $img.attr('src') || '';
      const duration = $el.find('.duration').text().trim();
      const hasHdLabel = $el.find('.hd-label').length > 0;

      if (title && url) {
        data.videosWatchedRightNow.push({
          title,
          url,
          imageUrl,
          videoPreviewUrl: vthumb || undefined,
          duration: duration || undefined,
          hdLabel: hasHdLabel || undefined,
        });
      }
    });

    // Extract all video sections from the page
    $('.box .list-videos').each((_, box) => {
      const $box = $(box);
      const $marginFix = $box.find('.margin-fix');
      
      // Try to get section name from the parent or preceding elements
      let sectionName = 'Unknown Section';
      const $parent = $box.parent();
      const $heading = $parent.prev('h1, h2, h3, .title-box');
      if ($heading.length > 0) {
        sectionName = $heading.text().trim();
      } else {
        // Try to get from the margin-fix id
        const id = $marginFix.attr('id');
        if (id) {
          sectionName = id.replace(/_/g, ' ').replace('list videos ', '').replace(' items', '');
        }
      }

      const videos: typeof data.videosWatchedRightNow = [];

      $marginFix.find('a.item').each((_, element) => {
        const $el = $(element);
        const url = $el.attr('href') || '';
        const vthumb = $el.attr('vthumb') || '';
        const title = $el.find('strong.title').text().trim();
        const $img = $el.find('img.thumb');
        const imageUrl = $img.attr('data-original') || $img.attr('src') || '';
        const duration = $el.find('.duration').text().trim();
        const hasHdLabel = $el.find('.hd-label').length > 0;

        if (title && url) {
          videos.push({
            title,
            url,
            imageUrl,
            videoPreviewUrl: vthumb || undefined,
            duration: duration || undefined,
            hdLabel: hasHdLabel || undefined,
          });
        }
      });

      if (videos.length > 0) {
        data.sections.push({
          sectionName,
          videos
        });
      }
    });

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Error fetching xozilla homepage:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch homepage',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}