import { ApiKeyService } from '@/lib/services/api-key-service';

export interface ApiKeyValidationResult {
  isValid: boolean;
  apiKey?: any;
  user?: any;
  error?: string;
}

export async function validateApiKey(request: Request): Promise<ApiKeyValidationResult> {
  try {
    // Get API key from headers
    const apiKey = request.headers.get('x-api-key') || 
                   request.headers.get('authorization')?.replace('Bearer ', '') ||
                   new URL(request.url).searchParams.get('api_key');

    console.log('API key validation attempt:', { 
      hasApiKey: !!apiKey, 
      keyPreview: apiKey ? `${apiKey.slice(0, 8)}...` : 'none' 
    });

    if (!apiKey) {
      return {
        isValid: false,
        error: 'API key is required. Provide it in x-api-key header, authorization header, or api_key query parameter.'
      };
    }

    // Validate the API key AND increment user usage in one call
    const keyData = await ApiKeyService.validateAndIncrementUsage(apiKey);
    
    if (!keyData) {
      console.log('API key validation failed: Invalid key or limit exceeded');
      return {
        isValid: false,
        error: 'Invalid API key or request limit exceeded. Please check your API key and usage limits.'
      };
    }

    const remainingRequests = Math.max(0, (keyData.requestsLimit || 1000) - (keyData.requestsUsed || 0));

    console.log('API key validation successful and usage incremented:', { 
      keyName: keyData.keyName,
      remainingRequests: remainingRequests,
      requestsUsed: keyData.requestsUsed,
      requestsLimit: keyData.requestsLimit
    });

    return {
      isValid: true,
      apiKey: keyData,
      user: {
        uid: keyData.userId,
        requestsUsed: keyData.requestsUsed,
        requestsLimit: keyData.requestsLimit
      }
    };
  } catch (error) {
    console.error('API key validation error:', error);
    return {
      isValid: false,
      error: 'Internal server error during API key validation'
    };
  }
}

export function createUnauthorizedResponse(error: string) {
  return new Response(
    JSON.stringify({
      success: false,
      error,
      code: 'UNAUTHORIZED',
      message: 'Please provide a valid API key to access this endpoint'
    }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Bearer realm="API Key Required"'
      }
    }
  );
}
