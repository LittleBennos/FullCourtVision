"use client";

// Optimized charts that use simple HTML/CSS instead of heavy chart libraries
interface MarginDistributionData {
  range: string;
  count: number;
}

interface DailyGameData {
  date: string;
  games: number;
}

export function MarginDistributionChart({ data }: { data: MarginDistributionData[] }) {
  const maxCount = Math.max(...data.map(d => d.count));
  
  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={item.range} className="flex items-center gap-3">
          <div className="w-12 text-sm text-muted-foreground">{item.range}pt</div>
          <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
            <div 
              className="h-full bg-accent rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-2"
              style={{ 
                width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%`,
                minWidth: item.count > 0 ? '24px' : '0px'
              }}
            >
              {item.count > 0 && (
                <span className="text-xs text-white font-medium">{item.count}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DailyGamesChart({ data }: { data: DailyGameData[] }) {
  const maxGames = Math.max(...data.map(d => d.games));
  
  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((day, index) => (
        <div key={index} className="flex-1 flex flex-col items-center">
          <div 
            className="w-full bg-accent rounded-t transition-all duration-500 ease-out"
            style={{ 
              height: `${maxGames > 0 ? (day.games / maxGames) * 48 : 2}px`,
              minHeight: '2px'
            }}
            title={`${day.date}: ${day.games} games`}
          />
          <span className="text-xs text-muted-foreground mt-1">{day.date}</span>
        </div>
      ))}
    </div>
  );
}