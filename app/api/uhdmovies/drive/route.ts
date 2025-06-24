import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // First request to get the redirect URL
    const driveLeach = await axios.get(url);
    const scriptMatch = driveLeach.data.match(
      /window\.location\.replace\("([^"]+)"\)/
    );
    
    if (!scriptMatch || !scriptMatch[1]) {
      return NextResponse.json({
        error: 'No redirect path found',
        data: driveLeach.data
      });
    }

    const redirectPath = scriptMatch[1];
    let fileUrl = redirectPath;
    
    // If it's a relative path, construct full URL
    if (redirectPath.startsWith('/')) {
      const mainUrl = url.split('/')[2];
      fileUrl = `https://${mainUrl}${redirectPath}`;
    }

    // Make request to the file page
    const filePageResponse = await axios.get(fileUrl);
    const $ = cheerio.load(filePageResponse.data);
    
    // Extract instant download link
    const instantDownloadLink = $('.btn-danger').attr('href') || null;
    
    // Extract resume cloud link
    const resumeCloudHref = $('.btn-warning').attr('href');
    const resumeCloudLink = resumeCloudHref ? `https://${new URL(fileUrl).hostname}${resumeCloudHref}` : null;

    let cloudResumeDownload = null;
    
    // If resume cloud link exists, make request to get the actual download link
    if (resumeCloudLink) {
      try {
        const resumeResponse = await axios.get(resumeCloudLink);
        const $resume = cheerio.load(resumeResponse.data);
        cloudResumeDownload = $resume('.btn-success').attr('href') || null;
      } catch (error) {
        console.log('Failed to get resume cloud download link');
      }
    }

    return NextResponse.json({
      fileUrl,
      instantDownload: instantDownloadLink,
      resumeCloud: resumeCloudLink,
      cloudResumeDownload: cloudResumeDownload
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
