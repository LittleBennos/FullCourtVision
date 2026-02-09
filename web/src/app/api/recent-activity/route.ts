import { NextResponse } from "next/server";
import { getRecentGames, getWeeklyFeaturedGames, getThisWeekInNumbers } from "@/lib/data";

export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  try {
    // Fetch recent activity data with a smaller limit to improve performance
    const [games, featuredGames, weeklyNumbers] = await Promise.all([
      getRecentGames(10), // Reduced from 20 to 10 for better performance
      getWeeklyFeaturedGames(),
      getThisWeekInNumbers(),
    ]);

    return NextResponse.json({
      games,
      featuredGames,
      weeklyNumbers,
    });
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent activity" },
      { status: 500 }
    );
  }
}