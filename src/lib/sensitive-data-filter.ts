export interface SensitivePattern {
  name: string;
  pattern: RegExp;
  replacement: string;
}

export const SENSITIVE_PATTERNS: SensitivePattern[] = [
  {
    name: 'API Key',
    pattern: /(sk_|pk_|api_?key[=:\s]+)([a-zA-Z0-9_-]{20,})/gi,
    replacement: '$1[REDACTED]',
  },
  {
    name: 'Bearer Token',
    pattern: /(bearer\s+)([a-zA-Z0-9._-]{20,})/gi,
    replacement: '$1[REDACTED]',
  },
  {
    name: 'Generic Token',
    pattern: /(token[=:\s]+)([a-zA-Z0-9._-]{20,})/gi,
    replacement: '$1[REDACTED]',
  },
  {
    name: 'AWS Key',
    pattern: /(AKIA[A-Z0-9]{16})/g,
    replacement: '[REDACTED_AWS_KEY]',
  },
  {
    name: 'Home Path',
    pattern: new RegExp(`${process.env.HOME || '/Users/[^/]+'}/`, 'g'),
    replacement: '~/',
  },
];

export class SensitiveDataFilter {
  static filterString(input: string): string {
    let filtered = input;

    for (const pattern of SENSITIVE_PATTERNS) {
      filtered = filtered.replace(pattern.pattern, pattern.replacement);
    }

    if (filtered.length > 200) {
      filtered = filtered.substring(0, 200) + '... [REDACTED - content truncated]';
    }

    return filtered;
  }

  static filterObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.filterString(obj);
    }

    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.filterObject(item));
    }

    const filtered: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      if (lowerKey.includes('key') ||
          lowerKey.includes('token') ||
          lowerKey.includes('secret') ||
          lowerKey.includes('password') ||
          lowerKey.includes('apikey')) {
        filtered[key] = '[REDACTED]';
      } else if (lowerKey === 'prompt' && typeof value === 'string' && value.length > 200) {
        filtered[key] = value.substring(0, 200) + '... [REDACTED - prompt truncated]';
      } else if (typeof value === 'object') {
        filtered[key] = this.filterObject(value);
      } else if (typeof value === 'string') {
        filtered[key] = this.filterString(value);
      } else {
        filtered[key] = value;
      }
    }

    return filtered;
  }

  static filter(data: any): any {
    if (typeof data === 'string') {
      return this.filterString(data);
    }
    return this.filterObject(data);
  }
}
