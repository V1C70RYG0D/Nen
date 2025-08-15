import { Router, Request, Response } from 'express';
import { logger } from '../server';
import axios from 'axios';

const router = Router();

interface AnalyticsData {
  totalMatches: number;
  totalAgents: number;
  totalVolume: string;
  averageMatchDuration: number;
  popularTimeSlots: { hour: number; matches: number }[];
  topPerformers: { name: string; winRate: number; matches: number }[];
  recentActivity: { date: string; matches: number; volume: string }[];
}

interface UserInteractionEvent {
  event: string;
  properties: Record<string, any>;
  timestamp: string;
  userId?: string;
  sessionId?: string;
}

interface GoogleAnalyticsEvent {
  client_id: string;
  events: {
    name: string;
    params: Record<string, any>;
  }[];
}

interface WebVitalsData {
  name: string;
  value: number;
  url: string;
  timestamp: string;
}

// GET /api/v1/analytics
router.get('/', async (req: Request, res: Response) => {
  try {
    const { range = '30d' } = req.query;

    logger.info(`Fetching analytics for range: ${range}`);

    // Mock data for POC - replace with actual database queries and calculations
    const analytics: AnalyticsData = {
      totalMatches: 347,
      totalAgents: 23,
      totalVolume: '1,247.8 SOL',
      averageMatchDuration: 18.5,
      popularTimeSlots: [
        { hour: 14, matches: 45 },
        { hour: 15, matches: 52 },
        { hour: 16, matches: 48 },
        { hour: 17, matches: 41 },
        { hour: 18, matches: 39 },
        { hour: 19, matches: 35 },
        { hour: 20, matches: 33 }
      ],
      topPerformers: [
        { name: 'AlphaGungi Pro', winRate: 84.7, matches: 67 },
        { name: 'Strategic Master', winRate: 77.1, matches: 54 },
        { name: 'Royal Guard Alpha', winRate: 77.2, matches: 48 }
      ],
      recentActivity: [
        { date: '2025-07-30', matches: 23, volume: '45.2 SOL' },
        { date: '2025-07-29', matches: 31, volume: '67.8 SOL' },
        { date: '2025-07-28', matches: 28, volume: '52.1 SOL' },
        { date: '2025-07-27', matches: 19, volume: '38.4 SOL' },
        { date: '2025-07-26', matches: 35, volume: '71.3 SOL' }
      ]
    };

    res.json({
      success: true,
      analytics,
      range,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/v1/analytics/mixpanel - Receive Mixpanel events
router.post('/mixpanel', async (req: Request, res: Response) => {
  try {
    const eventData: UserInteractionEvent = req.body;

    logger.info('Received Mixpanel event:', {
      event: eventData.event,
      userId: eventData.userId,
      sessionId: eventData.sessionId,
      timestamp: eventData.timestamp
    });

    // Store in database (implement your database logic here)
    // await storeUserInteractionEvent(eventData);

    // Forward to Mixpanel if needed
    if (process.env.MIXPANEL_TOKEN) {
      try {
        const mixpanelPayload = {
          event: eventData.event,
          properties: {
            ...eventData.properties,
            distinct_id: eventData.userId || eventData.sessionId,
            time: new Date(eventData.timestamp).getTime(),
            $source: 'backend_api'
          }
        };

        const encodedData = Buffer.from(JSON.stringify(mixpanelPayload)).toString('base64');

        await axios.post('https://api.mixpanel.com/track', {
          data: encodedData
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        logger.info('Successfully forwarded event to Mixpanel');
      } catch (mixpanelError) {
        logger.error('Failed to forward to Mixpanel:', mixpanelError);
      }
    }

    res.json({
      success: true,
      message: 'Event received and processed',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error processing Mixpanel event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process event',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/v1/analytics/google - Receive Google Analytics events
router.post('/google', async (req: Request, res: Response) => {
  try {
    const eventData: GoogleAnalyticsEvent = req.body;

    logger.info('Received Google Analytics event:', {
      client_id: eventData.client_id,
      events: eventData.events.map(e => ({ name: e.name, params: Object.keys(e.params) }))
    });

    // Store in database (implement your database logic here)
    // await storeGoogleAnalyticsEvent(eventData);

    // Forward to Google Analytics if needed
    if (process.env.GA_MEASUREMENT_ID && process.env.GA_API_SECRET) {
      try {
        await axios.post(
          `https://www.google-analytics.com/mp/collect?measurement_id=${process.env.GA_MEASUREMENT_ID}&api_secret=${process.env.GA_API_SECRET}`,
          eventData,
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        logger.info('Successfully forwarded event to Google Analytics');
      } catch (gaError) {
        logger.error('Failed to forward to Google Analytics:', gaError);
      }
    }

    res.json({
      success: true,
      message: 'Event received and processed',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error processing Google Analytics event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process event',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/v1/analytics/web-vitals - Receive Web Vitals data
router.post('/web-vitals', async (req: Request, res: Response) => {
  try {
    const webVitalsData: WebVitalsData = req.body;

    logger.info('Received Web Vitals data:', {
      name: webVitalsData.name,
      value: webVitalsData.value,
      url: webVitalsData.url
    });

    // Store in database (implement your database logic here)
    // await storeWebVitalsData(webVitalsData);

    // Optionally forward to analytics services
    // You can send this data to both Mixpanel and Google Analytics

    res.json({
      success: true,
      message: 'Web Vitals data received and processed',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error processing Web Vitals data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process Web Vitals data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/v1/analytics/events - Retrieve stored events
router.get('/events', async (req: Request, res: Response) => {
  try {
    const {
      type,
      startDate,
      endDate,
      userId,
      limit = 100,
      offset = 0
    } = req.query;

    logger.info('Fetching analytics events:', {
      type,
      startDate,
      endDate,
      userId,
      limit,
      offset
    });

    // Mock data for POC - replace with actual database queries
    const events = [
      {
        id: '1',
        event: 'page_view',
        properties: { page: '/dashboard', source: 'direct' },
        timestamp: new Date().toISOString(),
        userId: 'user123',
        sessionId: 'session456'
      },
      {
        id: '2',
        event: 'wallet_connect',
        properties: { wallet_type: 'phantom', success: true },
        timestamp: new Date().toISOString(),
        userId: 'user123',
        sessionId: 'session456'
      }
    ];

    res.json({
      success: true,
      events,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: events.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching analytics events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
