// src/lib/rss-parser.ts

import Parser from 'rss-parser';
import { RSSFeed, RSSArticle, FeedFetchError, FeedParseError } from './types';
import { createHash } from 'crypto';

/**
 * Custom RSS parser types
 */
interface CustomFeed {
  subtitle?: string;
  image?: {
    url?: string;
    title?: string;
    link?: string;
  };
}

interface CustomItem {
  // Standard RSS item fields
  title?: string;
  link?: string;
  pubDate?: string;
  creator?: string;
  author?: string;
  content?: string;
  contentSnippet?: string;
  guid?: string;
  categories?: string[];
  description?: string;
  enclosure?: {
    url: string;
    length?: string;
    type: string;
  };
  itunes?: {
    image?: string;
    duration?: string;
    summary?: string;
  };
  // Custom fields
  mediaContent?: {
    $?: {
      url?: string;
      medium?: string;
      type?: string;
    };
  };
  mediaThumbnail?: {
    $?: {
      url?: string;
    };
  };
  contentEncoded?: string;
}

/**
 * Create RSS parser instance with custom fields
 */
const parser: Parser<CustomFeed, CustomItem> = new Parser({
  customFields: {
    feed: ['subtitle', 'image'],
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['content:encoded', 'contentEncoded'],
    ],
  },
  timeout: 10000, // 10 second timeout
});

/**
 * Generate a unique ID from a string (used for feed and article IDs)
 */
