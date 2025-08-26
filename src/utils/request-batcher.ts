import { Env } from '../types/env';

/**
 * Generic interface for a batch processing function
 */
export interface BatchProcessor<T, R> {
  (items: T[], env: Env): Promise<R[]>;
}

/**
 * Request Batcher - Batches individual requests to reduce database calls
 *
 * This utility class allows batching of individual requests to improve performance
 * by reducing the number of database or API calls. It's particularly useful for
 * high-volume endpoints like globe data points, search results, etc.
 */
export class RequestBatcher<T, R> {
  private batchSize: number;
  private maxWaitTime: number;
  private batchProcessor: BatchProcessor<T, R>;
  private currentBatch: T[] = [];
  private batchPromises: Map<T, { resolve: (value: R) => void; reject: (reason: any) => void }> =
    new Map();
  private batchTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Constructor for RequestBatcher
   *
   * @param batchProcessor - Function that processes the batch
   * @param batchSize - Maximum size of a batch before processing
   * @param maxWaitTime - Maximum time to wait before processing a non-full batch (in ms)
   */
  constructor(
    batchProcessor: BatchProcessor<T, R>,
    batchSize: number = 25,
    maxWaitTime: number = 100
  ) {
    this.batchProcessor = batchProcessor;
    this.batchSize = batchSize;
    this.maxWaitTime = maxWaitTime;
  }

  /**
   * Add an item to the batch and get a promise for the result
   *
   * @param item - The item to process
   * @param env - The environment object needed for processing
   * @returns Promise that resolves with the result for this specific item
   */
  async add(item: T, env: Env): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      // Add item to the current batch
      this.currentBatch.push(item);

      // Store the promise callbacks
      this.batchPromises.set(item, { resolve, reject });

      // Process the batch if it's full
      if (this.currentBatch.length >= this.batchSize) {
        this.processBatch(env);
      }
      // Set a timer to process the batch after maxWaitTime
      else if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => {
          this.processBatch(env);
        }, this.maxWaitTime);
      }
    });
  }

  /**
   * Process the current batch of items
   */
  private async processBatch(env: Env): Promise<void> {
    // Clear the timer if it exists
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // If the batch is empty, return
    if (this.currentBatch.length === 0) {
      return;
    }

    // Take the current batch and reset for the next batch
    const batchToProcess = [...this.currentBatch];
    const promises = new Map(this.batchPromises);

    this.currentBatch = [];
    this.batchPromises = new Map();

    try {
      // Process the batch
      const results = await this.batchProcessor(batchToProcess, env);

      // Resolve individual promises
      batchToProcess.forEach((item, index) => {
        const promise = promises.get(item);
        if (promise) {
          promise.resolve(results[index]);
        }
      });
    } catch (error) {
      // Reject all promises in the batch
      batchToProcess.forEach(item => {
        const promise = promises.get(item);
        if (promise) {
          promise.reject(error);
        }
      });
    }
  }

  /**
   * Force processing of the current batch, regardless of size or wait time
   */
  flush(env: Env): void {
    if (this.currentBatch.length > 0) {
      this.processBatch(env);
    }
  }
}
