// src/lib/types.ts

/**
 * Represents a single RSS feed that the user has subscribed to
 */
export interface RSSFeed {
    id: string; // Unique identifier (we'll use URL hash or UUID)
    url: string; // The RSS feed URL
    title: string; // Feed title (e.g., "TechCrunch")
    description?: string; // Feed description
    link?: string; // Website link
    imageUrl?: string; // Feed logo/image
    addedAt: string; // ISO timestamp when user added this feed
    lastFetched?: string; // ISO timestamp of last successful fetch
    category?: string; // Optional user-defined category
  }
  
  /**
   * Represents a single article/item from an RSS feed
   */
  export interface RSSArticle {
    id: string; // Unique identifier (guid from feed or generated)
    feedId: string; // Reference to parent feed
    title: string; // Article title
    link: string; // Article URL
    description?: string; // Article summary/excerpt (may contain HTML)
    content?: string; // Full article content (if available)
    author?: string; // Article author
    pubDate: string; // ISO timestamp of publication
    categories?: string[]; // Article tags/categories
    imageUrl?: string; // Article featured image
    enclosure?: {
      // For podcasts/media
      url: string;
      type: string; // MIME type
      length?: number; // File size in bytes
    };
  }
  
  /**
   * User's interaction state with an article
   */
  export interface ArticleState {
    articleId: string;
    isRead: boolean;
    isStarred: boolean; // Bookmarked/favorited
    readAt?: string; // ISO timestamp when marked as read
    starredAt?: string; // ISO timestamp when starred
  }
  
  /**
   * User preferences and settings
   */
  export interface UserPreferences {
    theme: 'light' | 'dark' | 'system';
    articlesPerPage: number;
    defaultSort: 'newest' | 'oldest' | 'unread-first';
    autoMarkAsRead: boolean; // Mark as read when opened
    openLinksInNewTab: boolean;
    showArticleImages: boolean;
    compactView: boolean; // Compact vs. comfortable article list
  }
  
  /**
   * Combined article data with user state
   */
  export interface ArticleWithState extends RSSArticle {
    isRead: boolean;
    isStarred: boolean;
    readAt?: string;
    starredAt?: string;
    feedTitle: string; // Denormalized for easy display
    feedImageUrl?: string;
  }
  
  /**
   * Feed with article count statistics
   */
  export interface FeedWithStats extends RSSFeed {
    totalArticles: number;
    unreadArticles: number;
  }
  
  /**
   * Filter and sort options for article list
   */
  export interface ArticleFilters {
    feedIds?: string[]; // Filter by specific feeds
    isRead?: boolean; // Filter by read/unread status
    isStarred?: boolean; // Filter starred only
    searchQuery?: string; // Search in title/description
    categories?: string[]; // Filter by categories
    dateFrom?: string; // ISO timestamp
    dateTo?: string; // ISO timestamp
  }
  
  export interface ArticleSortOptions {
    field: 'pubDate' | 'title' | 'feedTitle';
    order: 'asc' | 'desc';
  }
  
  /**
   * API response types
   */
  export interface FetchFeedResponse {
    success: boolean;
    feed?: RSSFeed;
    articles?: RSSArticle[];
    error?: string;
  }
  
  export interface FetchMultipleFeedsResponse {
    success: boolean;
    results: Array<{
      feedId: string;
      articles?: RSSArticle[];
      error?: string;
    }>;
  }
  
  /**
   * localStorage structure
   */
  export interface LocalStorageData {
    feeds: RSSFeed[];
    articleStates: Record<string, ArticleState>; // Key: articleId
    preferences: UserPreferences;
    version: string; // For future migrations
  }
  
  /**
   * Pagination
   */
  export interface PaginationInfo {
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
    totalItems: number;
  }
  
  /**
   * Error types
   */
  export class FeedFetchError extends Error {
    constructor(
      message: string,
      public feedUrl: string,
      public statusCode?: number
    ) {
      super(message);
      this.name = 'FeedFetchError';
    }
  }
  
  export class FeedParseError extends Error {
    constructor(
      message: string,
      public feedUrl: string
    ) {
      super(message);
      this.name = 'FeedParseError';
    }
  }