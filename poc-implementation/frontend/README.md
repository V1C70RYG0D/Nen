# Nen Platform Frontend 🎮⚡

A futuristic, Hunter x Hunter-inspired frontend for AI vs AI Gungi battles on Solana blockchain, featuring real-time gameplay powered by MagicBlock's sub-50ms ephemeral rollups.

## 🌟 Features

- **Futuristic Hunter x Hunter Theme**: Nen-inspired UI with cyberpunk aesthetics
- **Solana Integration**: Full wallet support with Phantom, Solflare, and Backpack
- **Real-time Gameplay**: WebSocket and MagicBlock integration for live matches
- **Betting System**: Place bets on AI agents with dynamic odds
- **AI Agent Marketplace**: Buy, sell, and collect unique AI hunters
- **Responsive Design**: Mobile-friendly with adaptive layouts
- **Advanced Animations**: Framer Motion, Three.js, and particle effects

## 🚀 Quick Start

1. **Install dependencies**:
```bash
npm install
```

2. **Set up environment variables**:
Create a `.env.local` file:
```env
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_PROGRAM_ID=YourProgramIdHere
NEXT_PUBLIC_MAGICBLOCK_RPC=https://api.magicblock.app/v1/rpc
NEXT_PUBLIC_MAGICBLOCK_WS=wss://api.magicblock.app/v1/ws
```

3. **Run development server**:
```bash
npm run dev
```

4. **Build for production**:
```bash
npm run build
npm start
```

## 📁 Project Structure

```
frontend/
├── components/          # Reusable UI components
│   ├── Layout/         # Main layout with navigation
│   ├── GameBoard/      # Gungi game visualization
│   ├── BettingPanel/   # Betting interface
│   ├── MatchCard/      # Match preview cards
│   ├── AIAgentCard/    # AI agent display cards
│   └── UI/             # Common UI elements
├── pages/              # Next.js pages
│   ├── index.tsx       # Landing page
│   ├── arena/          # Match viewing pages
│   ├── marketplace.tsx # AI agent marketplace
│   ├── profile.tsx     # User profile
│   └── leaderboard.tsx # Rankings
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── styles/             # Global styles
└── public/             # Static assets
```

## 🎨 Design System

### Color Palette
- **Solana Purple**: `#9945FF`
- **Solana Green**: `#14F195`
- **MagicBlock Primary**: `#7C3AED`
- **Nen Colors**: Enhancement (Red), Emission (Cyan), Manipulation (Yellow), etc.

### Typography
- **Hunter Font**: Bebas Neue - For headings
- **Cyber Font**: Orbitron - For tech elements
- **Tech Font**: Rajdhani - For body text
- **Mono Font**: Fira Code - For numbers/code

### Components
- **Cyber Buttons**: Futuristic clip-path design
- **Hunter Cards**: Glassmorphism with Nen auras
- **Nen Loader**: Custom loading animation
- **Particles Background**: Interactive particle system

## 🔧 Technology Stack

- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS with custom animations
- **State Management**: React Query + Context API
- **Blockchain**: Solana Web3.js + Anchor
- **Real-time**: Socket.io + MagicBlock SDK
- **Animations**: Framer Motion + Three.js
- **UI Components**: Headless UI + Custom components

## 🎮 Key Features

### Game Board
- 9x9 Gungi board visualization
- Real-time piece movements
- Stack level indicators
- Nen type visualizations
- MagicBlock integration for <50ms latency

### Betting System
- Dynamic odds calculation
- Real-time pool updates
- Transaction confirmation
- Bet history tracking

### AI Marketplace
- Filter by rarity, Nen type, stats
- Sort by ELO, price, win rate
- Detailed agent profiles
- Purchase with SOL

### User Profiles
- Wallet integration
- Betting statistics
- AI agent collection
- Performance tracking

## 🌐 Environment Setup

### Required Services
1. **Solana RPC**: Connection to Solana network
2. **WebSocket Server**: For real-time game updates
3. **MagicBlock Integration**: For ephemeral rollups

### Wallet Setup
1. Install Phantom/Solflare/Backpack wallet
2. Switch to Devnet for testing
3. Get test SOL from faucet

## 📱 Responsive Design

- **Desktop**: Full feature set with enhanced visuals
- **Tablet**: Adapted layout with touch optimizations
- **Mobile**: Streamlined interface with gesture support

## 🚦 Performance Optimizations

- Code splitting for faster initial load
- Image optimization with Next.js Image
- Bundle size optimization
- React Query caching
- Lazy loading for heavy components

## 🛡️ Security Considerations

- Environment variable protection
- XSS prevention
- CSRF protection
- Secure wallet integration
- Input validation

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Run type checking
npm run type-check
```

## 📈 Future Enhancements

- [ ] Tournament system
- [ ] AI training interface
- [ ] Social features
- [ ] Mobile app
- [ ] Advanced analytics
- [ ] NFT integration

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

---

Built with ⚡ by the Nen Platform team 