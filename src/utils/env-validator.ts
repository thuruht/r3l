/**
 * Environment variable validation utility
 * Ensures all required environment variables are present and correctly formatted
 */

import { AppError } from '../types/errors';
import { Env } from '../types/env';

// Define required environment variables
const REQUIRED_ENV_VARS = [
  'JWT_SECRET',
  'WORKER_ENV', // 'development', 'staging', or 'production'
  'KV_NAMESPACE',
  'D1_DATABASE',
  'R2_BUCKET',
  'ALLOWED_ORIGINS',
  'MAX_UPLOAD_SIZE',
  'CONTENT_EXPIRATION_DAYS',
  'RATE_LIMIT_REQUESTS',
  'RATE_LIMIT_WINDOW',
];

// Define variable format validators
type ValidatorFn = (value: string) => boolean;
type Validators = {
  [key: string]: ValidatorFn;
};

const VALIDATORS: Validators = {
  JWT_SECRET: (value: string) => value.length >= 32,
  WORKER_ENV: (value: string) => ['development', 'staging', 'production'].includes(value),
  KV_NAMESPACE: (value: string) => value.length > 0,
  D1_DATABASE: (value: string) => value.length > 0,
  R2_BUCKET: (value: string) => value.length > 0,
  ALLOWED_ORIGINS: (value: string) => {
    try {
      const origins = JSON.parse(value);
      return Array.isArray(origins) && origins.every(origin => typeof origin === 'string');
    } catch (error) {
      return false;
    }
  },
  MAX_UPLOAD_SIZE: (value: string) => {
    const size = parseInt(value, 10);
    return !isNaN(size) && size > 0 && size <= 100 * 1024 * 1024; // Max 100MB
  },
  CONTENT_EXPIRATION_DAYS: (value: string) => {
    const days = parseInt(value, 10);
    return !isNaN(days) && days > 0;
  },
  RATE_LIMIT_REQUESTS: (value: string) => {
    const requests = parseInt(value, 10);
    return !isNaN(requests) && requests > 0;
  },
  RATE_LIMIT_WINDOW: (value: string) => {
    const window = parseInt(value, 10);
    return !isNaN(window) && window > 0;
  },
};

class EnvironmentError extends AppError {
  constructor(message: string) {
    super(message, 'ENVIRONMENT_ERROR', 500);
  }
}

/**
 * Validates that all required environment variables are present and correctly formatted
 * @param env The environment object to validate
 * @returns The validated environment
 * @throws EnvironmentError if validation fails
 */
export function validateEnvironment(env: Env): Env {
  const missingVars: string[] = [];
  const invalidVars: string[] = [];

  // Check for missing variables
  for (const varName of REQUIRED_ENV_VARS) {
    if (!env[varName as keyof Env]) {
      missingVars.push(varName);
    } else if (VALIDATORS[varName] && !VALIDATORS[varName](env[varName as keyof Env] as string)) {
      invalidVars.push(varName);
    }
  }

  // If any variables are missing or invalid, throw an error
  if (missingVars.length > 0 || invalidVars.length > 0) {
    let errorMessage = '';
    
    if (missingVars.length > 0) {
      errorMessage += `Missing required environment variables: ${missingVars.join(', ')}. `;
    }
    
    if (invalidVars.length > 0) {
      errorMessage += `Invalid environment variables: ${invalidVars.join(', ')}. `;
    }
    
    throw new EnvironmentError(errorMessage);
  }

  return env;
}

/**
 * Gets a typed environment variable
 * @param env The environment object
 * @param key The key of the environment variable
 * @param defaultValue Optional default value if the environment variable is not present
 * @returns The typed environment variable
 */
export function getEnvVar<T>(env: Env, key: keyof Env, defaultValue?: T): T {
  if (env[key] === undefined && defaultValue === undefined) {
    throw new EnvironmentError(`Environment variable ${String(key)} is required but not provided`);
  }
  
  return (env[key] !== undefined ? env[key] : defaultValue) as T;
}

/**
 * Gets a numeric environment variable
 * @param env The environment object
 * @param key The key of the environment variable
 * @param defaultValue Optional default value if the environment variable is not present
 * @returns The numeric environment variable
 */
export function getNumericEnvVar(env: Env, key: keyof Env, defaultValue?: number): number {
  const value = getEnvVar<string>(env, key, defaultValue?.toString());
  const numValue = Number(value);
  
  if (isNaN(numValue)) {
    throw new EnvironmentError(`Environment variable ${String(key)} must be a number`);
  }
  
  return numValue;
}

/**
 * Gets a boolean environment variable
 * @param env The environment object
 * @param key The key of the environment variable
 * @param defaultValue Optional default value if the environment variable is not present
 * @returns The boolean environment variable
 */
export function getBooleanEnvVar(env: Env, key: keyof Env, defaultValue?: boolean): boolean {
  const value = getEnvVar<string>(env, key, defaultValue?.toString());
  return value === 'true' || value === '1';
}

/**
 * Gets a JSON environment variable
 * @param env The environment object
 * @param key The key of the environment variable
 * @param defaultValue Optional default value if the environment variable is not present
 * @returns The parsed JSON environment variable
 */
export function getJsonEnvVar<T>(env: Env, key: keyof Env, defaultValue?: T): T {
  const value = getEnvVar<string>(env, key, defaultValue !== undefined ? JSON.stringify(defaultValue) : undefined);
  
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    throw new EnvironmentError(`Environment variable ${String(key)} must be valid JSON`);
  }
}
