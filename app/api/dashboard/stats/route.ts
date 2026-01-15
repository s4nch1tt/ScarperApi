import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiKey } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's API key stats
    const keys = await db
      .select()
      .from(apiKey)
      .where(eq(apiKey.userId, session.user.id));

    const stats = {
      totalApiCalls: keys.reduce((sum, key) => sum + key.requestCount, 0),
      totalQuota: keys.reduce((sum, key) => sum + key.requestQuota, 0),
      activeKeys: keys.filter(key => key.isActive).length,
      successRate: keys.length > 0 
        ? ((keys.reduce((sum, key) => sum + key.requestCount, 0) / keys.reduce((sum, key) => sum + key.requestQuota, 0)) * 100).toFixed(1)
        : "0.0",
      lastUsed: keys.length > 0 && keys[0].lastUsedAt
        ? new Date(keys[0].lastUsedAt).toISOString()
        : null,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
