# Nen Platform POC - AI-powered Gungi Gaming on Solana

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]
[![Coverage](https://img.shields.io/badge/coverage-15%25-orange.svg)]
[![License](https://img.shields.io/badge/license-MIT-blue.svg)]

## Overview

The Nen Platform is an innovative blockchain-based gaming ecosystem that brings the strategic depth of the Gungi game from *Hunter x Hunter* to life. Built on Solana with MagicBlock integration, the platform features AI-powered gameplay, real-time betting, and NFT collectibles.

### Key Features

- **AI-Powered Gameplay**: Multiple AI personalities with different difficulty levels
- **Blockchain Integration**: Solana-based with MagicBlock for real-time gaming
- **Real-time Betting**: Secure, transparent betting system with compliance
- **NFT Integration**: Collectible AI agents with unique traits
- **Responsive UI**: Modern React/Next.js frontend with WebSocket support

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │◄──►│   Backend   │◄──►│ AI Service  │
│  (Next.js)  │    │ (Express.js)│    │  (Python)   │
└─────────────┘    └─────────────┘    └─────────────┘
                           │
                           ▼
                  ┌─────────────┐
                  │   Solana    │
                  │ MagicBlock  │
                  └─────────────┘
```

## Quick Start

### Prerequisites

- Node.js ≥22.0.0
- Python ≥3.12
- npm ≥10.0.0
- Solana CLI
- Git

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/nen-platform/poc.git
   cd poc-implementation
   ```

2. **Install dependencies:**
   ```bash
   npm run install:all
   ```

3. **Environment Setup:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start all services:**
   ```bash
   npm run dev
   ```

### Individual Services

- **Frontend:** `npm run frontend:dev` (http://localhost:3010)
- **Backend:** `npm run backend:dev` (http://localhost:3011)
- **AI Service:** `npm run ai:dev` (http://localhost:3003)

## Testing

### Run All Tests
```bash
npm test
```

### Test Coverage
```bash
npm run test:coverage
```

### End-to-End Tests
```bash
npm run test:playwright
```

## API Documentation

Once the backend is running, visit:
- **Swagger UI:** http://localhost:3011/api-docs
- **Health Check:** http://localhost:3011/health

## Project Structure

```
poc-implementation/
├── frontend/          # Next.js frontend application
├── backend/           # Express.js backend API
├── ai/               # Python AI service
├── smart-contracts/  # Solana smart contracts
├── docs/             # Project documentation
├── tests/            # E2E and integration tests
├── config/           # Configuration files
└── tools/            # Development tools
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## Security

For security concerns, please review our [Security Policy](SECURITY.md).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue or contact the development team.

## Acknowledgments

- Hunter x Hunter manga series for Gungi game inspiration
- Solana and MagicBlock for blockchain infrastructure
- Open source community for development tools
