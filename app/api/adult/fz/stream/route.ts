import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { fm } from '@/app/url/baseurl';
import { fetchWithScraperApi } from '@/lib/scraper-api';

interface RecommendedVideo {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  trailer?: string;
  duration: string;
  views: string;
  rating?: string;
}

interface VideoData {
  success: boolean;
  videoUrl: string | null;
  poster: string | null;
  title: string | null;
  iframeUrl: string | null;
  recommendedVideos: RecommendedVideo[];
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

    // Step 1: Fetch the video page to get iframe URL
    const pageHtml = await fetchWithScraperApi(videoUrl);
    const $page = cheerio.load(pageHtml);

    // Extract iframe URL from video player
    const iframeUrl = $page('.video-player iframe').attr('src') || 
                      $page('iframe[src*="player-x.php"]').attr('src') ||
                      $page('.responsive-player iframe').attr('src');

    if (!iframeUrl) {
      return NextResponse.json(
        { success: false, error: 'Failed to extract iframe URL from video page' },
        { status: 404 }
      );
    }

    // Make iframe URL absolute if needed
    const fullIframeUrl = iframeUrl.startsWith('http') ? iframeUrl : `${fm}${iframeUrl}`;

    // Extract title from page
    const title = $page('h1.entry-title').text().trim() || 
                  $page('title').text().trim() ||
                  null;

    // Extract recommended videos
    const recommendedVideos: RecommendedVideo[] = [];
    $page('article.thumb-block').each((_, element) => {
      const $article = $page(element);
      
      const id = $article.attr('data-video-id') || '';
      const postId = $article.attr('data-post-id') || '';
      const videoTitle = $article.find('.title').text().trim();
      const url = $article.find('a').first().attr('href') || '';
      const thumbnail = $article.attr('data-main-thumb') || 
                        $article.find('img.video-main-thumb').attr('src') || 
                        $article.find('img.video-main-thumb').attr('data-src') || '';
      const trailer = $article.attr('data-trailer') || '';
      const duration = $article.find('.duration').text().trim();
      const views = $article.find('.views').text().replace(/\s+/g, ' ').trim();
      const rating = $article.find('.rating').text().replace(/\s+/g, ' ').trim();

      if (videoTitle && url) {
        recommendedVideos.push({
          id: postId || id,
          title: videoTitle,
          url,
          thumbnail,
          trailer: trailer || undefined,
          duration,
          views,
          rating: rating || undefined
        });
      }
    });

    // Step 2: Fetch iframe content to get video source
    const iframeHtml = await fetchWithScraperApi(fullIframeUrl);
    const $iframe = cheerio.load(iframeHtml);

    // Extract video source URL
    const videoSrc = $iframe('video source[type="video/mp4"]').attr('src') ||
                     $iframe('video source').first().attr('src') ||
                     $iframe('source[src*=".mp4"]').attr('src') ||
                     null;

    // Extract poster image
    const poster = $iframe('video').attr('poster') || null;

    if (!videoSrc) {
      return NextResponse.json(
        { success: false, error: 'Failed to extract video source URL from iframe' },
        { status: 404 }
      );
    }

    const result: VideoData = {
      success: true,
      videoUrl: videoSrc,
      poster,
      title,
      iframeUrl: fullIframeUrl,
      recommendedVideos
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error processing fz video stream:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process video stream',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
