"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Users, Save, FolderOpen, Trash2, Flame, Target, Shield, Zap, Star, ChevronDown } from "lucide-react";

interface Player {
  id: string;
  name: string;
  grade: string;
  games: number;
  points: number;
  ppg: number;
  threes: number;
  threesPerGame: number;
  archetype: string;
}

interface RosterSlot {
  position: string;
  player: Player | null;
  minutes: number;
}

interface SavedRoster {
  name: string;
  seasonId: string;
  gradeId: string;
  slots: { position: string; playerId: string; minutes: number }[];
  savedAt: string;
}

const POSITIONS = ["PG", "SG", "SF", "PF", "C"];
const TOTAL_MINUTES = 40;

const archetypeConfig: Record<string, { icon: typeof Zap; color: string; bg: string }> = {
  Scorer: { icon: Flame, color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/30" },
  Sharpshooter: { icon: Target, color: "text-green-400", bg: "bg-green-400/10 border-green-400/30" },
  "Two-Way": { icon: Shield, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/30" },
  "Iron Man": { icon: Zap, color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/30" },
  Balanced: { icon: Star, color: "text-slate-400", bg: "bg-slate-400/10 border-slate-400/30" },
};

export default function RosterBuilderPage() {
  const [seasons, setSeasons] = useState<{ id: string; name: string }[]>([]);
  const [grades, setGrades] = useState<{ id: string; name: string }[]>([]);
  const [selectedSeason, setSelectedSeason] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [slots, setSlots] = useState<RosterSlot[]>(
    POSITIONS.map(p => ({ position: p, player: null, minutes: TOTAL_MINUTES / POSITIONS.length }))
  );
  const [loading, setLoading] = useState(true);
  const [savedRosters, setSavedRosters] = useState<SavedRoster[]>([]);
  const [rosterName, setRosterName] = useState("");
  const [draggedPlayer, setDraggedPlayer] = useState<Player | null>(null);
  const [searchFilter, setSearchFilter] = useState("");

  // Load seasons
  useEffect(() => {
    fetch("/api/roster-builder")
      .then(r => r.json())
      .then(d => { setSeasons(d.seasons || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Load saved rosters from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("fcv-rosters");
      if (saved) setSavedRosters(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // Load grades when season changes
  useEffect(() => {
    if (!selectedSeason) { setGrades([]); return; }
    fetch(`/api/roster-builder?season=${selectedSeason}`)
      .then(r => r.json())
      .then(d => setGrades(d.grades || []))
      .catch(() => setGrades([]));
  }, [selectedSeason]);

  // Load players when grade changes
  useEffect(() => {
    if (!selectedSeason || !selectedGrade) { setPlayers([]); return; }
    setLoading(true);
    fetch(`/api/roster-builder?season=${selectedSeason}&grade=${selectedGrade}`)
      .then(r => r.json())
      .then(d => { setPlayers(d.players || []); setLoading(false); })
      .catch(() => { setPlayers([]); setLoading(false); });
  }, [selectedSeason, selectedGrade]);

  const assignedIds = useMemo(() => new Set(slots.filter(s => s.player).map(s => s.player!.id)), [slots]);

  const availablePlayers = useMemo(() => {
    let filtered = players.filter(p => !assignedIds.has(p.id));
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
    }
    return filtered;
  }, [players, assignedIds, searchFilter]);

  // Drag handlers
  const handleDragStart = useCallback((player: Player) => {
    setDraggedPlayer(player);
  }, []);

  const handleDrop = useCallback((posIndex: number) => {
    if (!draggedPlayer) return;
    setSlots(prev => {
      const next = [...prev];
      // If player already in another slot, remove them
      const existingIdx = next.findIndex(s => s.player?.id === draggedPlayer.id);
      if (existingIdx >= 0) next[existingIdx] = { ...next[existingIdx], player: null };
      next[posIndex] = { ...next[posIndex], player: draggedPlayer };
      return next;
    });
    setDraggedPlayer(null);
  }, [draggedPlayer]);

  const removePlayer = useCallback((posIndex: number) => {
    setSlots(prev => {
      const next = [...prev];
      next[posIndex] = { ...next[posIndex], player: null };
      return next;
    });
  }, []);

  const updateMinutes = useCallback((posIndex: number, mins: number) => {
    setSlots(prev => {
      const next = [...prev];
      next[posIndex] = { ...next[posIndex], minutes: mins };
      return next;
    });
  }, []);

  const totalMinutes = useMemo(() => slots.reduce((s, sl) => s + (sl.player ? sl.minutes : 0), 0), [slots]);

  // Projected stats
  const projectedStats = useMemo(() => {
    const filled = slots.filter(s => s.player);
    if (filled.length === 0) return null;
    const totalPPG = filled.reduce((sum, s) => {
      const ratio = s.minutes / (TOTAL_MINUTES / POSITIONS.length);
      return sum + s.player!.ppg * ratio;
    }, 0);
    const avg3PG = filled.length > 0
      ? filled.reduce((sum, s) => {
          const ratio = s.minutes / (TOTAL_MINUTES / POSITIONS.length);
          return sum + s.player!.threesPerGame * ratio;
        }, 0) / filled.length
      : 0;
    const archetypes: Record<string, number> = {};
    filled.forEach(s => {
      const a = s.player!.archetype;
      archetypes[a] = (archetypes[a] || 0) + 1;
    });
    return { totalPPG: +totalPPG.toFixed(1), avg3PG: +avg3PG.toFixed(1), archetypes, count: filled.length };
  }, [slots]);

  // Save roster
  const saveRoster = useCallback(() => {
    const name = rosterName.trim() || `Roster ${savedRosters.length + 1}`;
    const roster: SavedRoster = {
      name,
      seasonId: selectedSeason,
      gradeId: selectedGrade,
      slots: slots.filter(s => s.player).map(s => ({
        position: s.position,
        playerId: s.player!.id,
        minutes: s.minutes,
      })),
      savedAt: new Date().toISOString(),
    };
    const updated = [...savedRosters.filter(r => r.name !== name), roster];
    setSavedRosters(updated);
    localStorage.setItem("fcv-rosters", JSON.stringify(updated));
    setRosterName("");
  }, [rosterName, savedRosters, selectedSeason, selectedGrade, slots]);

  // Load roster
  const loadRoster = useCallback((roster: SavedRoster) => {
    setSelectedSeason(roster.seasonId);
    setSelectedGrade(roster.gradeId);
    // Defer slot assignment until players load
    const handler = () => {
      setPlayers(prev => {
        if (prev.length === 0) return prev;
        setSlots(
          POSITIONS.map(pos => {
            const saved = roster.slots.find(s => s.position === pos);
            const player = saved ? prev.find(p => p.id === saved.playerId) || null : null;
            return { position: pos, player, minutes: saved?.minutes || TOTAL_MINUTES / POSITIONS.length };
          })
        );
        return prev;
      });
    };
    setTimeout(handler, 1500);
  }, []);

  const deleteRoster = useCallback((name: string) => {
    const updated = savedRosters.filter(r => r.name !== name);
    setSavedRosters(updated);
    localStorage.setItem("fcv-rosters", JSON.stringify(updated));
  }, [savedRosters]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-blue-400" />
          </div>
          Roster Builder
        </h1>
        <p className="text-muted-foreground mt-2">
          Build your dream lineup — drag players into positions, adjust minutes, and see projected stats.
        </p>
      </div>

      {/* Season + Grade selectors */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative">
          <select
            value={selectedSeason}
            onChange={e => { setSelectedSeason(e.target.value); setSelectedGrade(""); setSlots(POSITIONS.map(p => ({ position: p, player: null, minutes: TOTAL_MINUTES / POSITIONS.length }))); }}
            className="appearance-none bg-card border border-border rounded-lg px-4 py-2.5 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400/50"
          >
            <option value="">Select Season</option>
            {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={selectedGrade}
            onChange={e => { setSelectedGrade(e.target.value); setSlots(POSITIONS.map(p => ({ position: p, player: null, minutes: TOTAL_MINUTES / POSITIONS.length }))); }}
            disabled={!selectedSeason}
            className="appearance-none bg-card border border-border rounded-lg px-4 py-2.5 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400/50 disabled:opacity-50"
          >
            <option value="">Select Grade</option>
            {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {loading && <div className="text-center py-12 text-muted-foreground">Loading...</div>}

      {!loading && selectedGrade && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Court / Positions */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold">Lineup</h2>
            <div className="grid sm:grid-cols-5 gap-3">
              {slots.map((slot, i) => (
                <div
                  key={slot.position}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => handleDrop(i)}
                  className={`relative border-2 border-dashed rounded-xl p-4 min-h-[160px] flex flex-col items-center justify-center transition-colors ${
                    slot.player
                      ? "border-blue-400/50 bg-blue-400/5"
                      : "border-border hover:border-blue-400/30"
                  }`}
                >
                  <span className="text-xs font-bold text-blue-400 mb-2">{slot.position}</span>
                  {slot.player ? (
                    <>
                      <p className="text-sm font-semibold text-center leading-tight">{slot.player.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{slot.player.ppg} PPG</p>
                      {(() => {
                        const cfg = archetypeConfig[slot.player.archetype] || archetypeConfig.Balanced;
                        const Icon = cfg.icon;
                        return (
                          <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border mt-1 ${cfg.bg} ${cfg.color}`}>
                            <Icon className="w-3 h-3" />
                            {slot.player.archetype}
                          </span>
                        );
                      })()}
                      {/* Minutes slider */}
                      <div className="w-full mt-3">
                        <input
                          type="range"
                          min={0}
                          max={TOTAL_MINUTES}
                          value={slot.minutes}
                          onChange={e => updateMinutes(i, parseInt(e.target.value))}
                          className="w-full h-1.5 accent-blue-400 cursor-pointer"
                        />
                        <p className="text-[10px] text-center text-muted-foreground">{slot.minutes} min</p>
                      </div>
                      {/* Projected stats for this player */}
                      <div className="text-[10px] text-muted-foreground mt-1">
                        ~{(slot.player.ppg * slot.minutes / (TOTAL_MINUTES / POSITIONS.length)).toFixed(1)} pts
                      </div>
                      <button
                        onClick={() => removePlayer(i)}
                        className="absolute top-1 right-1 p-1 text-muted-foreground hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">Drop player here</p>
                  )}
                </div>
              ))}
            </div>

            {/* Projected Team Stats */}
            {projectedStats && (
              <div className="bg-card border border-border rounded-xl p-5 mt-4">
                <h3 className="text-sm font-semibold mb-3">Projected Team Stats</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-2xl font-bold text-blue-400">{projectedStats.totalPPG}</p>
                    <p className="text-xs text-muted-foreground">Total PPG</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-400">{projectedStats.avg3PG}</p>
                    <p className="text-xs text-muted-foreground">Avg 3PG</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{projectedStats.count}/5</p>
                    <p className="text-xs text-muted-foreground">Filled</p>
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${totalMinutes === TOTAL_MINUTES ? "text-green-400" : totalMinutes > TOTAL_MINUTES ? "text-red-400" : "text-yellow-400"}`}>
                      {totalMinutes}
                    </p>
                    <p className="text-xs text-muted-foreground">/ {TOTAL_MINUTES} min</p>
                  </div>
                </div>
                {/* Archetype breakdown */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {Object.entries(projectedStats.archetypes).map(([arch, count]) => {
                    const cfg = archetypeConfig[arch] || archetypeConfig.Balanced;
                    const Icon = cfg.icon;
                    return (
                      <span key={arch} className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded border ${cfg.bg} ${cfg.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {arch} ×{count}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Save/Load */}
            <div className="bg-card border border-border rounded-xl p-5 mt-4">
              <h3 className="text-sm font-semibold mb-3">Save / Load Roster</h3>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={rosterName}
                  onChange={e => setRosterName(e.target.value)}
                  placeholder="Roster name..."
                  className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                />
                <button
                  onClick={saveRoster}
                  disabled={slots.every(s => !s.player)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
              </div>
              {savedRosters.length > 0 && (
                <div className="space-y-2">
                  {savedRosters.map(r => (
                    <div key={r.name} className="flex items-center justify-between bg-background rounded-lg px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.slots.length} players · {new Date(r.savedAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => loadRoster(r)} className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded transition-colors">
                          <FolderOpen className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteRoster(r.name)} className="p-1.5 text-red-400 hover:bg-red-400/10 rounded transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Player Pool */}
          <div>
            <h2 className="text-lg font-semibold mb-2">Available Players</h2>
            <input
              type="text"
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              placeholder="Search players..."
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
            />
            <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
              {availablePlayers.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No players available</p>
              )}
              {availablePlayers.map(player => {
                const cfg = archetypeConfig[player.archetype] || archetypeConfig.Balanced;
                const Icon = cfg.icon;
                return (
                  <div
                    key={player.id}
                    draggable
                    onDragStart={() => handleDragStart(player)}
                    className="flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-2.5 cursor-grab active:cursor-grabbing hover:border-blue-400/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{player.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{player.ppg} PPG</span>
                        <span className="text-xs text-muted-foreground">{player.games}G</span>
                        <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${cfg.color}`}>
                          <Icon className="w-3 h-3" />
                          {player.archetype}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
