import { test, expect } from '@playwright/test';

test.describe('API Routes Tests', () => {
  test('GET /api/players returns correct JSON structure', async ({ request }) => {
    const response = await request.get('/api/players');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('meta');
    expect(Array.isArray(data.data)).toBeTruthy();
    expect(data.meta).toHaveProperty('total');
    
    if (data.data.length > 0) {
      const player = data.data[0];
      expect(player).toHaveProperty('id');
      expect(player).toHaveProperty('first_name');
      expect(player).toHaveProperty('last_name');
      expect(player).toHaveProperty('ppg');
    }
  });

  test('GET /api/players with pagination', async ({ request }) => {
    const response = await request.get('/api/players?offset=0&limit=10');
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
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBeTruthy();
    
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
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBeTruthy();
    
    if (data.data.length > 0) {
      const org = data.data[0];
      expect(org).toHaveProperty('id');
      expect(org).toHaveProperty('name');
    }
  });

  test('GET /api/search returns results', async ({ request }) => {
    const response = await request.get('/api/search?q=test');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('data');
    expect(data.data).toHaveProperty('players');
    expect(data.data).toHaveProperty('teams');
    expect(data.data).toHaveProperty('organisations');
  });

  test('GET /api/leaderboards returns correct JSON structure', async ({ request }) => {
    const response = await request.get('/api/leaderboards');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBeTruthy();
  });

  test('GET /api/players/[id] returns single player', async ({ request }) => {
    const playersResponse = await request.get('/api/players');
    const playersData = await playersResponse.json();
    
    if (playersData.data && playersData.data.length > 0) {
      const playerId = playersData.data[0].id;
      const response = await request.get(`/api/players/${playerId}`);
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('id');
      expect(data.data).toHaveProperty('first_name');
    }
  });

  test('GET /api/players/[id]/stats returns player statistics', async ({ request }) => {
    const playersResponse = await request.get('/api/players');
    const playersData = await playersResponse.json();
    
    if (playersData.data && playersData.data.length > 0) {
      const playerId = playersData.data[0].id;
      const response = await request.get(`/api/players/${playerId}/stats`);
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBeTruthy();
    }
  });

  test('GET /api/teams/[id] returns single team', async ({ request }) => {
    const teamsResponse = await request.get('/api/teams');
    const teamsData = await teamsResponse.json();
    
    if (teamsData.data && teamsData.data.length > 0) {
      const teamId = teamsData.data[0].id;
      const response = await request.get(`/api/teams/${teamId}`);
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('id');
      expect(data.data).toHaveProperty('name');
      expect(data.data).toHaveProperty('roster');
    }
  });

  test('GET /api/search with empty query returns 400', async ({ request }) => {
    const response = await request.get('/api/search?q=');
    expect(response.status()).toBe(400);
  });

  test('GET /api/search with nonexistent query returns empty', async ({ request }) => {
    const response = await request.get('/api/search?q=nonexistentplayername12345');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('data');
  });

  test('GET /api endpoint returns API documentation', async ({ request }) => {
    const response = await request.get('/api');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('name');
    expect(data).toHaveProperty('endpoints');
  });
});
