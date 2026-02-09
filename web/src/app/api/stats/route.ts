import { NextResponse } from "next/server";
import { getStats } from "@/lib/data";

export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  try {
    const stats = await getStats();
    
    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    
    // Return fallback stats if DB is unavailable
    return NextResponse.json({
      players: 57000,
      games: 89000,
      organisations: 150,
      teams: 2500,
      competitions: 50,
      seasons: 200,
      grades: 800,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  }
}