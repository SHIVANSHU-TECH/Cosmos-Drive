const request = require('supertest');
const express = require('express');
const authController = require('../backend/controllers/authController');
const driveService = require('../backend/services/driveService');

// Mock the driveService
jest.mock('../backend/services/driveService');

const app = express();
app.use(express.json());

// Add routes for testing
app.get('/api/auth/url', authController.getAuthUrl);
app.get('/api/auth/callback', authController.handleOAuthCallback);

describe('OAuth Controller', () => {
  describe('GET /api/auth/url', () => {
    it('should return an authentication URL', async () => {
      // Mock the generateAuthUrl function
      driveService.generateAuthUrl.mockReturnValue('https://accounts.google.com/oauth2/v2/auth?client_id=test');

      const response = await request(app).get('/api/auth/url');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('authUrl');
      expect(response.body.authUrl).toContain('accounts.google.com');
    });

    it('should handle errors when generating auth URL', async () => {
      // Mock the generateAuthUrl function to throw an error
      driveService.generateAuthUrl.mockImplementation(() => {
        throw new Error('Failed to generate URL');
      });

      const response = await request(app).get('/api/auth/url');
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/auth/callback', () => {
    it('should return an error if no code is provided', async () => {
      const response = await request(app).get('/api/auth/callback');
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should exchange code for tokens', async () => {
      // Mock the getOAuthTokens function
      driveService.getOAuthTokens.mockResolvedValue({
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token'
      });

      const response = await request(app).get('/api/auth/callback?code=test_code');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.tokens).toHaveProperty('access_token');
    });

    it('should handle errors when exchanging code for tokens', async () => {
      // Mock the getOAuthTokens function to throw an error
      driveService.getOAuthTokens.mockRejectedValue(new Error('Failed to get tokens'));

      const response = await request(app).get('/api/auth/callback?code=test_code');
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });
});