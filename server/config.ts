// Configuration constants for MarFaNet system
export const APP_CONFIG = {
  BASE_URL: "https://agent-portal-shield-info9071.replit.app",
  APP_NAME: "MarFaNet Financial Management System",
  APP_VERSION: "1.0.0"
};

// Helper function to get portal link
export function getPortalLink(publicId: string): string {
  return `${APP_CONFIG.BASE_URL}/portal/${publicId}`;
}