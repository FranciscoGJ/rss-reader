// GET: Fetch and parse a single feed by URL (encoded as feedId)

import { NextRequest, NextResponse } from 'next/server';
import { fetchAndParseFeed } from '@/lib/rss-parser';
import { FeedFetchError, FeedParseError } from '@/lib/types';

/**
 * GET /api/feeds/[feedId]
 * Fetch and parse a single RSS feed
 * feedId should be a base64-encoded URL
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { feedId: string } }
) {
  try {
    const { feedId } = params;

    // Decode the feed URL from base64
    let feedUrl: string;
    try {
      feedUrl = Buffer.from(feedId, 'base64').toString('utf-8');
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid feed ID' },
        { status: 400 }
      );
    }

    // Fetch and parse the feed
    const { feed, articles } = await fetchAndParseFeed(feedUrl);

    return NextResponse.json({
      success: true,
      feed,
      articles,
    });
  } catch (error) {
    console.error('Error fetching feed:', error);

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
      { success: false, error: 'Failed to fetch feed' },
      { status: 500 }
    );
  }
}