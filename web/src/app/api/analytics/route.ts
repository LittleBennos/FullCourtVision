import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface StatsDistribution {
  statType: string;
  range: string;
  count: number;
  percentage: number;
}

export interface PaceAnalysis {
  gradeName: string;
  competitionName: string;
  avgPointsPerGame: number;
  totalGames: number;
  gradeType: string;
}

export interface FoulAnalysis {
  playerName: string;
  teamName: string;
  gradeName: string;
  gamesPlayed: number;
  totalFouls: number;
  foulsPerGame: number;
}

export interface GradeFoulAnalysis {
  gradeName: string;
  totalFouls: number;
  avgFoulsPerGame: number;
  totalGames: number;
}

export interface ScoringEfficiency {
  gradeName: string;
  total1Point: number;
  total2Point: number;
  total3Point: number;
  percentage1Point: number;
  percentage2Point: number;
  percentage3Point: number;
  gradeType: string;
}

export interface AnalyticsData {
  statsDistribution: StatsDistribution[];
  paceAnalysis: PaceAnalysis[];
  foulAnalysis: {
    players: FoulAnalysis[];
    grades: GradeFoulAnalysis[];
  };
  scoringEfficiency: ScoringEfficiency[];
}

export async function GET() {
  try {
    // Use Supabase RPC for analytics queries
    // PPG distribution
    const { data: ppgRaw } = await supabase.rpc('get_ppg_distribution').single();
    
    // For now, use simplified Supabase queries
    // 1. Stats distribution from player_aggregates
    const { data: playerStats } = await supabase
      .from('player_aggregates')
      .select('ppg, total_games')
      .gte('total_games', 5);

    const ppgBuckets: Record<string, number> = { '0-5': 0, '5-10': 0, '10-15': 0, '15-20': 0, '20-25': 0, '25-30': 0, '30+': 0 };
    for (const p of (playerStats || [])) {
      const ppg = Number(p.ppg);
      if (ppg < 5) ppgBuckets['0-5']++;
      else if (ppg < 10) ppgBuckets['5-10']++;
      else if (ppg < 15) ppgBuckets['10-15']++;
      else if (ppg < 20) ppgBuckets['15-20']++;
      else if (ppg < 25) ppgBuckets['20-25']++;
      else if (ppg < 30) ppgBuckets['25-30']++;
      else ppgBuckets['30+']++;
    }

    const total = (playerStats || []).length || 1;
    const statsDistribution = Object.entries(ppgBuckets).map(([range, count]) => ({
      statType: 'PPG',
      range,
      count,
      percentage: Math.round((count / total) * 100)
    }));

    const analyticsData: AnalyticsData = {
      statsDistribution,
      paceAnalysis: [],
      foulAnalysis: { players: [], grades: [] },
      scoringEfficiency: []
    };

    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 });
  }
}

