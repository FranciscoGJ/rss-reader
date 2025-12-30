import { NextRequest, NextResponse } from 'next/server';
import { fetchAndParseFeed, validateFeedUrl } from '@/lib/rss-parser';
import { FeedFetchError, FeedParseError } from '@/lib/types';

/**
 * POST /api/feeds
 * Validate and add a new RSS feed
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Feed URL is required' },
        { status: 400 }
      );
    }

    // Validate the feed URL
    const validation = await validateFeedUrl(url);
    
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error || 'Invalid feed URL' },
        { status: 400 }
      );
    }

    // Fetch and parse the feed
    const { feed, articles } = await fetchAndParseFeed(url);

    return NextResponse.json({
      success: true,
      feed,
      articles,
    });
  } catch (error) {
    console.error('Error adding feed:', error);

    if (error instanceof FeedFetchError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 500 }
      );
    }

    if (error instanceof FeedParseError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to add feed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/feeds?urls=url1,url2,url3
 * Fetch and parse multiple feeds
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const urlsParam = searchParams.get('urls');

    if (!urlsParam) {
      return NextResponse.json(
        { success: false, error: 'Feed URLs are required' },
        { status: 400 }
      );
    }

    // Parse comma-separated URLs
    const urls = urlsParam.split(',').map(url => url.trim()).filter(Boolean);

    if (urls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one feed URL is required' },
        { status: 400 }
      );
    }

    // Fetch all feeds in parallel
    const results = await Promise.allSettled(
      urls.map(async (url) => {
        const { feed, articles } = await fetchAndParseFeed(url);
        return { feedId: feed.id, articles };
      })
    );

    // Process results
    const response = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return {
          feedId: result.value.feedId,
          articles: result.value.articles,
        };
      } else {
        const error = result.reason;
        return {
          feedId: urls[index],
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    return NextResponse.json({
      success: true,
      results: response,
    });
  } catch (error) {
    console.error('Error fetching feeds:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch feeds' },
      { status: 500 }
    );
  }
}