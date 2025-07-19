import { NextRequest, NextResponse } from 'next/server'
import { load } from 'cheerio'
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth'

async function extractDirectDownloadLink(url: string) {
  try {
    console.log(`Extracting direct download link from: ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`)
    }

    const html = await response.text()
    const $ = load(html)
    
    // Extract the direct download link from the a tag with id="vd"
    const directLink = $('a#vd').attr('href')
    
    if (directLink) {
      console.log(`Found direct download link: ${directLink}`)
      return directLink
    } else {
      console.log('No direct download link found in the page')
      return null
    }
  } catch (error) {
    console.error('Error extracting direct download link:', error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      return createUnauthorizedResponse(authResult.error || 'Invalid API key');
    }

    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')
    
    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL parameter is required' },
        { status: 400 }
      )
    }

    const response = await fetch(`https://scarper-ansh.vercel.app/api/hubcloud?url=${encodeURIComponent(url)}`)
    const data = await response.json()
    
    // Process the links to extract direct download URLs from gpdl.hubcdn.fans
    if (data.success && data.links && Array.isArray(data.links)) {
      const processedLinks = await Promise.all(
        data.links.map(async (link: any) => {
          // Check if the link contains gpdl.hubcdn.fans
          if (link.link && link.link.includes('gpdl.hubcdn.fans')) {
            console.log(`Processing gpdl.hubcdn.fans link: ${link.link}`)
            
            // Extract the direct download link
            const directLink = await extractDirectDownloadLink(link.link)
            
            if (directLink) {
              // Replace the original link with the direct download link
              return {
                ...link,
                link: directLink,
                originalLink: link.link, // Keep original for reference
                isDirect: true
              }
            }
          }
          
          // Return original link if not a gpdl.hubcdn.fans URL or extraction failed
          return {
            ...link,
            isDirect: false
          }
        })
      )
      
      return NextResponse.json({
        ...data,
        links: processedLinks,
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
      })
    }
    
    return NextResponse.json({
      ...data,
      remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
    })
  } catch (error) {
    console.error('Error fetching from hubcloud API:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch video links' },
      { status: 500 }
    )
  }
}
