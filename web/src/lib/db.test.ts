import { describe, it, expect, vi } from 'vitest'

// Mock better-sqlite3 with a proper constructor
vi.mock('better-sqlite3', () => {
  const mockStmt = {
    all: vi.fn().mockReturnValue([
      {
        player_id: 'p1', first_name: 'Rising', last_name: 'Star',
        team_name: 'Eagles', organisation_name: 'Club A',
        previous_season_ppg: 10.5, current_season_ppg: 18.2, improvement: 7.7,
        previous_season_games: 12, current_season_games: 10,
        previous_season_name: 'Winter 2023', current_season_name: 'Summer 2024',
      },
      {
        player_id: 'p2', first_name: 'Another', last_name: 'Improver',
        team_name: 'Hawks', organisation_name: 'Club B',
        previous_season_ppg: 8.0, current_season_ppg: 12.5, improvement: 4.5,
        previous_season_games: 8, current_season_games: 6,
        previous_season_name: 'Winter 2023', current_season_name: 'Summer 2024',
      },
    ]),
  }

  function Database() {
    return { prepare: vi.fn().mockReturnValue(mockStmt) }
  }

  return { default: Database }
})

import { getRisingStars } from './db'

describe('Rising Stars (SQLite)', () => {
  it('returns rising stars sorted by improvement', () => {
    const stars = getRisingStars()
    expect(stars).toHaveLength(2)
    expect(stars[0].improvement).toBeGreaterThan(stars[1].improvement)
  })

  it('has correct shape for each entry', () => {
    const stars = getRisingStars()
    const star = stars[0]
    expect(star).toHaveProperty('player_id')
    expect(star).toHaveProperty('first_name')
    expect(star).toHaveProperty('improvement')
    expect(star).toHaveProperty('previous_season_ppg')
    expect(star).toHaveProperty('current_season_ppg')
  })

  it('improvement equals current minus previous ppg', () => {
    const stars = getRisingStars()
    for (const star of stars) {
      expect(star.improvement).toBeCloseTo(star.current_season_ppg - star.previous_season_ppg, 1)
    }
  })

  it('all players have positive improvement', () => {
    const stars = getRisingStars()
    for (const star of stars) {
      expect(star.improvement).toBeGreaterThan(0)
    }
  })

  it('all players have minimum 5 games in both seasons', () => {
    const stars = getRisingStars()
    for (const star of stars) {
      expect(star.previous_season_games).toBeGreaterThanOrEqual(5)
      expect(star.current_season_games).toBeGreaterThanOrEqual(5)
    }
  })
})
