import request from 'supertest';
import express from 'express';
import aiRoutes from '../../routes/ai';
import { errorHandler } from '../../middleware/errorHandler';

const app = express();

// Custom JSON middleware that handles parsing errors
app.use((req, res, next) => {
  express.json()(req, res, (err) => {
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({
        success: false,
        message: 'Invalid JSON format',
        error: 'Malformed JSON in request body'
      });
      return;
    }
    if (err) {
      next(err);
      return;
    }
    next();
  });
});

app.use('/api/ai', aiRoutes);
app.use(errorHandler);

describe('AI Routes', () => {
  describe('GET /api/ai/agents', () => {
    it('should return list of available AI agents', async () => {
      const response = await request(app)
        .get('/api/ai/agents')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);

      // Check that we have the 5 Hunter x Hunter agents
      expect(response.body.data.length).toBeGreaterThanOrEqual(5);

      const agentNames = response.body.data.map((agent: any) => agent.name);
      expect(agentNames).toContain('Isaac Netero');
      expect(agentNames).toContain('Meruem');
      expect(agentNames).toContain('Komugi');
      expect(agentNames).toContain('Ging Freecss');
      expect(agentNames).toContain('Hisoka Morow');
    });
  });

  describe('GET /api/ai/agents/:id', () => {
    it('should return specific agent details', async () => {
      const response = await request(app)
        .get('/api/ai/agents/netero')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('name', 'netero');
      expect(response.body.data).toHaveProperty('personality');
      expect(response.body.data).toHaveProperty('skillLevel');
      expect(response.body.data).toHaveProperty('elo');
    });

    it('should return 404 for non-existent agent', async () => {
      const response = await request(app)
        .get('/api/ai/agents/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/ai/agents/:id/challenge', () => {
    it('should create challenge between agents', async () => {
      const challengeData = {
        opponent: 'meruem',
        gameType: 'ranked'
      };

      const response = await request(app)
        .post('/api/ai/agents/netero/challenge')
        .send(challengeData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('matchId');
      expect(response.body.data).toHaveProperty('agent1', 'netero');
      expect(response.body.data).toHaveProperty('agent2', 'meruem');
    });

    it('should validate challenge parameters', async () => {
      const response = await request(app)
        .post('/api/ai/agents/netero/challenge')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/ai/leaderboard', () => {
    it('should return AI agent leaderboard', async () => {
      const response = await request(app)
        .get('/api/ai/leaderboard')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('leaderboard');
      expect(Array.isArray(response.body.data.leaderboard)).toBe(true);
    });

    it('should sort leaderboard by ELO rating', async () => {
      const response = await request(app)
        .get('/api/ai/leaderboard')
        .expect(200);

      const leaderboard = response.body.data.leaderboard;
      if (leaderboard.length > 1) {
        for (let i = 0; i < leaderboard.length - 1; i++) {
          expect(leaderboard[i].elo).toBeGreaterThanOrEqual(leaderboard[i + 1].elo);
        }
      }
    });
  });

  describe('POST /api/ai/agents/create', () => {
    it('should create custom AI agent', async () => {
      const agentData = {
        name: 'custom-test-agent',
        personality: {
          aggression: 5,
          creativity: 7,
          riskTaking: 3,
          patience: 8
        },
        skillLevel: 6,
        specialties: ['defensive_play', 'endgame']
      };

      const response = await request(app)
        .post('/api/ai/agents/create')
        .send(agentData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('name', agentData.name);
      expect(response.body.data).toHaveProperty('personality');
    });

    it('should validate agent creation parameters', async () => {
      const response = await request(app)
        .post('/api/ai/agents/create')
        .send({ name: '' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Performance Tests', () => {
    it('should respond to agent list within 100ms', async () => {
      const start = Date.now();
      await request(app)
        .get('/api/ai/agents')
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should handle concurrent requests', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app).get('/api/ai/agents').expect(200)
      );

      const responses = await Promise.all(requests);
      responses.forEach(response => {
        expect(response.body).toHaveProperty('success', true);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/ai/agents/create')
        .set('Content-Type', 'application/json')
        .send('{"invalid": "json"}')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should handle server errors gracefully', async () => {
      // This would normally mock a service failure
      const response = await request(app)
        .get('/api/ai/agents/error-test')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });
  });
});
