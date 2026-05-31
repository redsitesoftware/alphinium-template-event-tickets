/**
 * Icebreaker AI — App Configuration
 */
export const APP_NAME = process.env.EXPO_PUBLIC_APP_NAME || 'Icebreaker AI';
export const APP_VERSION = '1.0.0';
export const STRAPI_URL = process.env.EXPO_PUBLIC_API_URL || '';
export const OAUTH_PROVIDERS = (process.env.EXPO_PUBLIC_OAUTH_PROVIDERS || 'google,email')
  .split(',').map(p => p.trim()).filter(Boolean);

export default { APP_NAME, APP_VERSION, STRAPI_URL, OAUTH_PROVIDERS };
