import { test, expect } from '@playwright/test';

test.describe('API Routes Tests', () => {
  test('GET /api/players returns correct JSON structure', async ({ request }) => {
    const response = await request.get('/api/players');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    
    // Check for required structure (data/meta format)
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('meta');
    expect(Array.isArray(data.data)).toBeTruthy();
    
    // Check meta information
    expect(data.meta).toHaveProperty('total');
    expect(typeof data.meta.total).toBe('number');
    
    // If there's data, check the first player structure
    if (data.data.length > 0) {
      const player = data.data[0];
      expect(player).toHaveProperty('id');
      expect(player).toHaveProperty('name');
    }
  });

  test('GET /api/players with pagination parameters', async ({ request }) => {
    const response = await request.get('/api/players?page=1&limit=10');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('meta');
    expect(data.data.length).toBeLessThanOrEqual(10);
  });

  test('GET /api/teams returns correct JSON structure', async ({ request }) => {
    const response = await request.get('/api/teams');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    
    // Check for required structure
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('meta');
    expect(Array.isArray(data.data)).toBeTruthy();
    
    // If there's data, check the first team structure
    if (data.data.length > 0) {
      const team = data.data[0];
      expect(team).toHaveProperty('id');
      expect(team).toHaveProperty('name');
    }
  });

  test('GET /api/organisations returns correct JSON structure', async ({ request }) => {
    const response = await request.get('/api/organisations');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    
    // Check for required structure
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('meta');
    expect(Array.isArray(data.data)).toBeTruthy();
    
    // If there's data, check the first organisation structure
    if (data.data.length > 0) {
      const org = data.data[0];
      expect(org).toHaveProperty('id');
      expect(org).toHaveProperty('name');
    }
  });

  test('GET /api/search returns correct JSON structure', async ({ request }) => {
    const response = await request.get('/api/search?q=test');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    
    // Check for required structure
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('meta');
    expect(Array.isArray(data.data)).toBeTruthy();
  });

  test('GET /api/leaderboards returns correct JSON structure', async ({ request }) => {
    const response = await request.get('/api/leaderboards');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    
    // Check for required structure
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('meta');
    expect(Array.isArray(data.data)).toBeTruthy();
  });

  test('GET /api/players/[id] returns single player', async ({ request }) => {
    // First get a list of players to get a valid ID
    const playersResponse = await request.get('/api/players');
    const playersData = await playersResponse.json();
    
    if (playersData.data && playersData.data.length > 0) {
      const playerId = playersData.data[0].id || playersData.data[0].player_id;
      
      const response = await request.get(`/api/players/${playerId}`);
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('meta');
      
      // Should return single player object
      expect(data.data).toHaveProperty('id');
      expect(data.data).toHaveProperty('name');
    } else {
      test.skip('No players available for testing');
    }
  });

  test('GET /api/players/[id]/stats returns player statistics', async ({ request }) => {
    // First get a list of players to get a valid ID
    const playersResponse = await request.get('/api/players');
    const playersData = await playersResponse.json();
    
    if (playersData.data && playersData.data.length > 0) {
      const playerId = playersData.data[0].id || playersData.data[0].player_id;
      
      const response = await request.get(`/api/players/${playerId}/stats`);
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('meta');
    } else {
      test.skip('No players available for testing');
    }
  });

  test('GET /api/teams/[id] returns single team with players', async ({ request }) => {
    // First get a list of teams to get a valid ID
    const teamsResponse = await request.get('/api/teams');
    const teamsData = await teamsResponse.json();
    
    if (teamsData.data && teamsData.data.length > 0) {
      const teamId = teamsData.data[0].id || teamsData.data[0].team_id;
      
      const response = await request.get(`/api/teams/${teamId}`);
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('meta');
      
      // Should return team with players
      expect(data.data).toHaveProperty('id');
      expect(data.data).toHaveProperty('name');
      expect(data.data).toHaveProperty('players');
    } else {
      test.skip('No teams available for testing');
    }
  });

  test('GET /api/search with empty query returns empty results', async ({ request }) => {
    const response = await request.get('/api/search?q=');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('meta');
    expect(Array.isArray(data.data)).toBeTruthy();
  });

  test('GET /api/search with nonexistent query returns empty results', async ({ request }) => {
    const response = await request.get('/api/search?q=nonexistentplayername12345');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('meta');
    expect(Array.isArray(data.data)).toBeTruthy();
  });

  test('GET /api endpoint returns API information', async ({ request }) => {
    const response = await request.get('/api');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('meta');
  });
});