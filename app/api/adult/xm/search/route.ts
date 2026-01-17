import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { userSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Helper function to format duration from seconds to HH:MM:SS
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export async function GET(request: NextRequest) {
  try {
    // Enforce adult consent
    const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Adult content requires login and consent', adult_consent_required: true },
        { status: 403 }
      );
    }
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
    if (!settings?.adultEnabled) {
      return NextResponse.json(
        { success: false, error: 'Adult content disabled for this account', adult_consent_required: true },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const page = searchParams.get('page') || '1';

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query parameter (q) is required' },
        { status: 400 }
      );
    }

    // Replace spaces with + and build the URL
    const encodedQuery = query.replace(/\s+/g, '+');
    const pageNum = parseInt(page);
    const url = pageNum > 1 
      ? `https://xhamster.com/search/${encodedQuery}?page=${pageNum}`
      : `https://xhamster.com/search/${encodedQuery}`;

    // Fetch the search page with custom headers
    const response = await axios.get(url, {
      headers: {
        'sec-ch-ua': '"Brave";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': '"Android"',
        'sec-ch-ua-platform-version': '"13"',
        'upgrade-insecure-requests': '1',
        'user-agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
        'accept-encoding': 'gzip, deflate, br'
      }
    });

    // Extract JSON data from response
    let jsonData: Record<string, unknown> | null = null;
    const jsonMatch = response.data.match(/window\.initials\s*=\s*({[\s\S]*?});/);
    if (jsonMatch) {
      try {
        jsonData = JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.error('Failed to parse JSON data:', e);
      }
    }

    // Extract data from JSON
    const entity = jsonData?.entity as Record<string, unknown> | undefined;
    const searchResult = entity?.searchResult as Record<string, unknown> | undefined;
    const totalResults = (searchResult?.nbResults as number) || 0;
    
    // Extract search suggestions from JSON
    const searchSuggestions: Array<{ label: string; url: string }> = [];
    const listBlocks = jsonData?.listBlocks as Record<string, unknown> | undefined;
    const linkingBlock = listBlocks?.linkingBlock as Record<string, unknown> | undefined;
    const tags = linkingBlock?.tags as Array<{ tagKey: string; link: string }> | undefined;
    if (tags) {
      tags.forEach((tag) => {
        if (tag.tagKey && tag.link) {
          searchSuggestions.push({
            label: tag.tagKey,
            url: tag.link
          });
        }
      });
    }

    // Extract pagination info from JSON data
    const pagination: Record<string, unknown> = {
      currentPage: 1,
      nextPage: null,
      prevPage: null,
      totalPages: null,
      minPage: null,
      maxPage: null,
      hasNextPage: false,
      hasPrevPage: false,
      pageLinkTemplate: null,
      pageLinkFirst: null,
      pages: []
    };

    const paging = entity?.paging as Record<string, unknown> | undefined;
    if (paging) {
      
      pagination.currentPage = (paging.active as number) || 1;
      pagination.minPage = (paging.minPage as number) || 1;
      pagination.maxPage = (paging.maxPage as number) || null;
      pagination.totalPages = (paging.maxPages as number) || null;
      pagination.pageLinkTemplate = (paging.pageLinkTemplate as string) || null;
      pagination.pageLinkFirst = (paging.pageLinkFirst as string) || null;
      
      // Set next page
      const nextPage = paging.next as number | undefined;
      if (nextPage) {
        const template = paging.pageLinkTemplate as string | undefined;
        pagination.nextPage = template?.replace('{#}', nextPage.toString()) || null;
        pagination.hasNextPage = true;
      }
      
      // Set prev page
      const prevPage = paging.prev as number | undefined;
      if (prevPage) {
        const template = paging.pageLinkTemplate as string | undefined;
        const first = paging.pageLinkFirst as string | undefined;
        pagination.prevPage = prevPage === 1 
          ? first 
          : template?.replace('{#}', prevPage.toString()) || null;
        pagination.hasPrevPage = true;
      }
      
      // Generate all page URLs
      const totalPages = pagination.totalPages as number | null;
      const minPage = pagination.minPage as number;
      const maxPage = pagination.maxPage as number | null;
      const currentPage = pagination.currentPage as number;
      const template = pagination.pageLinkTemplate as string | undefined;
      const first = pagination.pageLinkFirst as string | undefined;
      const pages = pagination.pages as Array<Record<string, unknown>>;
      
      if (totalPages) {
        for (let i = 1; i <= totalPages; i++) {
          const pageUrl = i === 1 
            ? first 
            : template?.replace('{#}', i.toString()) || '';
          
          pages.push({
            page: i,
            url: pageUrl,
            active: i === currentPage,
            isVisible: i >= minPage && i <= (maxPage || totalPages)
          });
        }
      }
    }

    // Extract videos from JSON data
    const videos: Array<Record<string, unknown>> = [];
    
    const sr = jsonData?.searchResult as Record<string, unknown> | undefined;
    const videoThumbProps = sr?.videoThumbProps as Array<Record<string, unknown>> | undefined;
    if (videoThumbProps) {
      videoThumbProps.forEach((video) => {
        const videoData: Record<string, unknown> = {
          id: video.id?.toString() || '',
          isPlaceholder: false,
          title: video.title || '',
          url: video.pageURL || '',
          pageURL: video.pageURL || '',
          imageUrl: video.imageURL || video.thumbURL || '',
          imageURL: video.imageURL || video.thumbURL || '',
          thumbURL: video.thumbURL || '',
          previewThumbURL: video.previewThumbURL || null,
          previewVideoUrl: video.trailerURL || null,
          trailerURL: video.trailerURL || null,
          spriteUrl: video.spriteURL || null,
          spriteURL: video.spriteURL || null,
          duration: video.duration ? formatDuration(video.duration as number) : null,
          durationSeconds: video.duration || null,
          views: video.views || 0,
          created: video.created || null,
          videoType: video.videoType || 'video',
          uploader: null
        };

        // Add uploader info if available
        const landing = video.landing as Record<string, unknown> | undefined;
        if (landing) {
          videoData.uploader = {
            id: (landing.id as string | number | null) || null,
            name: (landing.name as string) || '',
            url: (landing.link as string) || '',
            avatar: (landing.logo as string) || '',
            type: (landing.type as string | null) || null,
            subscribers: (landing.subscribers as number | null) || null,
            isInactive: (landing.isInactive as boolean) || false,
            isDeactivated: (landing.isDeactivated as boolean) || false
          };
        }

        videos.push(videoData);
      });
    }

    return NextResponse.json({
      success: true,
      query: query,
      encodedQuery: encodedQuery,
      page: pageNum,
      searchUrl: url,
      totalResults: totalResults,
      suggestions: searchSuggestions,
      pagination,
      videos,
      totalVideos: videos.length
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching xmaster search results:', errorMessage);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch search results',
        message: errorMessage 
      },
      { status: 500 }
    );
  }
}