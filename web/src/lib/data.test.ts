import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase — factory must be self-contained (no external refs)
vi.mock('./supabase', () => {
  const mockFrom = vi.fn()
  return { supabase: { from: mockFrom } }
})

// Helper to build a chainable query mock
function mockQuery(returnData: any, returnCount?: number) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: returnData, error: null }),
  }
  const resolvedValue = { data: Array.isArray(returnData) ? returnData : [], error: null, count: returnCount ?? null }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.in.mockReturnValue(chain)
  chain.not.mockReturnValue(chain)
  chain.order.mockReturnValue(chain)
  chain.limit.mockReturnValue(chain)
  chain.range.mockReturnValue(chain)
  chain.then = (resolve: any) => resolve(resolvedValue)
  return chain
}

import { supabase } from './supabase'
import {
  getStats,
  getTopPlayers,
  getOrganisations,
  getCompetitions,
  getSeasons,
  getPlayerDetails,
  getTeamById,
  getLeaderboards,
} from './data'

const mockFrom = (supabase as any).from as ReturnType<typeof vi.fn>

describe('FCV Data Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getStats', () => {
    it('returns counts for all entity types', async () => {
      const counts = [100, 200, 10, 50, 5, 8, 12]
      const tables = ['players', 'games', 'organisations', 'teams', 'competitions', 'seasons', 'grades']
      
      mockFrom.mockImplementation((table: string) => {
        const idx = tables.indexOf(table)
        return {
          select: vi.fn().mockResolvedValue({ data: null, error: null, count: idx >= 0 ? counts[idx] : 0 }),
        }
      })

      const stats = await getStats()
      expect(stats).toEqual({
        players: 100, games: 200, organisations: 10, teams: 50,
        competitions: 5, seasons: 8, grades: 12,
      })
    })

    it('returns 0 when counts are null', async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockResolvedValue({ data: null, error: null, count: null }),
      }))

      const stats = await getStats()
      expect(stats.players).toBe(0)
      expect(stats.games).toBe(0)
    })
  })

  describe('getTopPlayers', () => {
    it('returns mapped players', async () => {
      const mockData = [
        { player_id: '1', first_name: 'John', last_name: 'Doe', total_games: 20, total_points: 400, ppg: '20.0' },
        { player_id: '2', first_name: 'Jane', last_name: 'Smith', total_games: 15, total_points: 300, ppg: '20.0' },
      ]
      mockFrom.mockReturnValue(mockQuery(mockData))

      const players = await getTopPlayers()
      expect(players).toHaveLength(2)
      expect(players[0]).toEqual({
        id: '1', first_name: 'John', last_name: 'Doe',
        total_games: 20, total_points: 400, ppg: 20.0,
      })
    })

    it('returns empty array when no data', async () => {
      const chain: any = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: (resolve: any) => resolve({ data: null, error: null }),
      }
      mockFrom.mockReturnValue(chain)

      const players = await getTopPlayers()
      expect(players).toEqual([])
    })

    it('converts ppg string to number', async () => {
      const mockData = [
        { player_id: '1', first_name: 'Test', last_name: 'Player', total_games: 10, total_points: 155, ppg: '15.5' },
      ]
      mockFrom.mockReturnValue(mockQuery(mockData))

      const players = await getTopPlayers()
      expect(typeof players[0].ppg).toBe('number')
      expect(players[0].ppg).toBe(15.5)
    })
  })

  describe('getOrganisations', () => {
    it('returns organisations ordered by name', async () => {
      const mockData = [
        { id: '1', name: 'Altona Basketball', type: 'club', suburb: 'Altona', state: 'VIC', website: null },
        { id: '2', name: 'Bendigo Basketball', type: 'association', suburb: 'Bendigo', state: 'VIC', website: 'https://bendigo.com' },
      ]
      mockFrom.mockReturnValue(mockQuery(mockData))

      const orgs = await getOrganisations()
      expect(orgs).toHaveLength(2)
      expect(orgs[0].name).toBe('Altona Basketball')
    })

    it('returns empty array when no data', async () => {
      const chain: any = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: (resolve: any) => resolve({ data: null, error: null }),
      }
      mockFrom.mockReturnValue(chain)

      const orgs = await getOrganisations()
      expect(orgs).toEqual([])
    })
  })

  describe('getCompetitions', () => {
    it('maps organisation name from nested relation', async () => {
      const mockData = [
        { id: '1', name: 'Summer Comp', type: 'domestic', organisation_id: 'org1', organisations: { name: 'Club A' } },
      ]
      mockFrom.mockReturnValue(mockQuery(mockData))

      const comps = await getCompetitions()
      expect(comps[0].org_name).toBe('Club A')
    })

    it('handles missing organisation gracefully', async () => {
      const mockData = [
        { id: '1', name: 'Summer Comp', type: null, organisation_id: 'org1', organisations: null },
      ]
      mockFrom.mockReturnValue(mockQuery(mockData))

      const comps = await getCompetitions()
      expect(comps[0].org_name).toBe('')
    })
  })

  describe('getSeasons', () => {
    it('maps competition name from nested relation', async () => {
      const mockData = [
        { id: 's1', competition_id: 'c1', name: 'Winter 2024', start_date: '2024-06-01', end_date: '2024-08-31', status: 'completed', competitions: { name: 'Summer Comp' } },
      ]
      mockFrom.mockReturnValue(mockQuery(mockData))

      const seasons = await getSeasons()
      expect(seasons[0].competition_name).toBe('Summer Comp')
    })
  })

  describe('getPlayerDetails', () => {
    it('returns null when player not found', async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }))

      const result = await getPlayerDetails('nonexistent')
      expect(result).toBeNull()
    })

    it('returns player with mapped stats', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'players') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'p1', first_name: 'John', last_name: 'Doe', updated_at: '2024-01-01' },
                  error: null,
                }),
              }),
            }),
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              then: (resolve: any) => resolve({
                data: [{
                  id: 'ps1', player_id: 'p1', grade_id: 'g1', team_name: 'Eagles',
                  games_played: 10, total_points: 150, one_point: 20, two_point: 50,
                  three_point: 10, total_fouls: 5, ranking: 3,
                  grades: { name: 'U18 Boys', type: 'junior', seasons: { name: 'Winter 2024', competitions: { name: 'Metro League' } } },
                }],
                error: null,
              }),
            }),
          }),
        }
      })

      const result = await getPlayerDetails('p1')
      expect(result).not.toBeNull()
      expect(result!.player.first_name).toBe('John')
      expect(result!.stats).toHaveLength(1)
      expect(result!.stats[0].grade_name).toBe('U18 Boys')
      expect(result!.stats[0].competition_name).toBe('Metro League')
    })
  })

  describe('getLeaderboards', () => {
    it('returns ppg, games, and threes leaderboards', async () => {
      const mockPlayers = Array.from({ length: 5 }, (_, i) => ({
        player_id: `p${i}`, first_name: `Player`, last_name: `${i}`,
        total_games: 10 + i * 5, total_points: 100 + i * 50,
        total_threes: 10 + i * 3, ppg: ((100 + i * 50) / (10 + i * 5)).toFixed(1),
      }))
      mockFrom.mockReturnValue(mockQuery(mockPlayers))

      const leaderboards = await getLeaderboards()
      expect(leaderboards).toHaveProperty('ppg')
      expect(leaderboards).toHaveProperty('games')
      expect(leaderboards).toHaveProperty('threes')
      expect(leaderboards.ppg.length).toBeGreaterThan(0)
    })

    it('filters out players with fewer than 10 games', async () => {
      const mockPlayers = [
        { player_id: 'p1', first_name: 'A', last_name: 'B', total_games: 5, total_points: 100, total_threes: 5, ppg: '20.0' },
        { player_id: 'p2', first_name: 'C', last_name: 'D', total_games: 15, total_points: 200, total_threes: 10, ppg: '13.3' },
      ]
      mockFrom.mockReturnValue(mockQuery(mockPlayers))

      const leaderboards = await getLeaderboards()
      expect(leaderboards.ppg).toHaveLength(1)
      expect(leaderboards.ppg[0].id).toBe('p2')
    })

    it('calculates threes_pg correctly', async () => {
      const mockPlayers = [
        { player_id: 'p1', first_name: 'A', last_name: 'B', total_games: 20, total_points: 200, total_threes: 30, ppg: '10.0' },
      ]
      mockFrom.mockReturnValue(mockQuery(mockPlayers))

      const leaderboards = await getLeaderboards()
      expect(leaderboards.threes[0].threes_pg).toBe(1.5)
    })
  })
})
