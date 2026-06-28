// Validation utilities
import { ERROR_MESSAGES } from '../config';

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export type ValidationRule<T> = {
  validate: (value: T) => boolean;
  message: string;
};

export function required(message?: string): ValidationRule<string> {
  return {
    validate: (v: string) => v.trim().length > 0,
    message: message || ERROR_MESSAGES.validation,
  };
}

export function minLength(min: number, message?: string): ValidationRule<string> {
  return {
    validate: (v: string) => v.trim().length >= min,
    message: message || `Minimal ${min} karakter`,
  };
}

export function maxLength(max: number, message?: string): ValidationRule<string> {
  return {
    validate: (v: string) => v.trim().length <= max,
    message: message || `Maksimal ${max} karakter`,
  };
}

export function email(message?: string): ValidationRule<string> {
  return {
    validate: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    message: message || 'Email tidak valid',
  };
}

export function url(message?: string): ValidationRule<string> {
  return {
    validate: (v: string) => /^https?:\/\/.+/.test(v),
    message: message || 'URL tidak valid',
  };
}

export function validate<T>(value: T, rules: ValidationRule<T>[]): string | null {
  for (const rule of rules) {
    if (!rule.validate(value)) return rule.message;
  }
  return null;
}

export function validateAll<T extends Record<string, any>>(
  obj: T,
  schema: { [K in keyof T]?: ValidationRule<T[K]>[] }
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const key of Object.keys(schema)) {
    const rules = schema[key as keyof T];
    if (rules) {
      const err = validate(obj[key as keyof T], rules);
      if (err) errors[key] = err;
    }
  }
  return errors;
}

export function sanitize(str: string): string {
  return str.trim().replace(/[<>]/g, '');
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function isValidId(id: string | number): boolean {
  if (typeof id === 'number') return id > 0;
  return id.length > 0;
}
