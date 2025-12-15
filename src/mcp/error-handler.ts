export enum ErrorCategory {
  SETUP = 'setup',
  RUNTIME = 'runtime',
  VALIDATION = 'validation',
  TIMEOUT = 'timeout',
  SYSTEM = 'system',
}

export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  FATAL = 'fatal',
}

export interface StructuredError {
  category: ErrorCategory;
  severity: ErrorSeverity;
  userMessage: string;
  technicalMessage: string;
  suggestedAction?: string;
  retryable: boolean;
  contextData?: Record<string, unknown>;
}

export interface ErrorPattern {
  pattern: RegExp | string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  userMessageTemplate: string;
  suggestedAction?: string;
  retryable: boolean;
}

export const ERROR_PATTERNS: ErrorPattern[] = [
  {
    pattern: /Python not found|command not found.*python/i,
    category: ErrorCategory.SETUP,
    severity: ErrorSeverity.FATAL,
    userMessageTemplate: "I couldn't find Python on your system. Install Python 3.9 or newer from python.org, then try again.",
    suggestedAction: "Visit https://python.org/downloads or run `brew install python@3.11` (macOS)",
    retryable: false,
  },
  {
    pattern: /Python (\d+\.\d+).* required.*found (\d+\.\d+)/i,
    category: ErrorCategory.SETUP,
    severity: ErrorSeverity.ERROR,
    userMessageTemplate: "Your Python version is too old. I need version 3.9 or newer.",
    suggestedAction: "Run `brew install python@3.11` or download from python.org",
    retryable: false,
  },
  {
    pattern: /ModuleNotFoundError.*mlx|No module named 'mlx'/i,
    category: ErrorCategory.SETUP,
    severity: ErrorSeverity.ERROR,
    userMessageTemplate: "I'm missing the MLX library needed for image generation.",
    suggestedAction: "Run `pip install mlx` to install it",
    retryable: false,
  },
  {
    pattern: /mlx.*Metal.*not available|Metal device not found/i,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.FATAL,
    userMessageTemplate: "MLX requires Apple Silicon (M1/M2/M3/M4) with Metal support. Your system doesn't have compatible hardware.",
    suggestedAction: "Use a Mac with Apple Silicon chip, or wait for Phase 2 (cloud API support)",
    retryable: false,
  },
  {
    pattern: /ModuleNotFoundError.*huggingface_hub|No module named 'huggingface_hub'/i,
    category: ErrorCategory.SETUP,
    severity: ErrorSeverity.ERROR,
    userMessageTemplate: "I'm missing the Hugging Face library needed to download models.",
    suggestedAction: "Run `pip install huggingface-hub` to install it",
    retryable: false,
  },
  {
    pattern: /ModuleNotFoundError.*PIL|No module named 'PIL'/i,
    category: ErrorCategory.SETUP,
    severity: ErrorSeverity.ERROR,
    userMessageTemplate: "I'm missing the Pillow library needed for image processing.",
    suggestedAction: "Run `pip install pillow` to install it",
    retryable: false,
  },
  {
    pattern: /Model.*not downloaded|model files not found/i,
    category: ErrorCategory.SETUP,
    severity: ErrorSeverity.ERROR,
    userMessageTemplate: "The AI model hasn't been downloaded yet. This is a one-time download (~5-7GB).",
    suggestedAction: "Run the setup wizard with `npm start` or manually download the model",
    retryable: false,
  },
  {
    pattern: /Out of memory|OutOfMemoryError|MemoryError/i,
    category: ErrorCategory.RUNTIME,
    severity: ErrorSeverity.ERROR,
    userMessageTemplate: "Your system ran out of memory during generation.",
    suggestedAction: "Try a smaller image size (512x512 instead of 1024x1024) or close other applications",
    retryable: true,
  },
  {
    pattern: /timeout|timed out|TimeoutError/i,
    category: ErrorCategory.TIMEOUT,
    severity: ErrorSeverity.WARNING,
    userMessageTemplate: "Generation took too long and was cancelled.",
    suggestedAction: "Try simpler settings (fewer steps, smaller image) and try again",
    retryable: true,
  },
  {
    pattern: /network.*error|connection.*refused|ECONNREFUSED/i,
    category: ErrorCategory.RUNTIME,
    severity: ErrorSeverity.WARNING,
    userMessageTemplate: "Couldn't connect to download the model due to network issues.",
    suggestedAction: "Check your internet connection and try again",
    retryable: true,
  },
  {
    pattern: /permission denied|EACCES|EPERM/i,
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.ERROR,
    userMessageTemplate: "I don't have permission to access required files or directories.",
    suggestedAction: "Check file permissions or run with appropriate privileges",
    retryable: false,
  },
  {
    pattern: /spawn.*ENOENT/i,
    category: ErrorCategory.SETUP,
    severity: ErrorSeverity.FATAL,
    userMessageTemplate: "Couldn't start the Python process. Python may not be installed correctly.",
    suggestedAction: "Verify Python installation with `python3 --version`",
    retryable: false,
  },
  {
    pattern: /quota.*exceeded|rate.*limit|too many requests|429/i,
    category: ErrorCategory.RUNTIME,
    severity: ErrorSeverity.ERROR,
    userMessageTemplate: "You've reached the API usage limit. Please wait a few minutes and try again.",
    suggestedAction: "Wait 5-10 minutes before retrying, or check your API quota settings",
    retryable: true,
  },
  {
    pattern: /insufficient.*quota|quota.*depleted|credits.*exhausted/i,
    category: ErrorCategory.RUNTIME,
    severity: ErrorSeverity.ERROR,
    userMessageTemplate: "Your API quota has been exhausted. You may need to upgrade your plan or wait for quota reset.",
    suggestedAction: "Check your API dashboard for quota details and reset time",
    retryable: false,
  },
  {
    pattern: /concurrency.*limit|too many.*concurrent|parallel.*limit/i,
    category: ErrorCategory.RUNTIME,
    severity: ErrorSeverity.WARNING,
    userMessageTemplate: "Too many operations running at once. Some requests are being queued.",
    suggestedAction: "Wait for current operations to complete before starting new ones",
    retryable: true,
  },
];

