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

interface SearchData {
  success: boolean;
  query: string;
  totalResults: string;
  videos: Video[];
  filter?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') ;
    const filter = searchParams.get('filter') || 'latest';
    const page = searchParams.get('page') || '1';

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Search query is required (use ?query= or ?q=)' },
        { status: 400 }
      );
    }

    // Build search URL
    let targetUrl = `${fm}search/${encodeURIComponent(query)}/`;
    
    // Add page if not first page
    if (page !== '1') {
      targetUrl = `${fm}page/${page}/`;
      targetUrl += `?s=${encodeURIComponent(query)}`;
    }
    
    // Add filter
    if (filter !== 'latest') {
      targetUrl += page === '1' ? `?filter=${filter}` : `&filter=${filter}`;
    }

    // Fetch the search results page
    const html = await fetchWithScraperApi(targetUrl);
    const $ = cheerio.load(html);

    // Extract total results count
    const totalResults = $('.search-video-number').text().trim();

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

    const result: SearchData = {
      success: true,
      query,
      totalResults,
      videos,
      filter
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error searching fuckmaza:', error);
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
