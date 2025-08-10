import dynamic from 'next/dynamic';
import { Layout } from '@/components/Layout/Layout';
import { motion } from 'framer-motion';

// Import Training component with no SSR to avoid hydration issues
const TrainingClient = dynamic(() => import('../components/TrainingClient'), {
  ssr: false,
  loading: () => (
    <Layout>
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-solana-purple/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-solana-green/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-magicblock-primary/10 rounded-full blur-3xl animate-pulse-slow" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Loading Title */}
            <h1 className="text-6xl md:text-8xl font-hunter mb-6 glitch-text" data-text="LOADING">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-solana-purple via-solana-green to-magicblock-primary animate-gradient text-glow">
                LOADING
              </span>
            </h1>
            
            {/* Loading Spinner */}
            <div className="flex items-center justify-center space-x-2 mb-8">
              <div className="nen-spinner w-8 h-8" />
              <span className="text-xl font-cyber text-gray-300">INITIALIZING TRAINING PROTOCOL...</span>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  )
});

const Training: React.FC = () => {
  return <TrainingClient />;
};

export default Training;
