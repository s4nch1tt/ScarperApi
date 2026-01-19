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
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    // Construct search URL
    const searchUrl = `${xozillaBaseUrl}search/${encodeURIComponent(query)}/`;

    // Fetch the search results page
    const html = await fetchWithScraperApi(searchUrl);
    const $ = cheerio.load(html);

    // Initialize data structure
    const data: {
      success: boolean;
      query: string;
      searchUrl: string;
      videos: Array<{
        title: string;
        url: string;
        imageUrl: string;
        videoPreviewUrl?: string;
        duration?: string;
        hdLabel?: boolean;
      }>;
    } = {
      success: true,
      query,
      searchUrl,
      videos: []
    };

    // Extract videos from search results
    $('#list_videos_videos_list_search_result_items a.item, .list-videos .margin-fix a.item').each((_, element) => {
      const $el = $(element);
      const url = $el.attr('href') || '';
      const vthumb = $el.attr('vthumb') || '';
      const title = $el.find('strong.title').text().trim();
      const $img = $el.find('img.thumb');
      const imageUrl = $img.attr('data-original') || $img.attr('src') || '';
      const duration = $el.find('.duration').text().trim();
      const hasHdLabel = $el.find('.hd-label').length > 0;

      if (title && url) {
        data.videos.push({
          title,
          url,
          imageUrl,
          videoPreviewUrl: vthumb || undefined,
          duration: duration || undefined,
          hdLabel: hasHdLabel || undefined,
        });
      }
    });

    if (data.videos.length === 0) {
      data.success = false;
    }

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Error searching xozilla:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to search videos',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}