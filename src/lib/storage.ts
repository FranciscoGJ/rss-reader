// src/lib/storage.ts

import {
    RSSFeed,
    ArticleState,
    UserPreferences,
    LocalStorageData,
  } from './types';
  
  const STORAGE_KEY = 'rss_reader_data';
  const STORAGE_VERSION = '1.0.0';
  
  /**
   * Default user preferences
   */
  const DEFAULT_PREFERENCES: UserPreferences = {
    theme: 'system',
    articlesPerPage: 20,
    defaultSort: 'newest',
    autoMarkAsRead: true,
    openLinksInNewTab: true,
    showArticleImages: true,
    compactView: false,
  };
  
  /**
   * Initialize empty storage structure
   */
  const getEmptyStorage = (): LocalStorageData => ({
    feeds: [],
    articleStates: {},
    preferences: DEFAULT_PREFERENCES,
    version: STORAGE_VERSION,
  });
  
  /**
   * Check if we're in a browser environment
   */
  const isBrowser = (): boolean => {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  };
  
  /**
   * Load all data from localStorage
   */
  export const loadStorage = (): LocalStorageData => {
    if (!isBrowser()) {
      return getEmptyStorage();
    }
  
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        return getEmptyStorage();
      }
  
      const parsed: LocalStorageData = JSON.parse(data);
      
      // Version migration logic (for future use)
      if (parsed.version !== STORAGE_VERSION) {
        console.log('Storage version mismatch, migrating...');
        // Add migration logic here when needed
      }
  
      return {
        ...getEmptyStorage(),
        ...parsed,
      };
    } catch (error) {
      console.error('Error loading storage:', error);
      return getEmptyStorage();
    }
  };
  
  /**
   * Save all data to localStorage
   */
  export const saveStorage = (data: LocalStorageData): boolean => {
    if (!isBrowser()) {
      return false;
    }
  
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error saving storage:', error);
      return false;
    }
  };
  
  /**
   * Clear all storage data
   */
  export const clearStorage = (): boolean => {
    if (!isBrowser()) {
      return false;
    }
  
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  };
  
  // ============================================================================
  // FEED OPERATIONS
  // ============================================================================
  
  /**
   * Get all feeds
   */
  export const getFeeds = (): RSSFeed[] => {
    const storage = loadStorage();
    return storage.feeds;
  };
  
  /**
   * Get a single feed by ID
   */
  export const getFeed = (feedId: string): RSSFeed | null => {
    const storage = loadStorage();
    return storage.feeds.find((f) => f.id === feedId) || null;
  };
  
  /**
   * Add a new feed
   */
  export const addFeed = (feed: RSSFeed): boolean => {
    const storage = loadStorage();
    
    // Check if feed already exists
    const exists = storage.feeds.some((f) => f.url === feed.url);
    if (exists) {
      console.warn('Feed already exists:', feed.url);
      return false;
    }
  
    storage.feeds.push(feed);
    return saveStorage(storage);
  };
  
  /**
   * Update an existing feed
   */
  export const updateFeed = (feedId: string, updates: Partial<RSSFeed>): boolean => {
    const storage = loadStorage();
    const index = storage.feeds.findIndex((f) => f.id === feedId);
    
    if (index === -1) {
      console.warn('Feed not found:', feedId);
      return false;
    }
  
    storage.feeds[index] = {
      ...storage.feeds[index],
      ...updates,
    };
  
    return saveStorage(storage);
  };
  
  /**
   * Delete a feed and all associated article states
   */
  export const deleteFeed = (feedId: string): boolean => {
    const storage = loadStorage();
    
    // Remove feed
    storage.feeds = storage.feeds.filter((f) => f.id !== feedId);
    
    // Remove associated article states
    Object.keys(storage.articleStates).forEach((articleId) => {
      if (storage.articleStates[articleId].articleId.startsWith(feedId)) {
        delete storage.articleStates[articleId];
      }
    });
  
    return saveStorage(storage);
  };
  
  // ============================================================================
  // ARTICLE STATE OPERATIONS
  // ============================================================================
  
  /**
   * Get article state
   */
  export const getArticleState = (articleId: string): ArticleState | null => {
    const storage = loadStorage();
    return storage.articleStates[articleId] || null;
  };
  
  /**
   * Get all article states
   */
  export const getAllArticleStates = (): Record<string, ArticleState> => {
    const storage = loadStorage();
    return storage.articleStates;
  };
  
  /**
   * Mark article as read
   */
  export const markAsRead = (articleId: string, feedId: string): boolean => {
    const storage = loadStorage();
    
    storage.articleStates[articleId] = {
      articleId,
      isRead: true,
      isStarred: storage.articleStates[articleId]?.isStarred || false,
      readAt: new Date().toISOString(),
      starredAt: storage.articleStates[articleId]?.starredAt,
    };
  
    return saveStorage(storage);
  };
  
  /**
   * Mark article as unread
   */
  export const markAsUnread = (articleId: string): boolean => {
    const storage = loadStorage();
    
    if (storage.articleStates[articleId]) {
      storage.articleStates[articleId].isRead = false;
      storage.articleStates[articleId].readAt = undefined;
    }
  
    return saveStorage(storage);
  };
  
  /**
   * Toggle star/bookmark on article
   */
  export const toggleStar = (articleId: string, feedId: string): boolean => {
    const storage = loadStorage();
    
    const currentState = storage.articleStates[articleId];
    const isStarred = !currentState?.isStarred;
  
    storage.articleStates[articleId] = {
      articleId,
      isRead: currentState?.isRead || false,
      isStarred,
      readAt: currentState?.readAt,
      starredAt: isStarred ? new Date().toISOString() : undefined,
    };
  
    return saveStorage(storage);
  };
  
  /**
   * Mark all articles from a feed as read
   */
  export const markFeedAsRead = (feedId: string, articleIds: string[]): boolean => {
    const storage = loadStorage();
    const now = new Date().toISOString();
  
    articleIds.forEach((articleId) => {
      storage.articleStates[articleId] = {
        articleId,
        isRead: true,
        isStarred: storage.articleStates[articleId]?.isStarred || false,
        readAt: now,
        starredAt: storage.articleStates[articleId]?.starredAt,
      };
    });
  
    return saveStorage(storage);
  };
  
  /**
   * Clean up old article states (older than 30 days and read)
   */
  export const cleanupOldStates = (daysToKeep: number = 30): boolean => {
    const storage = loadStorage();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffISO = cutoffDate.toISOString();
  
    Object.keys(storage.articleStates).forEach((articleId) => {
      const state = storage.articleStates[articleId];
      if (state.isRead && !state.isStarred && state.readAt && state.readAt < cutoffISO) {
        delete storage.articleStates[articleId];
      }
    });
  
    return saveStorage(storage);
  };
  
  // ============================================================================
  // PREFERENCES OPERATIONS
  // ============================================================================
  
  /**
   * Get user preferences
   */
  export const getPreferences = (): UserPreferences => {
    const storage = loadStorage();
    return storage.preferences;
  };
  
  /**
   * Update user preferences
   */
  export const updatePreferences = (updates: Partial<UserPreferences>): boolean => {
    const storage = loadStorage();
    storage.preferences = {
      ...storage.preferences,
      ...updates,
    };
    return saveStorage(storage);
  };
  
  /**
   * Reset preferences to defaults
   */
  export const resetPreferences = (): boolean => {
    const storage = loadStorage();
    storage.preferences = DEFAULT_PREFERENCES;
    return saveStorage(storage);
  };
  
  // ============================================================================
  // EXPORT/IMPORT (for backup and portability)
  // ============================================================================
  
  /**
   * Export all data as JSON string
   */
  export const exportData = (): string => {
    const storage = loadStorage();
    return JSON.stringify(storage, null, 2);
  };
  
  /**
   * Import data from JSON string
   */
  export const importData = (jsonData: string): boolean => {
    try {
      const data: LocalStorageData = JSON.parse(jsonData);
      
      // Validate structure
      if (!data.feeds || !data.articleStates || !data.preferences) {
        throw new Error('Invalid data structure');
      }
  
      return saveStorage(data);
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  };