export const generateId = (input: string): string => {
  // In browser environment, use a simple hash
  if (typeof window !== 'undefined') {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
  
  // In Node.js environment (API routes), use crypto
  return createHash('md5').update(input).digest('hex').substring(0, 12);
};

/**
 * Extract image URL from various feed formats
 */
const extractImageUrl = (item: any): string | undefined => {
  // Try different image sources in order of preference
  if (item.enclosure?.type?.startsWith('image/')) {
    return item.enclosure.url;
  }
  
  if (item.mediaThumbnail?.$?.url) {
    return item.mediaThumbnail.$.url;
  }
  
  if (item.mediaContent?.$?.url && item.mediaContent.$.medium === 'image') {
    return item.mediaContent.$.url;
  }
  
  if (item.itunes?.image) {
    return item.itunes.image;
  }

  // Try to extract from content/description
  if (item.content || item.contentEncoded || item.description) {
    const content = item.contentEncoded || item.content || item.description;
    const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
    if (imgMatch && imgMatch[1]) {
      return imgMatch[1];
    }
  }

  return undefined;
};

/**
 * Extract feed logo/image
 */
const extractFeedImage = (feed: any): string | undefined => {
  if (feed.image?.url) {
    return feed.image.url;
  }
  
  if (feed.itunes?.image) {
    return feed.itunes.image;
  }

  return undefined;
};

/**
 * Clean HTML content and extract text
 */
const cleanHtmlContent = (html: string | undefined): string | undefined => {
  if (!html) return undefined;
  
  // Remove HTML tags
  const text = html.replace(/<[^>]*>/g, ' ');
  
  // Decode HTML entities
  const txt = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–');
  
  // Clean up whitespace
  return txt.replace(/\s+/g, ' ').trim();
};

/**
 * Parse RSS feed from XML string
 */
export const parseFeedXML = async (xml: string, feedUrl: string): Promise<{
  feed: RSSFeed;
  articles: RSSArticle[];
}> => {
  try {
    const parsedFeed = await parser.parseString(xml);
    
    // Create feed object
    const feedId = generateId(feedUrl);
    const feed: RSSFeed = {
      id: feedId,
      url: feedUrl,
      title: parsedFeed.title || 'Untitled Feed',
      description: parsedFeed.description || undefined,
      link: parsedFeed.link || undefined,
      imageUrl: extractFeedImage(parsedFeed),
      addedAt: new Date().toISOString(),
      lastFetched: new Date().toISOString(),
    };

    // Parse articles
    const articles: RSSArticle[] = (parsedFeed.items || []).map((item) => {
      // Generate article ID from guid or link
      const articleIdentifier = item.guid || item.link || item.title || '';
      const articleId = generateId(`${feedId}-${articleIdentifier}`);

      // Extract content (prefer full content over description)
      const content = item.contentEncoded || item.content || item.description;
      const description = item.contentSnippet || cleanHtmlContent(item.description);

      return {
        id: articleId,
        feedId,
        title: item.title || 'Untitled Article',
        link: item.link || '',
        description,
        content: content !== item.description ? content : undefined,
        author: item.creator || item.author || undefined,
        pubDate: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        categories: item.categories || undefined,
        imageUrl: extractImageUrl(item),
        enclosure: item.enclosure ? {
          url: item.enclosure.url,
          type: item.enclosure.type,
          length: item.enclosure.length ? parseInt(item.enclosure.length) : undefined,
        } : undefined,
      };
    });

    return { feed, articles };
  } catch (error) {
    throw new FeedParseError(
      `Failed to parse RSS feed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      feedUrl
    );
  }
};

/**
 * Fetch and parse RSS feed from URL
 */
export const fetchAndParseFeed = async (feedUrl: string): Promise<{
  feed: RSSFeed;
  articles: RSSArticle[];
}> => {
  try {
    // Validate URL
    try {
      new URL(feedUrl);
    } catch {
      throw new FeedFetchError('Invalid feed URL', feedUrl);
    }

    // Fetch the feed
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'RSS-Reader/1.0',
        'Accept': 'application/rss+xml, application/xml, application/atom+xml, text/xml',
      },
    });

    if (!response.ok) {
      throw new FeedFetchError(
        `Failed to fetch feed: ${response.statusText}`,
        feedUrl,
        response.status
      );
    }

    const xml = await response.text();
    return await parseFeedXML(xml, feedUrl);
  } catch (error) {
    if (error instanceof FeedFetchError || error instanceof FeedParseError) {
      throw error;
    }
    
    throw new FeedFetchError(
      `Failed to fetch feed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      feedUrl
    );
  }
};

/**
 * Validate if a URL is a valid RSS feed
 */
export const validateFeedUrl = async (feedUrl: string): Promise<{
  isValid: boolean;
  title?: string;
  error?: string;
}> => {
  try {
    const { feed } = await fetchAndParseFeed(feedUrl);
    return {
      isValid: true,
      title: feed.title,
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Merge new articles with existing ones, removing duplicates
 */
export const mergeArticles = (
  existingArticles: RSSArticle[],
  newArticles: RSSArticle[]
): RSSArticle[] => {
  const articleMap = new Map<string, RSSArticle>();
  
  // Add existing articles
  existingArticles.forEach((article) => {
    articleMap.set(article.id, article);
  });
  
  // Add new articles (will overwrite if ID exists)
  newArticles.forEach((article) => {
    articleMap.set(article.id, article);
  });
  
  return Array.from(articleMap.values());
};

/**
 * Sort articles by publication date
 */
export const sortArticlesByDate = (
  articles: RSSArticle[],
  order: 'asc' | 'desc' = 'desc'
): RSSArticle[] => {
  return [...articles].sort((a, b) => {
    const dateA = new Date(a.pubDate).getTime();
    const dateB = new Date(b.pubDate).getTime();
    return order === 'desc' ? dateB - dateA : dateA - dateB;
  });
};

/**
 * Filter articles by search query
 */
export const searchArticles = (
  articles: RSSArticle[],
  query: string
): RSSArticle[] => {
  const lowerQuery = query.toLowerCase();
  return articles.filter((article) => {
    return (
      article.title.toLowerCase().includes(lowerQuery) ||
      article.description?.toLowerCase().includes(lowerQuery) ||
      article.author?.toLowerCase().includes(lowerQuery)
    );
  });
};