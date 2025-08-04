import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import config from './index';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Nen Platform API',
      version: process.env.npm_package_version || '1.0.0',
      description: 'RESTful API for the Nen platform game and betting system',
    },
    servers: [
      {
        url: `http://${config.server.host}:${config.server.port}`,
        description: `${config.server.environment} server`,
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'], // Path to the API docs
};

export const specs = swaggerJsdoc(options);
export const swaggerUiOptions = {
  explorer: true,
};

export { swaggerUi };
