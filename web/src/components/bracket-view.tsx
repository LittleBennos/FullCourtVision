"use client";

import { type FinalsGame } from "@/lib/data";
import { Trophy } from "lucide-react";

type BracketRound = {
  name: string;
  games: FinalsGame[];
};

function groupByRound(games: FinalsGame[]): BracketRound[] {
  const map = new Map<string, FinalsGame[]>();
  for (const g of games) {
    const key = g.round_name;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(g);
  }

  // Sort rounds by logical order
  const ORDER: Record<string, number> = {
    "finals round 1": 0,
    "quarter finals": 1,
    "semi finals": 2,
    "preliminary final": 3,
    "preliminary finals": 3,
    "finals round 2": 3,
    "finals round 3": 4,
    "grand final": 5,
  };

  return Array.from(map.entries())
    .sort(([a], [b]) => (ORDER[a.toLowerCase()] ?? 99) - (ORDER[b.toLowerCase()] ?? 99))
    .map(([name, games]) => ({ name, games }));
}

function GameCard({ game }: { game: FinalsGame }) {
  const played = game.home_score !== null && game.away_score !== null;
  const homeWin = played && (game.home_score ?? 0) > (game.away_score ?? 0);
  const awayWin = played && (game.away_score ?? 0) > (game.home_score ?? 0);
  const isGrandFinal = game.round_name.toLowerCase().includes("grand");

  return (
    <div
      className={`rounded-lg border transition-all ${
        isGrandFinal
          ? "border-blue-500/50 bg-blue-950/30 shadow-lg shadow-blue-500/10"
          : "border-border bg-slate-900/60"
      }`}
    >
      {/* Home team */}
      <div
        className={`flex items-center justify-between px-3 py-2 rounded-t-lg ${
          homeWin ? "bg-green-500/10" : ""
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {homeWin && <Trophy className="w-3 h-3 text-yellow-400 shrink-0" />}
          <span
            className={`text-sm truncate ${
              homeWin ? "font-semibold text-white" : "text-slate-300"
            } ${!played && !game.home_team_id ? "text-slate-500 italic" : ""}`}
          >
            {game.home_team_name}
          </span>
        </div>
        <span
          className={`text-sm tabular-nums ml-2 ${
            homeWin ? "font-bold text-green-400" : "text-slate-400"
          }`}
        >
          {game.home_score ?? "-"}
        </span>
      </div>

      {/* Divider */}
      <div className="border-t border-border/50" />

      {/* Away team */}
      <div
        className={`flex items-center justify-between px-3 py-2 rounded-b-lg ${
          awayWin ? "bg-green-500/10" : ""
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {awayWin && <Trophy className="w-3 h-3 text-yellow-400 shrink-0" />}
          <span
            className={`text-sm truncate ${
              awayWin ? "font-semibold text-white" : "text-slate-300"
            } ${!played && !game.away_team_id ? "text-slate-500 italic" : ""}`}
          >
            {game.away_team_name}
          </span>
        </div>
        <span
          className={`text-sm tabular-nums ml-2 ${
            awayWin ? "font-bold text-green-400" : "text-slate-400"
          }`}
        >
          {game.away_score ?? "-"}
        </span>
      </div>

      {/* Date / venue footer */}
      {(game.date || game.venue) && (
        <div className="border-t border-border/30 px-3 py-1">
          <p className="text-[10px] text-slate-500 truncate">
            {game.date && new Date(game.date).toLocaleDateString()}
            {game.date && game.venue && " · "}
            {game.venue}
          </p>
        </div>
      )}
    </div>
  );
}

export function BracketView({ games }: { games: FinalsGame[] }) {
  const rounds = groupByRound(games);

  if (rounds.length === 0) return null;

  return (
    <div className="w-full overflow-x-auto">
      {/* Desktop: horizontal bracket layout */}
      <div className="hidden md:flex items-stretch gap-0 min-w-fit py-4">
        {rounds.map((round, ri) => (
          <div key={round.name} className="flex items-stretch">
            {/* Round column */}
            <div className="flex flex-col min-w-[220px] max-w-[260px]">
              <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-4 text-center px-2">
                {round.name}
              </h3>
              <div className="flex flex-col justify-around flex-1 gap-4 px-2">
                {round.games.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            </div>

            {/* Connector lines between rounds */}
            {ri < rounds.length - 1 && (
              <div className="flex items-center w-8 shrink-0">
                <svg
                  className="w-full h-full"
                  viewBox="0 0 32 100"
                  preserveAspectRatio="none"
                  fill="none"
                >
                  {/* Simple connector lines */}
                  {round.games.map((_, gi) => {
                    const totalGames = round.games.length;
                    const yPos = ((gi + 0.5) / totalGames) * 100;
                    return (
                      <line
                        key={gi}
                        x1="0"
                        y1={`${yPos}%`}
                        x2="100%"
                        y2="50%"
                        stroke="rgb(59, 130, 246)"
                        strokeWidth="1"
                        strokeOpacity="0.3"
                      />
                    );
                  })}
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile: stacked layout */}
      <div className="md:hidden space-y-6">
        {rounds.map((round) => (
          <div key={round.name}>
            <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3">
              {round.name}
            </h3>
            <div className="space-y-3">
              {round.games.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
