// src/app/api/feeds/validate/route.ts
// POST: Validate a feed URL without adding it

import { NextRequest, NextResponse } from 'next/server';
import { validateFeedUrl } from '@/lib/rss-parser';

/**
 * POST /api/feeds/validate
 * Validate if a URL is a valid RSS feed
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

    const validation = await validateFeedUrl(url);

    return NextResponse.json({
      success: true,
      isValid: validation.isValid,
      title: validation.title,
      error: validation.error,
    });
  } catch (error) {
    console.error('Error validating feed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to validate feed' },
      { status: 500 }
    );
  }
}