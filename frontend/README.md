# Nen Platform Frontend

A futuristic blockchain gaming platform where AI agents battle in real-time Gungi matches, inspired by Hunter x Hunter. Built with Next.js, Solana, and MagicBlock for sub-50ms gaming performance.

## 🎮 Features

- **Real-Time Gaming**: Sub-50ms latency with MagicBlock integration
- **AI Battles**: Neural network agents compete in strategic Gungi matches
- **NFT Marketplace**: Own, trade, and upgrade AI fighters
- **SOL Betting**: Place bets on matches with Solana integration
- **Hunter x Hunter Theme**: Nen aura effects and anime-inspired design

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Solana wallet (Phantom, Solflare, etc.)

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Setup environment**:
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your RPC URLs and program IDs
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Open browser**:
   ```
   http://localhost:3000
   ```

## 🛠️ Tech Stack

### Core
- **Next.js 14** - React framework with App Router
- **React 18** - UI library with hooks and suspense
- **TypeScript 5** - Type-safe development
- **Tailwind CSS** - Utility-first styling

### Blockchain
- **@solana/web3.js** - Solana blockchain integration
- **@solana/wallet-adapter** - Wallet connection management
- **Anchor** - Solana program framework

### Real-Time & UI
- **Socket.io** - WebSocket connections
- **MagicBlock SDK** - Sub-50ms gaming infrastructure
- **Framer Motion** - Smooth animations
- **React Query** - Data fetching and caching

### Performance
- **Code Splitting** - Dynamic imports
- **Image Optimization** - Next.js Image component
- **Bundle Analysis** - Webpack optimization

## 📁 Project Structure

```
frontend/
├── components/          # Reusable UI components
│   ├── Layout/         # Main layout wrapper
│   ├── GameBoard/      # 3D Gungi board with stacking
│   ├── BettingPanel/   # SOL betting interface
│   ├── MatchCard/      # Match preview cards
│   └── AIAgentCard/    # NFT agent displays
├── hooks/              # Custom React hooks
│   ├── useGameState.ts # Real-time game state
│   ├── useBetting.ts   # Solana betting logic
│   └── useMagicBlock.ts # MagicBlock session
├── pages/              # Next.js pages
│   ├── index.tsx       # Landing page
│   ├── arena/[id].tsx  # Match viewing
│   ├── marketplace/    # NFT marketplace
│   └── profile/        # User dashboard
├── types/              # TypeScript definitions
├── utils/              # Helper functions
│   ├── format.ts       # Number/date formatting
│   ├── theme.ts        # Nen aura styling
│   └── validation.ts   # Input validation
└── styles/             # Global CSS and themes
```

## 🎨 Design System

### Color Palette
```css
/* Nen Aura Types */
--enhancement: #FF6B6B  /* Red enhancement aura */
--emission: #4ECDC4     /* Cyan emission aura */
--manipulation: #6C5CE7 /* Purple manipulation aura */
--neural: #00BCD4       /* Blue AI neural patterns */

/* Platform Colors */
--solana: #4527A0       /* Solana brand purple */
--magicblock: #0277BD   /* MagicBlock lightning blue */
--space: #0A0E27        /* Deep space background */
```

### Components
- **Nen Cards**: Glassmorphism cards with aura glows
- **Energy Buttons**: Gradient buttons with pulse animations
- **Neural Patterns**: Animated background textures
- **Holographic Effects**: Shifting color gradients

## 🎯 Core Pages

### Landing (`/`)
- Hero section with Nen branding
- Live match grid with real-time updates
- Platform statistics dashboard
- Call-to-action for wallet connection

### Match Arena (`/arena/[matchId]`)
- 3D Gungi board with piece stacking
- Real-time move streaming via MagicBlock
- Betting panel with odds calculation
- Move history and game analysis

### Marketplace (`/marketplace`)
- AI agent NFT listings
- Filter by personality/stats
- Purchase flow with Solana transactions
- Agent trait visualization

### Profile (`/profile`)
- User statistics and achievements
- Owned AI agents collection
- Betting history and winnings
- Wallet management

## ⚡ Real-Time Features

### MagicBlock Integration
```typescript
// Sub-50ms game state updates
const { session, submitMove, latency } = useMagicBlockSession(matchId);

// Real-time move validation
await submitMove(move); // < 50ms response time
```

### WebSocket Fallback
```typescript
// Automatic fallback for standard WebSocket
const { boardState, isConnected } = useGameState(matchId, {
  enableMagicBlock: true,
  autoReconnect: true
});
```

## 💰 Solana Integration

### Wallet Connection
```typescript
// Multi-wallet support
const wallets = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
  new BackpackWalletAdapter(),
];
```

### Betting System
```typescript
// Place bets on matches
const { placeBet, claimWinnings } = useBetting(matchId);

await placeBet({
  matchId,
  agent: 1,
  amount: 0.5 // SOL
});
```

### NFT Marketplace
```typescript
// AI agent trading
const { buyAgent, listAgent } = useMarketplace();

await buyAgent(agentId); // Purchase with SOL
```

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### E2E Tests
```bash
npm run test:e2e
```

### Performance Tests
```bash
npm run lighthouse
```

## 📱 Mobile Support

- **Responsive Design**: Mobile-first Tailwind breakpoints
- **Touch Gestures**: Optimized for mobile gameplay
- **PWA Ready**: Installable progressive web app
- **Offline Mode**: Limited functionality without connection

## 🔧 Environment Variables

```bash
# Solana Configuration
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=YourProgramIdHere
NEXT_PUBLIC_NETWORK=devnet

# Real-Time Gaming
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_MAGICBLOCK_URL=wss://magicblock.dev

# Analytics (Optional)
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id
```

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm run build
vercel --prod
```

### Docker
```bash
docker build -t nen-platform .
docker run -p 3000:3000 nen-platform
```

### Self-Hosted
```bash
npm run build
npm start
```

## 🔍 Performance Optimization

### Bundle Analysis
```bash
npm run analyze
```

### Core Web Vitals
- **LCP**: < 2.5s (Largest Contentful Paint)
- **FID**: < 100ms (First Input Delay)
- **CLS**: < 0.1 (Cumulative Layout Shift)

### Optimizations Applied
- Code splitting by route
- Image optimization with Next.js
- Tree shaking for unused code
- Service worker caching
- Critical CSS inlining

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Hunter x Hunter** - Inspiration for Nen system and Gungi game
- **Solana** - High-performance blockchain infrastructure
- **MagicBlock** - Real-time gaming technology
- **Next.js Team** - Amazing React framework

---

**Built with ⚡ by hunters, for hunters.**
