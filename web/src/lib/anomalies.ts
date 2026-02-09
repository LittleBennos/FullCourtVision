export type AnomalyType =
  | "ironman"
  | "scoring_spike"
  | "sharpshooter"
  | "foul_trouble"
  | "three_point_specialist"
  | "volume_scorer"
  | "defensive_discipline"
  | "rising_star"
  | "consistent_performer";

export interface Anomaly {
  type: AnomalyType;
  label: string;
  description: string;
  severity: "notable" | "rare" | "legendary";
  emoji: string;
  detail: string;
}

interface StatRow {
  id: number;
  player_id: string;
  grade_id: string;
  team_name: string;
  games_played: number;
  total_points: number;
  one_point: number;
  two_point: number;
  three_point: number;
  total_fouls: number;
  ranking: number;
  grades?: {
    name: string;
    type: string | null;
    seasons?: { name: string; competitions?: { name: string } };
  };
}

export function detectAnomalies(
  stats: StatRow[],
  player: { id: string; first_name: string; last_name: string }
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  if (!stats || stats.length === 0) return anomalies;

  const totalGames = stats.reduce((s, r) => s + (r.games_played || 0), 0);
  const totalPoints = stats.reduce((s, r) => s + (r.total_points || 0), 0);
  const totalFouls = stats.reduce((s, r) => s + (r.total_fouls || 0), 0);
  const totalThrees = stats.reduce((s, r) => s + (r.three_point || 0), 0);
  const totalTwos = stats.reduce((s, r) => s + (r.two_point || 0), 0);
  const totalOnes = stats.reduce((s, r) => s + (r.one_point || 0), 0);

  if (totalGames === 0) return anomalies;

  const overallPpg = totalPoints / totalGames;
  const overallFpg = totalFouls / totalGames;

  // Ironman: 0 fouls across 20+ games
  if (totalFouls === 0 && totalGames >= 20) {
    anomalies.push({
      type: "ironman",
      label: "Ironman",
      description: "Zero fouls across an entire career",
      severity: "legendary",
      emoji: "🛡️",
      detail: `${totalGames} games played with 0 total fouls — remarkable discipline.`,
    });
  } else if (totalFouls === 0 && totalGames >= 10) {
    anomalies.push({
      type: "ironman",
      label: "Clean Sheet",
      description: "Zero fouls across 10+ games",
      severity: "rare",
      emoji: "🛡️",
      detail: `${totalGames} games played with 0 total fouls.`,
    });
  }

  // Scoring spikes: check each grade's PPG vs overall average
  const gradesWithGames = stats.filter((r) => r.games_played >= 3);
  for (const row of gradesWithGames) {
    const gradePpg = row.total_points / row.games_played;
    if (overallPpg > 0 && gradePpg > overallPpg * 2 && gradePpg >= 5) {
      const gradeName = row.grades?.name || row.grade_id;
      const seasonName = row.grades?.seasons?.name || "";
      anomalies.push({
        type: "scoring_spike",
        label: "Scoring Spike",
        description: "Averaged 2x+ their career PPG in a grade",
        severity: gradePpg > overallPpg * 3 ? "legendary" : "rare",
        emoji: "🔥",
        detail: `${gradePpg.toFixed(1)} PPG in ${gradeName}${seasonName ? ` (${seasonName})` : ""} vs career average of ${overallPpg.toFixed(1)} PPG.`,
      });
      break; // only report the biggest spike
    }
  }

  // Three-point specialist
  if (totalThrees >= 20 && totalGames >= 10) {
    const threePtPg = totalThrees / totalGames;
    if (threePtPg >= 1.5) {
      anomalies.push({
        type: "three_point_specialist",
        label: "Sniper",
        description: "Elite three-point shooter",
        severity: threePtPg >= 3 ? "legendary" : "rare",
        emoji: "🎯",
        detail: `${threePtPg.toFixed(1)} three-pointers per game (${totalThrees} total across ${totalGames} games).`,
      });
    }
  }

  // Volume scorer: high PPG across many games
  if (totalGames >= 15 && overallPpg >= 15) {
    anomalies.push({
      type: "volume_scorer",
      label: "Volume Scorer",
      description: "Sustained high-volume scoring",
      severity: overallPpg >= 25 ? "legendary" : overallPpg >= 20 ? "rare" : "notable",
      emoji: "💪",
      detail: `${overallPpg.toFixed(1)} PPG across ${totalGames} career games (${totalPoints} total points).`,
    });
  }

  // Foul trouble: consistently high fouls
  if (totalGames >= 10 && overallFpg >= 3) {
    anomalies.push({
      type: "foul_trouble",
      label: "Foul Trouble",
      description: "Consistently high foul rate",
      severity: overallFpg >= 4 ? "rare" : "notable",
      emoji: "⚠️",
      detail: `${overallFpg.toFixed(1)} fouls per game across ${totalGames} games.`,
    });
  }

  // Check for grades with 5+ fouls per game
  for (const row of gradesWithGames) {
    const fpg = row.total_fouls / row.games_played;
    if (fpg >= 5) {
      const gradeName = row.grades?.name || row.grade_id;
      if (!anomalies.find((a) => a.type === "foul_trouble")) {
        anomalies.push({
          type: "foul_trouble",
          label: "Foul Magnet",
          description: "5+ fouls per game in a grade",
          severity: "rare",
          emoji: "⚠️",
          detail: `${fpg.toFixed(1)} fouls per game in ${gradeName}.`,
        });
      }
      break;
    }
  }

  // Defensive discipline: very low foul rate with high games
  if (totalGames >= 20 && overallFpg > 0 && overallFpg <= 0.5) {
    anomalies.push({
      type: "defensive_discipline",
      label: "Disciplined",
      description: "Extremely low foul rate",
      severity: "notable",
      emoji: "🧘",
      detail: `Only ${overallFpg.toFixed(2)} fouls per game across ${totalGames} games.`,
    });
  }

  // Rising star: top ranking in at least one grade
  const topRankings = stats.filter((r) => r.ranking && r.ranking <= 3 && r.games_played >= 5);
  if (topRankings.length >= 2) {
    anomalies.push({
      type: "rising_star",
      label: "Top Ranked",
      description: "Top 3 ranking in multiple grades",
      severity: topRankings.length >= 3 ? "legendary" : "rare",
      emoji: "⭐",
      detail: `Finished top 3 in ${topRankings.length} different grades.`,
    });
  }

  // Consistent performer: similar PPG across multiple grades
  if (gradesWithGames.length >= 3) {
    const ppgs = gradesWithGames.map((r) => r.total_points / r.games_played);
    const mean = ppgs.reduce((a, b) => a + b, 0) / ppgs.length;
    if (mean >= 3) {
      const variance = ppgs.reduce((a, p) => a + (p - mean) ** 2, 0) / ppgs.length;
      const cv = Math.sqrt(variance) / mean;
      if (cv <= 0.2) {
        anomalies.push({
          type: "consistent_performer",
          label: "Mr. Consistent",
          description: "Remarkably consistent scoring across grades",
          severity: "notable",
          emoji: "📊",
          detail: `${mean.toFixed(1)} PPG average with very low variance across ${gradesWithGames.length} grades.`,
        });
      }
    }
  }

  // Perfect shooting: high two-point or three-point efficiency (inferred from volume)
  // Since we don't have attempts, we check for high scoring with zero one-pointers (free throws)
  // suggesting they rarely miss and go to the line
  if (totalGames >= 10 && overallPpg >= 8 && totalOnes === 0) {
    anomalies.push({
      type: "sharpshooter",
      label: "Sharpshooter",
      description: "High scorer who never goes to the free throw line",
      severity: "notable",
      emoji: "🏹",
      detail: `${overallPpg.toFixed(1)} PPG across ${totalGames} games with zero free throws — pure field goal scorer.`,
    });
  }

  return anomalies;
}
