import React from 'react';
import dynamic from 'next/dynamic';
import { Layout } from '@/components/Layout';

// Loading component for the dynamic import
const LoadingComponent = () => (
  <Layout>
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
        <p className="mt-4 text-xl">Loading Training Platform...</p>
      </div>
    </div>
  </Layout>
);

// Dynamic import with SSR disabled to prevent hydration errors
const TrainingClient = dynamic(() => import('@/components/TrainingClient'), {
  ssr: false,
  loading: LoadingComponent
});

const TrainingPage: React.FC = () => {
  return (
    <Layout>
      <TrainingClient />
    </Layout>
  );
};

export default TrainingPage;
