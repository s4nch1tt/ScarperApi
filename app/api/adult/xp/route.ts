import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { xp } from '@/app/url/baseurl';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = searchParams.get('page') || '1';
    
    const url = page === '1' ? xp : `${xp}page/${page}/`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch content' },
        { status: response.status }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const items: Array<{
      title: string;
      url: string;
      image: string;
      date: string;
    }> = [];

    $('.col-md-2.col-sm-3.col-xs-6').each((_, element) => {
      const $element = $(element);
      
      const titleElement = $element.find('h1.h1title');
      const linkElement = $element.find('div.bw_thumb a');
      const imageElement = $element.find('img');
      const dateElement = $element.find('div.bw_date');

      const title = titleElement.text().trim();
      const url = linkElement.attr('href') || '';
      const image = imageElement.attr('src') || '';
      const date = dateElement.text().trim();

      if (title && url) {
        items.push({
          title,
          url,
          image,
          date
        });
      }
    });

    // Extract pagination info
    const currentPage = parseInt(page);
    const nextPageLink = $('.nextpostslink').attr('href');
    const hasNextPage = !!nextPageLink;

    return NextResponse.json({
      success: true,
      page: currentPage,
      hasNextPage,
      totalItems: items.length,
      items
    });

  } catch (error) {
    console.error('Error scraping xprimehub:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