// Legacy SQLite version - kept for reference
async function _legacyGET() {
  try {
    const db = null as any; // disabled
    const ppgDistribution = db.prepare(`
      WITH ppg_stats AS (
        SELECT CAST(total_points AS FLOAT) / NULLIF(games_played, 0) as ppg
        FROM player_stats 
        WHERE games_played >= 5 AND total_points > 0
      )
      SELECT 
        CASE 
          WHEN ppg < 5 THEN '0-5'
          WHEN ppg < 10 THEN '5-10'
          WHEN ppg < 15 THEN '10-15'
          WHEN ppg < 20 THEN '15-20'
          WHEN ppg < 25 THEN '20-25'
          WHEN ppg < 30 THEN '25-30'
          ELSE '30+'
        END as range,
        COUNT(*) as count
      FROM ppg_stats
      GROUP BY range
      ORDER BY MIN(ppg)
    `).all();

    const threePtDistribution = db.prepare(`
      WITH threept_stats AS (
        SELECT 
          CAST(three_point AS FLOAT) / NULLIF(one_point + two_point + three_point, 0) * 100 as threept_pct
        FROM player_stats 
        WHERE games_played >= 5 AND (one_point + two_point + three_point) > 0
      )
      SELECT 
        CASE 
          WHEN threept_pct < 10 THEN '0-10%'
          WHEN threept_pct < 20 THEN '10-20%'
          WHEN threept_pct < 30 THEN '20-30%'
          WHEN threept_pct < 40 THEN '30-40%'
          WHEN threept_pct < 50 THEN '40-50%'
          ELSE '50%+'
        END as range,
        COUNT(*) as count
      FROM threept_stats
      WHERE threept_pct IS NOT NULL
      GROUP BY range
      ORDER BY MIN(threept_pct)
    `).all();

    const fpgDistribution = db.prepare(`
      WITH fpg_stats AS (
        SELECT CAST(total_fouls AS FLOAT) / NULLIF(games_played, 0) as fpg
        FROM player_stats 
        WHERE games_played >= 5
      )
      SELECT 
        CASE 
          WHEN fpg < 1 THEN '0-1'
          WHEN fpg < 2 THEN '1-2'
          WHEN fpg < 3 THEN '2-3'
          WHEN fpg < 4 THEN '3-4'
          WHEN fpg < 5 THEN '4-5'
          ELSE '5+'
        END as range,
        COUNT(*) as count
      FROM fpg_stats
      GROUP BY range
      ORDER BY MIN(fpg)
    `).all();

    // Format distribution data
    const formatDistribution = (data: any[], statType: string) => {
      const total = data.reduce((sum, item) => sum + item.count, 0);
      return data.map(item => ({
        statType,
        range: item.range,
        count: item.count,
        percentage: Math.round((item.count / total) * 100)
      }));
    };

    const statsDistribution = [
      ...formatDistribution(ppgDistribution, 'PPG'),
      ...formatDistribution(threePtDistribution, '3PT%'),
      ...formatDistribution(fpgDistribution, 'FPG')
    ];

    // 2. Pace analysis - avg total points per game by grade
    const paceAnalysis = db.prepare(`
      SELECT 
        g.name as gradeName,
        c.name as competitionName,
        AVG(CAST(home_score + away_score AS FLOAT)) as avgPointsPerGame,
        COUNT(games.id) as totalGames,
        CASE 
          WHEN g.name LIKE '%U8%' OR g.name LIKE '%U10%' THEN 'Junior'
          WHEN g.name LIKE '%U12%' OR g.name LIKE '%U14%' THEN 'Intermediate'
          WHEN g.name LIKE '%U16%' OR g.name LIKE '%U18%' THEN 'Youth'
          ELSE 'Senior'
        END as gradeType
      FROM games
      INNER JOIN grades g ON games.grade_id = g.id
      INNER JOIN seasons s ON g.season_id = s.id
      INNER JOIN competitions c ON s.competition_id = c.id
      WHERE games.status = 'completed' 
        AND home_score IS NOT NULL 
        AND away_score IS NOT NULL
        AND home_score > 0 
        AND away_score > 0
      GROUP BY g.id, g.name, c.name
      HAVING totalGames >= 5
      ORDER BY avgPointsPerGame DESC
      LIMIT 50
    `).all() as PaceAnalysis[];

    // 3. Foul trouble analysis
    const playerFoulAnalysis = db.prepare(`
      SELECT 
        p.first_name || ' ' || p.last_name as playerName,
        ps.team_name as teamName,
        g.name as gradeName,
        ps.games_played as gamesPlayed,
        ps.total_fouls as totalFouls,
        ROUND(CAST(ps.total_fouls AS FLOAT) / NULLIF(ps.games_played, 0), 2) as foulsPerGame
      FROM player_stats ps
      INNER JOIN players p ON ps.player_id = p.id
      INNER JOIN grades g ON ps.grade_id = g.id
      WHERE ps.games_played >= 5 AND ps.total_fouls > 0
      ORDER BY foulsPerGame DESC
      LIMIT 50
    `).all() as FoulAnalysis[];

    const gradeFoulAnalysis = db.prepare(`
      SELECT 
        g.name as gradeName,
        SUM(ps.total_fouls) as totalFouls,
        ROUND(AVG(CAST(ps.total_fouls AS FLOAT) / NULLIF(ps.games_played, 0)), 2) as avgFoulsPerGame,
        COUNT(ps.id) as totalPlayers
      FROM player_stats ps
      INNER JOIN grades g ON ps.grade_id = g.id
      WHERE ps.games_played >= 5
      GROUP BY g.id, g.name
      HAVING totalPlayers >= 10
      ORDER BY avgFoulsPerGame DESC
      LIMIT 30
    `).all() as GradeFoulAnalysis[];

    // 4. Scoring efficiency - 2PT vs 3PT breakdown by grade
    const scoringEfficiency = db.prepare(`
      SELECT 
        g.name as gradeName,
        SUM(ps.one_point) as total1Point,
        SUM(ps.two_point) as total2Point,
        SUM(ps.three_point) as total3Point,
        CASE 
          WHEN g.name LIKE '%U8%' OR g.name LIKE '%U10%' THEN 'Junior'
          WHEN g.name LIKE '%U12%' OR g.name LIKE '%U14%' THEN 'Intermediate'
          WHEN g.name LIKE '%U16%' OR g.name LIKE '%U18%' THEN 'Youth'
          ELSE 'Senior'
        END as gradeType
      FROM player_stats ps
      INNER JOIN grades g ON ps.grade_id = g.id
      WHERE ps.games_played >= 5
        AND (ps.one_point + ps.two_point + ps.three_point) > 0
      GROUP BY g.id, g.name, gradeType
      HAVING (total1Point + total2Point + total3Point) >= 100
      ORDER BY (total1Point + total2Point + total3Point) DESC
      LIMIT 40
    `).all() as ScoringEfficiency[];

    // Add percentages to scoring efficiency
    const formattedScoringEfficiency = scoringEfficiency.map((item: any) => {
      const total = item.total1Point + item.total2Point + item.total3Point;
      return {
        ...item,
        percentage1Point: Math.round((item.total1Point / total) * 100),
        percentage2Point: Math.round((item.total2Point / total) * 100),
        percentage3Point: Math.round((item.total3Point / total) * 100)
      };
    });

    const analyticsData: AnalyticsData = {
      statsDistribution,
      paceAnalysis,
      foulAnalysis: {
        players: playerFoulAnalysis,
        grades: gradeFoulAnalysis
      },
      scoringEfficiency: formattedScoringEfficiency
    };

    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 });
  }
}