export class ErrorHandler {
  static categorizeError(error: Error | string, context?: Record<string, unknown>): StructuredError {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const technicalMessage = error instanceof Error ? `${error.name}: ${error.message}` : String(error);

    for (const errorPattern of ERROR_PATTERNS) {
      const matches = this.matchesPattern(errorMessage, errorPattern.pattern);
      if (matches) {
        const userMessage = this.formatMessage(errorPattern.userMessageTemplate, matches);

        return {
          category: errorPattern.category,
          severity: errorPattern.severity,
          userMessage,
          technicalMessage,
          suggestedAction: errorPattern.suggestedAction,
          retryable: errorPattern.retryable,
          contextData: context,
        };
      }
    }

    return {
      category: ErrorCategory.RUNTIME,
      severity: ErrorSeverity.ERROR,
      userMessage: "Something went wrong during the operation.",
      technicalMessage,
      suggestedAction: "Check the error details and try again",
      retryable: true,
      contextData: context,
    };
  }

  private static matchesPattern(message: string, pattern: RegExp | string): RegExpMatchArray | null {
    if (pattern instanceof RegExp) {
      return message.match(pattern);
    }
    return message.includes(pattern) ? [message] : null;
  }

  private static formatMessage(template: string, matches: RegExpMatchArray): string {
    let formatted = template;
    matches.forEach((match, index) => {
      formatted = formatted.replace(`{${index}}`, match);
    });
    formatted = formatted.replace(`{found}`, matches[2] || '');
    formatted = formatted.replace(`{required}`, matches[1] || '');
    return formatted;
  }

  static formatForMCP(structuredError: StructuredError): { content: Array<{ type: 'text'; text: string }> } {
    let text = `⚠️ ${structuredError.userMessage}`;

    if (structuredError.suggestedAction) {
      text += `\n\n💡 ${structuredError.suggestedAction}`;
    }

    if (structuredError.severity === ErrorSeverity.FATAL) {
      text += '\n\n🚫 This issue must be resolved before continuing.';
    } else if (structuredError.retryable) {
      text += '\n\n🔄 You can retry this operation after fixing the issue.';
    }

    return {
      content: [{ type: 'text' as const, text }],
    };
  }

  static createError(
    category: ErrorCategory,
    severity: ErrorSeverity,
    userMessage: string,
    technicalMessage?: string,
    suggestedAction?: string,
    retryable: boolean = true,
    context?: Record<string, unknown>
  ): StructuredError {
    return {
      category,
      severity,
      userMessage,
      technicalMessage: technicalMessage || userMessage,
      suggestedAction,
      retryable,
      contextData: context,
    };
  }

  static isRetryable(error: StructuredError): boolean {
    return error.retryable && error.severity !== ErrorSeverity.FATAL;
  }

  static isFatal(error: StructuredError): boolean {
    return error.severity === ErrorSeverity.FATAL;
  }
}
