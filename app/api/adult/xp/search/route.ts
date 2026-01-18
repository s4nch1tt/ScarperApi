import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { xp } from '@/app/url/baseurl';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q');
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    const searchUrl = `${xp}?s=${encodeURIComponent(query)}`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch search results' },
        { status: response.status }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract search query from the page
    const searchQuery = $('.search-title span').text().trim() || query;

    // Extract search results
    const results: Array<{
      title: string;
      url: string;
      image: string;
      date: string;
    }> = [];

    $('.col-md-2.col-sm-3.col-xs-6').each((_, element) => {
      const $element = $(element);
      
      const titleElement = $element.find('h3.h1title');
      const linkElement = $element.find('div.bw_thumb a');
      const imageElement = $element.find('img.wp-post-image');
      const dateElement = $element.find('div.bw_date');

      const title = titleElement.text().trim();
      const url = linkElement.attr('href') || '';
      const image = imageElement.attr('src') || '';
      const date = dateElement.text().replace(/\s*<i[^>]*>.*?<\/i>\s*/g, '').trim();

      if (title && url) {
        results.push({
          title,
          url,
          image,
          date
        });
      }
    });

    return NextResponse.json({
      success: true,
      query: searchQuery,
      totalResults: results.length,
      results
    });

  } catch (error) {
    console.error('Error searching xprimehub:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
