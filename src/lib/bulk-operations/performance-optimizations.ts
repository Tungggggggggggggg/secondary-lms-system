/**
 * Performance Optimizations cho Bulk Operations
 * Các tối ưu hóa về memory, database, và processing speed
 */

import { BulkUserInput } from "@/types/bulk-operations";

// ============================================
// Memory Management
// ============================================

/**
 * Process large datasets in chunks để tránh memory overflow
 */
export const processInChunks = async <T, R>(
  items: T[],
  processor: (chunk: T[]) => Promise<R[]>,
  chunkSize: number = 100
): Promise<R[]> => {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = await processor(chunk);
    results.push(...chunkResults);
    
    // Small delay để tránh overwhelm system
    if (i + chunkSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  
  return results;
};

/**
 * Streaming CSV parser để xử lý file lớn
 */
export class StreamingCSVParser {
  private buffer: string = '';
  private headers: string[] = [];
  private isFirstLine: boolean = true;
  
  processChunk(chunk: string): BulkUserInput[] {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');
    
    // Giữ lại dòng cuối chưa hoàn chỉnh
    this.buffer = lines.pop() || '';
    
    const results: BulkUserInput[] = [];
    
    for (const line of lines) {
      if (this.isFirstLine) {
        this.headers = this.parseCSVLine(line);
        this.isFirstLine = false;
        continue;
      }
      
      const values = this.parseCSVLine(line);
      if (values.length >= 2) { // Ít nhất email và fullname
        const user: BulkUserInput = {
          email: values[0] || '',
          fullname: values[1] || '',
          role: 'STUDENT',
        };
        results.push(user);
      }
    }
    
    return results;
  }
  
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }
  
  finalize(): BulkUserInput[] {
    if (this.buffer.trim()) {
      return this.processChunk('\n');
    }
    return [];
  }
}

// ============================================
// Database Optimizations
// ============================================

/**
 * Batch insert với transaction optimization
 */
export const batchInsertUsers = async (
  users: BulkUserInput[],
  batchSize: number = 50
) => {
  const { prisma } = await import("@/lib/prisma");
  const results = [];
  
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);

    const batchResult = await prisma.$transaction(async (tx) => {
      const promises = batch.map(user => 
        tx.user.create({
          data: {
            email: user.email,
            fullname: user.fullname,
            password: user.password || 'temp_password',
            role: user.role
          },
          select: {
            id: true,
            email: true,
            fullname: true,
            role: true
          }
        })
      );
      
      return Promise.all(promises);
    });
    
    results.push(...batchResult);
    
    // Small delay between batches
    if (i + batchSize < users.length) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  return results;
};

/**
 * Optimized duplicate check với single query
 */
export const checkDuplicatesOptimized = async (emails: string[]): Promise<Set<string>> => {
  const { prisma } = await import("@/lib/prisma");
  
  // Normalize emails
  const normalizedEmails = emails.map(email => email.toLowerCase().trim());
  
  // Single query thay vì multiple queries
  const existingUsers = await prisma.user.findMany({
    where: {
      email: {
        in: normalizedEmails
      }
    },
    select: {
      email: true
    }
  });
  
  return new Set(
    existingUsers.map((user: { email: string }) => user.email),
  );
};

// ============================================
// Frontend Optimizations
// ============================================

/**
 * Debounced function để giảm API calls
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Throttled function để limit execution rate
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Virtual scrolling helper cho large lists
 */
export class VirtualScrollHelper {
  private containerHeight: number;
  private itemHeight: number;
  private scrollTop: number = 0;
  
  constructor(containerHeight: number, itemHeight: number) {
    this.containerHeight = containerHeight;
    this.itemHeight = itemHeight;
  }
  
  getVisibleRange(totalItems: number): { start: number; end: number; offset: number } {
    const visibleCount = Math.ceil(this.containerHeight / this.itemHeight);
    const start = Math.floor(this.scrollTop / this.itemHeight);
    const end = Math.min(start + visibleCount + 1, totalItems);
    const offset = start * this.itemHeight;
    
    return { start, end, offset };
  }
  
  updateScrollTop(scrollTop: number) {
    this.scrollTop = scrollTop;
  }
}

// ============================================
// Caching Strategies
// ============================================

/**
 * Simple in-memory cache với TTL
 */
export class SimpleCache<T> {
  private cache = new Map<string, { data: T; expires: number }>();
  private defaultTTL: number;
  
  constructor(defaultTTL: number = 5 * 60 * 1000) { // 5 minutes
    this.defaultTTL = defaultTTL;
  }
  
  set(key: string, data: T, ttl?: number): void {
    const expires = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { data, expires });
  }
  
  get(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  size(): number {
    return this.cache.size;
  }
}

// Global cache instances
export const teacherSearchCache = new SimpleCache<any[]>(2 * 60 * 1000); // 2 minutes
export const validationCache = new SimpleCache<any>(30 * 1000); // 30 seconds

// ============================================
// Progress Optimization
// ============================================

/**
 * Optimized progress tracking với batch updates
 */
export class OptimizedProgressTracker {
  private progressMap = new Map<string, any>();
  private batchSize = 10;
  private updateQueue: Array<{ operationId: string; progress: any }> = [];
  private flushTimer: NodeJS.Timeout | null = null;
  
  updateProgress(operationId: string, progress: any): void {
    this.updateQueue.push({ operationId, progress });
    
    if (this.updateQueue.length >= this.batchSize) {
      this.flushUpdates();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flushUpdates(), 1000);
    }
  }
  
  private flushUpdates(): void {
    if (this.updateQueue.length === 0) return;
    
    // Process all queued updates
    this.updateQueue.forEach(({ operationId, progress }) => {
      this.progressMap.set(operationId, progress);
    });
    
    this.updateQueue = [];
    
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }
  
  getProgress(operationId: string): any {
    return this.progressMap.get(operationId);
  }
}

// ============================================
// Resource Management
// ============================================

/**
 * Resource pool để manage connections
 */
export class ResourcePool<T> {
  private available: T[] = [];
  private inUse: Set<T> = new Set();
  private factory: () => Promise<T>;
  private destroyer: (resource: T) => Promise<void>;
  private maxSize: number;
  
  constructor(
    factory: () => Promise<T>,
    destroyer: (resource: T) => Promise<void>,
    maxSize: number = 10
  ) {
    this.factory = factory;
    this.destroyer = destroyer;
    this.maxSize = maxSize;
  }
  
  async acquire(): Promise<T> {
    if (this.available.length > 0) {
      const resource = this.available.pop()!;
      this.inUse.add(resource);
      return resource;
    }
    
    if (this.inUse.size < this.maxSize) {
      const resource = await this.factory();
      this.inUse.add(resource);
      return resource;
    }
    
    // Wait for resource to become available
    return new Promise((resolve) => {
      const checkAvailable = () => {
        if (this.available.length > 0) {
          const resource = this.available.pop()!;
          this.inUse.add(resource);
          resolve(resource);
        } else {
          setTimeout(checkAvailable, 100);
        }
      };
      checkAvailable();
    });
  }
  
  async release(resource: T): Promise<void> {
    if (this.inUse.has(resource)) {
      this.inUse.delete(resource);
      this.available.push(resource);
    }
  }
  
  async destroy(): Promise<void> {
    const allResources = [...this.available, ...this.inUse];
    
    await Promise.all(
      allResources.map(resource => this.destroyer(resource))
    );
    
    this.available = [];
    this.inUse.clear();
  }
}

// ============================================
// Export optimized instances
// ============================================

export const optimizedProgressTracker = new OptimizedProgressTracker();
