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
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    // Fetch the video page
    const html = await fetchWithScraperApi(url);
    const $ = cheerio.load(html);

    // Initialize data structure
    const data: {
      success: boolean;
      videoId?: string;
      title?: string;
      videoUrl?: string;
      embedUrl?: string;
      previewUrl?: string;
      previewVideoUrl?: string;
      thumbnailUrl?: string;
      duration?: number;
      categories?: string;
      tags?: string;
      playerWidth?: string;
      playerHeight?: string;
      relatedVideos?: Array<{
        videoId: string;
        title: string;
        url: string;
        thumbnailUrl?: string;
        previewVideoUrl?: string;
      }>;
    } = {
      success: false
    };

    // Extract flashvars data from script tag
    const scripts = $('script').toArray();
    for (const script of scripts) {
      const scriptContent = $(script).html() || '';
      
      // Look for flashvars object
      if (scriptContent.includes('var flashvars = {')) {
        try {
          // Extract video_id
          const videoIdMatch = scriptContent.match(/video_id:\s*'(\d+)'/);
          if (videoIdMatch) data.videoId = videoIdMatch[1];

          // Extract video_title
          const titleMatch = scriptContent.match(/video_title:\s*'([^']+)'/);
          if (titleMatch) data.title = titleMatch[1];

          // Extract video_url (the main streaming URL)
          const videoUrlMatch = scriptContent.match(/video_url:\s*'([^']+)'/);
          if (videoUrlMatch) data.videoUrl = videoUrlMatch[1];

          // Extract embed URL from getEmbed function
          const embedMatch = scriptContent.match(/src="\s*([^"]+\/embed\/\d+)\s*"/);
          if (embedMatch) data.embedUrl = embedMatch[1].trim();

          // Extract preview_url
          const previewUrlMatch = scriptContent.match(/preview_url:\s*'([^']+)'/);
          if (previewUrlMatch) data.previewUrl = previewUrlMatch[1];

          // Extract preview_url1 (thumbnail)
          const previewUrl1Match = scriptContent.match(/preview_url1:\s*'([^']+)'/);
          if (previewUrl1Match) data.thumbnailUrl = previewUrl1Match[1];

          // Extract preview_url2 (video thumbnail)
          const previewUrl2Match = scriptContent.match(/preview_url2:\s*'([^']+)'/);
          if (previewUrl2Match) data.previewVideoUrl = previewUrl2Match[1];

          // Extract duration
          const durationMatch = scriptContent.match(/duration:\s*'(\d+)'/);
          if (durationMatch) data.duration = parseInt(durationMatch[1]);

          // Extract categories
          const categoriesMatch = scriptContent.match(/video_categories:\s*'([^']+)'/);
          if (categoriesMatch) data.categories = categoriesMatch[1];

          // Extract tags
          const tagsMatch = scriptContent.match(/video_tags:\s*'([^']+)'/);
          if (tagsMatch) data.tags = tagsMatch[1];

          // Extract player dimensions
          const widthMatch = scriptContent.match(/player_width:\s*'(\d+)'/);
          if (widthMatch) data.playerWidth = widthMatch[1];

          const heightMatch = scriptContent.match(/player_height:\s*'(\d+)'/);
          if (heightMatch) data.playerHeight = heightMatch[1];

          if (data.videoUrl) {
            data.success = true;
          }
          break;
        } catch (e) {
          console.error('Error parsing flashvars:', e);
        }
      }
    }

    if (!data.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to extract video URL from page' },
        { status: 404 }
      );
    }

    // Extract related videos
    const relatedVideos: Array<{
      videoId: string;
      title: string;
      url: string;
      thumbnailUrl?: string;
      previewVideoUrl?: string;
    }> = [];

    $('#list_videos_related_videos_items a.item').each((_, element) => {
      const $element = $(element);
      const href = $element.attr('href');
      const vthumb = $element.attr('vthumb');
      const title = $element.find('strong.title').text().trim();
      
      // Prioritize data-original or thumb attribute over src to avoid base64 placeholder
      const $img = $element.find('img.thumb');
      const thumbnailUrl = $img.attr('data-original') || $img.attr('thumb') || $img.attr('src');
      
      // Extract video ID from onclick attribute
      const onclickAttr = $element.attr('onclick');
      let videoId = '';
      if (onclickAttr) {
        const videoIdMatch = onclickAttr.match(/'event_label':\s*(\d+)/);
        if (videoIdMatch) {
          videoId = videoIdMatch[1];
        }
      }

      if (href && title && videoId) {
        relatedVideos.push({
          videoId,
          title,
          url: href,
          thumbnailUrl,
          previewVideoUrl: vthumb
        });
      }
    });

    if (relatedVideos.length > 0) {
      data.relatedVideos = relatedVideos;
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