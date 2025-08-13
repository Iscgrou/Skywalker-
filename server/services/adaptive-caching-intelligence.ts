// R2.3: Adaptive Caching Intelligence Service
// Dynamically optimizes caching strategies based on usage patterns and user behavior

import { userBehaviorAnalytics } from './adaptive-behavior-analytics';

interface CacheEntry {
  key: string;
  value: any;
  timestamp: number;
  accessCount: number;
  lastAccess: number;
  userId?: string;
  category: 'hot' | 'warm' | 'cold';
  priority: number; // 1-10, higher = more important
}

interface CacheMetrics {
  totalEntries: number;
  hitRate: number;
  missRate: number;
  hotDataPercentage: number;
  averageAccessTime: number;
  memoryUsage: number;
  recommendations: string[];
}

interface AdaptiveCacheConfig {
  maxEntries: number;
  defaultTTL: number;
  hotDataTTL: number;
  coldDataTTL: number;
  evictionStrategy: 'lru' | 'lfu' | 'adaptive';
}

class AdaptiveCachingIntelligence {
  private cache = new Map<string, CacheEntry>();
  private accessHistory = new Map<string, number[]>(); // key -> [timestamps]
  private userCacheProfiles = new Map<string, any>();
  private metrics = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    lastReset: Date.now()
  };
  
  private config: AdaptiveCacheConfig = {
    maxEntries: 1000,
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    hotDataTTL: 30 * 60 * 1000, // 30 minutes
    coldDataTTL: 2 * 60 * 1000, // 2 minutes
    evictionStrategy: 'adaptive'
  };
  
  // Analyze access patterns to categorize data
  private categorizeData(entry: CacheEntry): 'hot' | 'warm' | 'cold' {
    const now = Date.now();
    const ageMs = now - entry.timestamp;
    const timeSinceLastAccess = now - entry.lastAccess;
    
    // Hot data: frequently accessed, recent
    if (entry.accessCount >= 10 && timeSinceLastAccess < 5 * 60 * 1000) {
      return 'hot';
    }
    
    // Cold data: rarely accessed, old
    if (entry.accessCount <= 2 && ageMs > 10 * 60 * 1000) {
      return 'cold';
    }
    
    // Everything else is warm
    return 'warm';
  }
  
  // Calculate dynamic TTL based on access patterns
  private calculateAdaptiveTTL(entry: CacheEntry, userId?: string): number {
    const baseCategory = this.categorizeData(entry);
    let ttl = this.config.defaultTTL;
    
    switch (baseCategory) {
      case 'hot':
        ttl = this.config.hotDataTTL;
        break;
      case 'cold':
        ttl = this.config.coldDataTTL;
        break;
      default:
        ttl = this.config.defaultTTL;
    }
    
    // Adjust based on user behavior if available
    if (userId) {
      const userProfile = this.userCacheProfiles.get(userId);
      if (userProfile?.preferredCacheStrategy === 'aggressive') {
        ttl *= 1.5; // Extend TTL for users who benefit from caching
      } else if (userProfile?.preferredCacheStrategy === 'minimal') {
        ttl *= 0.7; // Reduce TTL for users who prefer fresh data
      }
    }
    
    return ttl;
  }
  
  // Intelligent cache get with learning
  get(key: string, userId?: string): any | null {
    this.metrics.totalRequests++;
    
    const entry = this.cache.get(key);
    if (!entry) {
      this.metrics.misses++;
      return null;
    }
    
    const now = Date.now();
    const adaptiveTTL = this.calculateAdaptiveTTL(entry, userId);
    
    // Check if entry is still valid
    if (now - entry.timestamp > adaptiveTTL) {
      this.cache.delete(key);
      this.metrics.misses++;
      return null;
    }
    
    // Update access statistics
    entry.accessCount++;
    entry.lastAccess = now;
    entry.category = this.categorizeData(entry);
    
    // Track access history
    const history = this.accessHistory.get(key) || [];
    history.push(now);
    if (history.length > 100) history.shift(); // Keep last 100 accesses
    this.accessHistory.set(key, history);
    
    this.metrics.hits++;
    return entry.value;
  }
  
  // Intelligent cache set with priority calculation
  set(key: string, value: any, userId?: string, category?: string): void {
    const now = Date.now();
    
    // Calculate priority based on various factors
    let priority = 5; // Default priority
    
    if (category) {
      // Category-based priority
      if (category.includes('explainability')) priority += 2;
      if (category.includes('diff')) priority += 1;
      if (category.includes('governance')) priority += 1;
    }
    
    // User-based priority adjustment
    if (userId) {
      const userBehavior = userBehaviorAnalytics.getAdaptiveParameters(userId);
      if (userBehavior.suggestedCacheTTL > this.config.defaultTTL) {
        priority += 1; // Power users get higher priority
      }
    }
    
    const entry: CacheEntry = {
      key,
      value,
      timestamp: now,
      accessCount: 1,
      lastAccess: now,
      userId,
      category: 'warm',
      priority
    };
    
    // Evict if necessary
    this.evictIfNeeded();
    
    this.cache.set(key, entry);
  }
  
  // Adaptive eviction strategy
  private evictIfNeeded(): void {
    if (this.cache.size < this.config.maxEntries) return;
    
    const entries = Array.from(this.cache.values());
    
    switch (this.config.evictionStrategy) {
      case 'adaptive':
        // Evict based on category, priority, and access patterns
        entries.sort((a, b) => {
          // First sort by category (cold data first)
          const categoryWeight = { cold: 0, warm: 1, hot: 2 };
          const categoryDiff = categoryWeight[a.category] - categoryWeight[b.category];
          if (categoryDiff !== 0) return categoryDiff;
          
          // Then by priority
          const priorityDiff = a.priority - b.priority;
          if (priorityDiff !== 0) return priorityDiff;
          
          // Finally by last access time
          return a.lastAccess - b.lastAccess;
        });
        break;
        
      case 'lru':
        entries.sort((a, b) => a.lastAccess - b.lastAccess);
        break;
        
      case 'lfu':
        entries.sort((a, b) => a.accessCount - b.accessCount);
        break;
    }
    
    // Remove lowest priority entries
    const toRemove = entries.slice(0, Math.floor(this.config.maxEntries * 0.1)); // Remove 10%
    toRemove.forEach(entry => {
      this.cache.delete(entry.key);
      this.accessHistory.delete(entry.key);
    });
  }
  
  // Learn user cache preferences
  learnUserPreferences(userId: string): void {
    const userEntries = Array.from(this.cache.values()).filter(e => e.userId === userId);
    if (userEntries.length < 5) return; // Need minimum data
    
    const totalAccesses = userEntries.reduce((sum, e) => sum + e.accessCount, 0);
    const averageAccesses = totalAccesses / userEntries.length;
    
    // Determine user's cache preference
    let preferredStrategy = 'default';
    if (averageAccesses > 8) {
      preferredStrategy = 'aggressive'; // User benefits from longer caching
    } else if (averageAccesses < 3) {
      preferredStrategy = 'minimal'; // User prefers fresh data
    }
    
    this.userCacheProfiles.set(userId, {
      preferredCacheStrategy: preferredStrategy,
      averageAccesses,
      totalCacheRequests: userEntries.length,
      lastAnalyzed: Date.now()
    });
  }
  
  // Get cache performance metrics
  getMetrics(): CacheMetrics {
    const totalRequests = this.metrics.totalRequests;
    const hitRate = totalRequests > 0 ? (this.metrics.hits / totalRequests) * 100 : 0;
    const missRate = 100 - hitRate;
    
    const entries = Array.from(this.cache.values());
    const hotEntries = entries.filter(e => e.category === 'hot').length;
    const hotDataPercentage = entries.length > 0 ? (hotEntries / entries.length) * 100 : 0;
    
    const accessTimes = entries.map(e => Date.now() - e.lastAccess);
    const averageAccessTime = accessTimes.length > 0 
      ? accessTimes.reduce((sum, time) => sum + time, 0) / accessTimes.length 
      : 0;
    
    // Generate recommendations
    const recommendations: string[] = [];
    if (hitRate < 60) {
      recommendations.push('نرخ hit پایین - افزایش TTL پیشنهاد می‌شود');
    }
    if (hotDataPercentage < 20) {
      recommendations.push('داده‌های hot کم - بهینه‌سازی الگوهای دسترسی');
    }
    if (this.cache.size > this.config.maxEntries * 0.9) {
      recommendations.push('حافظه cache تقریباً پر - افزایش حداکثر entries');
    }
    
    return {
      totalEntries: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
      missRate: Math.round(missRate * 100) / 100,
      hotDataPercentage: Math.round(hotDataPercentage * 100) / 100,
      averageAccessTime: Math.round(averageAccessTime),
      memoryUsage: this.cache.size * 1024, // Rough estimate
      recommendations
    };
  }
  
  // Auto-tune cache configuration based on performance
  autoTuneConfiguration(): void {
    const metrics = this.getMetrics();
    
    // Adjust max entries based on hit rate
    if (metrics.hitRate > 80 && this.cache.size > this.config.maxEntries * 0.8) {
      this.config.maxEntries = Math.min(this.config.maxEntries * 1.2, 2000);
    } else if (metrics.hitRate < 50) {
      this.config.maxEntries = Math.max(this.config.maxEntries * 0.9, 500);
    }
    
    // Adjust TTL based on access patterns
    if (metrics.hotDataPercentage > 60) {
      this.config.hotDataTTL = Math.min(this.config.hotDataTTL * 1.1, 60 * 60 * 1000); // Max 1 hour
    }
    
    // Learn from all users
    this.userCacheProfiles.forEach((_, userId) => {
      this.learnUserPreferences(userId);
    });
  }
  
  // Clear cache with category filter
  clear(category?: 'hot' | 'warm' | 'cold'): void {
    if (!category) {
      this.cache.clear();
      this.accessHistory.clear();
      return;
    }
    
    const entriesToDelete = Array.from(this.cache.entries())
      .filter(([_, entry]) => entry.category === category);
    
    entriesToDelete.forEach(([key, _]) => {
      this.cache.delete(key);
      this.accessHistory.delete(key);
    });
  }
}

export const adaptiveCachingIntelligence = new AdaptiveCachingIntelligence();
