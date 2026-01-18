import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const url = searchParams.get('url');
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

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

    // Extract title
    const title = $('h1.bw_h1title_single').text().trim();

    // Extract movie info
    const movieInfo: Record<string, string> = {};
    $('.bw_desc strong').each((_, element) => {
      const text = $(element).text().trim();
      if (text.includes('Movie Name:')) {
        movieInfo.movieName = $(element).parent().text().replace(/.*Movie Name:\s*/, '').split('\n')[0].trim();
      }
      if (text.includes('Release Year:')) {
        movieInfo.releaseYear = $(element).parent().text().replace(/.*Release Year:\s*/, '').split('\n')[0].trim();
      }
      if (text.includes('Language:')) {
        movieInfo.language = $(element).parent().text().replace(/.*Language:\s*/, '').split('\n')[0].trim();
      }
      if (text.includes('Quality:')) {
        movieInfo.quality = $(element).parent().text().replace(/.*Quality:\s*/, '').split('\n')[0].trim();
      }
      if (text.includes('Format:')) {
        movieInfo.format = $(element).parent().text().replace(/.*Format:\s*/, '').split('\n')[0].trim();
      }
    });

    // Extract synopsis/plot
    let synopsis = '';
    $('.bw_desc p').each((_, element) => {
      const text = $(element).text().trim();
      if (text.includes('Short Film') && text.includes('HDRip Download')) {
        synopsis = text;
      }
    });

    // Extract screenshots
    const screenshots: string[] = [];
    $('.bw_desc img').each((_, element) => {
      const src = $(element).attr('src');
      if (src && src.includes('imgbb')) {
        screenshots.push(src);
      }
    });

    // Extract download links
    const downloadLinks: Array<{ quality: string; size: string; url: string }> = [];
    $('.bw_desc a').each((_, element) => {
      const $link = $(element);
      const href = $link.attr('href');
      const buttonText = $link.find('button').text().trim();
      
      if (href && buttonText.includes('Download Now')) {
        const qualityMatch = $link.closest('h5').text().match(/(\d+p)/);
        const sizeMatch = $link.closest('h5').text().match(/\[(\d+MB)\]/);
        
        downloadLinks.push({
          quality: qualityMatch ? qualityMatch[1] : 'Unknown',
          size: sizeMatch ? sizeMatch[1] : 'Unknown',
          url: href
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        title,
        movieInfo,
        synopsis,
        screenshots,
        downloadLinks,
        sourceUrl: url
      }
    });

  } catch (error) {
    console.error('Error scraping xprimehub details:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
