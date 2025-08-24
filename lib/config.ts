/**
 * Configuration utility for handling environment variables
 * Safely manages development vs production configurations
 */

interface Config {
  isProduction: boolean;
  isDevelopment: boolean;
  supabase: {
    url: string;
    anonKey: string;
  };
  oauth: {
    google: {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
    };
    notion: {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
    };
  };
  ai: {
    cursorKey: string;
    endpoint: string;
    proxyEndpoint: string;
  };
  urls: {
    baseUrl: string;
    authCallback: string;
  };
}

// Helper function to get environment variable safely
const getEnvVar = (key: string, fallback?: string): string => {
  const value = process.env[key];
  if (!value && fallback === undefined) {
    console.warn(`⚠️ Environment variable ${key} is not set`);
    return '';
  }
  return value || fallback || '';
};

// Determine environment
const isProduction = process.env.NODE_ENV === 'production' || 
                    process.env.EXPO_PUBLIC_IS_PRODUCTION === 'true';

const isDevelopment = !isProduction;

// Base URL configuration
const getBaseUrl = (): string => {
  if (isProduction) {
    // In production, use the actual domain
    return process.env.EXPO_PUBLIC_BASE_URL || 'https://kindframe.expo.dev';
  }
  // In development, use localhost
  return 'http://localhost:8082';
};

const baseUrl = getBaseUrl();
const authCallback = `${baseUrl}/auth-callback`;

// Configuration object
export const config: Config = {
  isProduction,
  isDevelopment,
  supabase: {
    url: getEnvVar('EXPO_PUBLIC_SUPABASE_URL'),
    anonKey: getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  },
  oauth: {
    google: {
      clientId: getEnvVar('EXPO_PUBLIC_GOOGLE_CLIENT_ID'),
      clientSecret: getEnvVar('EXPO_PUBLIC_GOOGLE_CLIENT_SECRET'),
      redirectUri: getEnvVar('EXPO_PUBLIC_GOOGLE_REDIRECT_URI', authCallback),
    },
    notion: {
      clientId: getEnvVar('EXPO_PUBLIC_NOTION_CLIENT_ID'),
      clientSecret: getEnvVar('EXPO_PUBLIC_NOTION_CLIENT_SECRET'),
      redirectUri: getEnvVar('EXPO_PUBLIC_NOTION_REDIRECT_URI', authCallback),
    },
  },
  ai: {
    cursorKey: getEnvVar('EXPO_PUBLIC_CURSOR_AI_KEY'),
    endpoint: getEnvVar('CURSOR_AI_ENDPOINT', 'https://api.openai.com/v1/chat/completions'),
    proxyEndpoint: getEnvVar('AI_PROXY_ENDPOINT', 'https://your-backend-domain.com/api/ai'),
  },
  urls: {
    baseUrl,
    authCallback,
  },
};

// Validation function
export const validateConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!config.supabase.url) errors.push('EXPO_PUBLIC_SUPABASE_URL is required');
  if (!config.supabase.anonKey) errors.push('EXPO_PUBLIC_SUPABASE_ANON_KEY is required');
  if (!config.oauth.google.clientId) errors.push('EXPO_PUBLIC_GOOGLE_CLIENT_ID is required');
  if (!config.oauth.notion.clientId) errors.push('EXPO_PUBLIC_NOTION_CLIENT_ID is required');
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Log configuration (only in development)
if (isDevelopment) {
  console.log('🔧 Development Configuration:', {
    baseUrl: config.urls.baseUrl,
    authCallback: config.urls.authCallback,
    isProduction: config.isProduction,
  });
}

export default config;
