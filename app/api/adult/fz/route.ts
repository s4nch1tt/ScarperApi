import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { fm } from '@/app/url/baseurl';
import { fetchWithScraperApi } from '@/lib/scraper-api';

interface Video {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  trailer?: string;
  duration: string;
  views: string;
  rating?: string;
}

interface ScrapedData {
  success: boolean;
  videos: Video[];
  totalVideos: number;
  filter?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'latest';
    const page = searchParams.get('page') || '1';

    // Build URL based on filter
    let targetUrl = fm;
    const filterParam = filter !== 'latest' ? `?filter=${filter}` : '';
    
    if (page !== '1') {
      targetUrl = `${fm}page/${page}/${filterParam}`;
    } else {
      targetUrl = `${fm}${filterParam}`;
    }

    // Fetch the page
    const html = await fetchWithScraperApi(targetUrl);
    const $ = cheerio.load(html);

    const videos: Video[] = [];

    // Parse video articles
    $('article.thumb-block').each((_, element) => {
      const $article = $(element);
      
      const id = $article.attr('data-video-id') || '';
      const postId = $article.attr('data-post-id') || '';
      const title = $article.find('.title').text().trim();
      const url = $article.find('a').first().attr('href') || '';
      const thumbnail = $article.attr('data-main-thumb') || 
                        $article.find('img.video-main-thumb').attr('src') || 
                        $article.find('img.video-main-thumb').attr('data-src') || '';
      const trailer = $article.attr('data-trailer') || '';
      const duration = $article.find('.duration').text().trim();
      const views = $article.find('.views').text().replace(/\s+/g, ' ').trim();
      const rating = $article.find('.rating').text().replace(/\s+/g, ' ').trim();

      if (title && url) {
        videos.push({
          id: postId || id,
          title,
          url,
          thumbnail,
          trailer: trailer || undefined,
          duration,
          views,
          rating: rating || undefined
        });
      }
    });

    const result: ScrapedData = {
      success: true,
      videos,
      totalVideos: videos.length,
      filter
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error scraping fuckmaza:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to scrape videos',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
