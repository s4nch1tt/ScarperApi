import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { userSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
// Local types for dynamic response structures
type PreloadLinks = {
  videoUrl: string | null;
  thumbnailUrl: string | null;
  promoImageUrl: string | null;
};

type UploaderInfo = {
  id: string | number | null;
  name: string | null;
  url: string | null;
  subscribers: number | null;
  isVerified: boolean;
} | null;

type VideoDetails = {
  id: string | number | null;
  title: string | null;
  duration: number | null;
  views: number | null;
  rating: number | null;
  created: string | null;
  categories: unknown[];
  tags: unknown[];
  uploader: UploaderInfo;
};

type RelatedVideos = {
  maxPages: number;
  videoThumbProps: unknown[];
} | null;

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
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // Fetch the video page with custom headers
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

    // Extract preload links using regex
    const html = response.data;
    const preloadLinks: PreloadLinks = {
      videoUrl: null,
      thumbnailUrl: null,
      promoImageUrl: null
    };

    // Extract video URL (m3u8)
    const videoMatch = html.match(/<link\s+rel="preload"\s+href="([^"]*\.m3u8[^"]*)"\s+as="fetch"/);
    if (videoMatch) {
      preloadLinks.videoUrl = videoMatch[1];
    }

    // Extract all preload image links
    const imageMatches = html.matchAll(/<link\s+rel="preload"\s+href="([^"]*)"\s+as="image"[^>]*>/g);
    const images = Array.from(imageMatches, (match: RegExpMatchArray) => match[1]).filter((src): src is string => Boolean(src));
    
    // First image is usually the thumbnail
    if (images.length > 0) {
      preloadLinks.thumbnailUrl = images[0];
    }
    
    // Second image is usually the promo image
    if (images.length > 1) {
      preloadLinks.promoImageUrl = images[1];
    }

    // Extract JSON data from window.initials for additional video info
    let jsonData: Record<string, unknown> | null = null;
    const jsonMatch = html.match(/window\.initials\s*=\s*({[\s\S]*?});/);
    if (jsonMatch) {
      try {
        jsonData = JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.error('Failed to parse JSON data:', e);
      }
    }

    // Extract video details from videoModel (legacy support)
    const videoDetails: VideoDetails = {
      id: null,
      title: null,
      duration: null,
      views: null,
      rating: null,
      created: null,
      categories: [],
      tags: [],
      uploader: null
    };

    const videoModel = (jsonData as Record<string, unknown> | null)?.videoModel as Record<string, unknown> | undefined;
    if (videoModel) {
      videoDetails.id = (videoModel.id as string | number | null) ?? null;
      videoDetails.title = (videoModel.title as string | null) ?? null;
      videoDetails.duration = (videoModel.duration as number | null) ?? null;
      videoDetails.views = (videoModel.views as number | null) ?? null;
      videoDetails.rating = (videoModel.rating as number | null) ?? null;
      videoDetails.created = (videoModel.created as string | null) ?? null;
      videoDetails.categories = (videoModel.categories as unknown[]) ?? [];
      videoDetails.tags = (videoModel.tags as unknown[]) ?? [];

      const author = videoModel.author as Record<string, unknown> | undefined;
      if (author) {
        const pageURL = author.pageURL as string | undefined;
        videoDetails.uploader = {
          id: (author.id as string | number | null) ?? null,
          name: (author.name as string | null) ?? (pageURL ? pageURL.split('/').pop() ?? null : null),
          url: (author.pageURL as string | null) ?? null,
          subscribers: (author.subscribers as number | null) ?? null,
          isVerified: (author.isVerified as boolean) ?? false
        };
      }
    }

    // Extract videoPageComponent data (comprehensive video data)
    let videoPageComponent: unknown = null;
    const vpc = (jsonData as Record<string, unknown> | null)?.videoPageComponent;
    if (vpc) {
      videoPageComponent = vpc;
    }

    // Fetch related videos from API
    let relatedVideos: RelatedVideos = null;
    if (videoDetails.id) {
      try {
        const relatedParams = {
          videoId: videoDetails.id,
          page: 1,
          tabType: "video",
          tabId: null,
          isDesktop: false,
          currentlyShownCount: 13,
          channelId: null,
          creatorId: null,
          newestMixinUsedCount: 0,
          extDebug: null,
          extTestVersion: null,
          isUniversalShown: false,
          viewIdForce: "203333",
          withWidget: true,
          xhlCountry: "in",
          nativeSpotsCount: 1
        };

        const encodedParams = encodeURIComponent(JSON.stringify(relatedParams));
        const relatedApiUrl = `https://xhamster.com/api/front/video/related?params=${encodedParams}`;

        const relatedResponse = await axios.get(relatedApiUrl, {
          headers: {
            'sec-ch-ua': '"Brave";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
            'sec-ch-ua-mobile': '?1',
            'sec-ch-ua-platform': '"Android"',
            'user-agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36',
            'accept': 'application/json',
            'accept-language': 'en-US,en;q=0.9',
            'referer': url
          }
        });

        if (relatedResponse.data) {
          relatedVideos = {
            maxPages: (relatedResponse.data.maxPages as number) || 0,
            videoThumbProps: (relatedResponse.data.videoThumbProps as unknown[]) || []
          };
        }
      } catch (relatedError) {
        console.error('Error fetching related videos:', relatedError);
      }
    }

    return NextResponse.json({
      success: true,
      videoUrl: url,
      preloadLinks,
      videoDetails,
      videoPageComponent,
      relatedVideos,
      windowInitials: jsonData,
      allPreloadImages: images
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching video page:', errorMessage);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch video page',
        message: errorMessage 
      },
      { status: 500 }
    );
  }
}