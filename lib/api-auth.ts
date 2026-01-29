import { NextRequest, NextResponse } from "next/server";

// Mock user for unlimited access
const UNLIMITED_USER = {
  id: "unlimited_admin",
  email: "admin@unlimited.local",
  plan: "premium",
  credits: Infinity,
};

/**
 * BYPASSED VALIDATION
 * Always returns success, effectively removing API keys, Login requirements, and Rate Limits.
 * No database connection is required for this check.
 */
export async function validateApiKey(
  request: NextRequest
): Promise<{ valid: boolean; error?: string; keyData?: any }> {
  // Optional: Log usage to see endpoints being hit
  // console.log(`[Unlimited Access] ${request.method} ${request.nextUrl.pathname}`);

  return {
    valid: true,
    keyData: {
        // Mock key data structure to prevent crashes in routes expecting this
        id: "bypass_key",
        userId: UNLIMITED_USER.id,
        key: "bypass",
        isActive: true,
        requestCount: 0,
        requestQuota: Infinity,
    },
  };
}

/**
 * Helper to bypass unauthorized responses
 */
export function createUnauthorizedResponse(error: string) {
    // This function acts as a safeguard, though validateApiKey should prevent it from being called.
    return NextResponse.json(
        {
          success: true, 
          message: "Unlimited access active - No login required"
        },
        { status: 200 }
    );
}

// Export aliases if needed by other files
export const verifyRequest = validateApiKey;
export const authenticateApi = validateApiKey;
