import { db } from '@/lib/db';
import { apiKeysTable, usersTable } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm/sql/expressions/conditions';
import { sql } from 'drizzle-orm/sql';
import { generateApiKey } from '@/lib/utils/api-key-generator';

export class ApiKeyService {
  static async createApiKey(userId: string, keyName: string) {
    try {
      const keyValue = generateApiKey();
      
      const newApiKey = {
        userId,
        keyName,
        keyValue,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const [createdApiKey] = await db
        .insert(apiKeysTable)
        .values(newApiKey)
        .returning();

      return createdApiKey;
    } catch (error) {
      console.error('Error creating API key:', error);
      throw new Error('Failed to create API key');
    }
  }

  static async getUserApiKeys(userId: string) {
    try {
      const apiKeys = await db
        .select()
        .from(apiKeysTable)
        .where(eq(apiKeysTable.userId, userId));

      return apiKeys;
    } catch (error) {
      console.error('Error fetching API keys:', error);
      return [];
    }
  }

  static async deleteApiKey(userId: string, keyId: string) {
    try {
      await db
        .delete(apiKeysTable)
        .where(
          and(
            eq(apiKeysTable.id, keyId),
            eq(apiKeysTable.userId, userId)
          )
        );

      return true;
    } catch (error) {
      console.error('Error deleting API key:', error);
      throw new Error('Failed to delete API key');
    }
  }

  static async toggleApiKeyStatus(userId: string, keyId: string, isActive: boolean) {
    try {
      const [updatedApiKey] = await db
        .update(apiKeysTable)
        .set({
          isActive,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(apiKeysTable.id, keyId),
            eq(apiKeysTable.userId, userId)
          )
        )
        .returning();

      return updatedApiKey;
    } catch (error) {
      console.error('Error updating API key status:', error);
      throw new Error('Failed to update API key status');
    }
  }

  static async validateAndIncrementUsage(keyValue: string) {
    try {
      // Find the API key and get user info
      const [apiKey] = await db
        .select({
          id: apiKeysTable.id,
          userId: apiKeysTable.userId,
          keyName: apiKeysTable.keyName,
          isActive: apiKeysTable.isActive,
          userRequestsUsed: usersTable.requestsUsed,
          userRequestsLimit: usersTable.requestsLimit,
        })
        .from(apiKeysTable)
        .leftJoin(usersTable, eq(apiKeysTable.userId, usersTable.uid))
        .where(eq(apiKeysTable.keyValue, keyValue))
        .limit(1);

      if (!apiKey) {
        console.log('API key not found:', keyValue.slice(0, 8) + '...');
        return null;
      }

      // Check if key is active
      if (!apiKey.isActive) {
        console.log('API key is inactive:', keyValue.slice(0, 8) + '...');
        return null;
      }

      // Check if user usage limit is exceeded
      const requestsUsed = Number(apiKey.userRequestsUsed) || 0;
      const requestsLimit = Number(apiKey.userRequestsLimit) || 1000;

      if (requestsUsed >= requestsLimit) {
        console.log('Request limit exceeded:', { requestsUsed, requestsLimit });
        return null;
      }

      // Increment user's usage count
      console.log('Incrementing usage count for user:', apiKey.userId);
      await db
        .update(usersTable)
        .set({
          requestsUsed: sql`COALESCE(${usersTable.requestsUsed}, 0) + 1`,
        })
        .where(eq(usersTable.uid, apiKey.userId));

      const newRequestsUsed = requestsUsed + 1;

      console.log('Usage incremented successfully:', {
        userId: apiKey.userId,
        oldCount: requestsUsed,
        newCount: newRequestsUsed,
      });

      return {
        id: apiKey.id,
        userId: apiKey.userId,
        keyName: apiKey.keyName,
        isActive: apiKey.isActive,
        requestsUsed: newRequestsUsed,
        requestsLimit: requestsLimit,
      };
    } catch (error) {
      console.error('Error in validateAndIncrementUsage:', error);
      throw error;
    }
  }

  static async validateApiKey(keyValue: string) {
    try {
      const [apiKey] = await db
        .select({
          id: apiKeysTable.id,
          userId: apiKeysTable.userId,
          keyName: apiKeysTable.keyName,
          isActive: apiKeysTable.isActive,
          userRequestsUsed: usersTable.requestsUsed,
          userRequestsLimit: usersTable.requestsLimit,
        })
        .from(apiKeysTable)
        .leftJoin(usersTable, eq(apiKeysTable.userId, usersTable.uid))
        .where(eq(apiKeysTable.keyValue, keyValue))
        .limit(1);

      if (!apiKey) {
        return null;
      }

      const requestsUsed = Number(apiKey.userRequestsUsed) || 0;
      const requestsLimit = Number(apiKey.userRequestsLimit) || 1000;

      if (!apiKey.isActive || requestsUsed >= requestsLimit) {
        return null;
      }

      return {
        id: apiKey.id,
        userId: apiKey.userId,
        keyName: apiKey.keyName,
        isActive: apiKey.isActive,
        requestsUsed: requestsUsed,
        requestsLimit: requestsLimit,
      };
    } catch (error) {
      console.error('Error validating API key:', error);
      throw error;
    }
  }
}
