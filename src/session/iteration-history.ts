import { ImageGenerationResult } from '../types/index.js';

export interface Iteration {
  index: number;
  prompt: string;
  result: ImageGenerationResult;
  timestamp: string;
  rolledBackTo?: boolean;
  metadata?: {
    variantSetId?: string;
    isVariantGeneration?: boolean;
    variantCount?: number;
    baseVariantId?: string;
  };
}

export class IterationHistory {
  private iterations: Iteration[] = [];
  private currentIndex: number = -1;

  constructor(_sessionId: string) {
  }

  addIteration(prompt: string, result: ImageGenerationResult): Iteration {
    const iteration: Iteration = {
      index: this.iterations.length,
      prompt,
      result,
      timestamp: new Date().toISOString(),
    };

    this.iterations.push(iteration);
    this.currentIndex = this.iterations.length - 1;
    return iteration;
  }

  getIteration(index: number): Iteration | null {
    if (index < 0 || index >= this.iterations.length) {
      return null;
    }

    return this.iterations[index];
  }

  getLastN(n: number): Iteration[] {
    if (n <= 0) {
      return [];
    }

    const start = Math.max(0, this.iterations.length - n);
    return this.iterations.slice(start);
  }

  getAllIterations(): Iteration[] {
    return [...this.iterations];
  }

  markRolledBackTo(index: number): void {
    if (index < 0 || index >= this.iterations.length) {
      throw new Error(`Invalid iteration index: ${index}`);
    }

    this.iterations[index].rolledBackTo = true;
  }

  undo(): Iteration | null {
    if (this.currentIndex <= 0) {
      return null;
    }

    this.currentIndex -= 1;
    return this.iterations[this.currentIndex];
  }

  redo(): Iteration | null {
    if (this.currentIndex >= this.iterations.length - 1) {
      return null;
    }

    this.currentIndex += 1;
    return this.iterations[this.currentIndex];
  }

  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.iterations.length - 1;
  }

  getCurrentIteration(): Iteration | null {
    if (this.currentIndex < 0 || this.currentIndex >= this.iterations.length) {
      return null;
    }

    return this.iterations[this.currentIndex];
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  clear(): void {
    this.iterations = [];
  }

  size(): number {
    return this.iterations.length;
  }
}
