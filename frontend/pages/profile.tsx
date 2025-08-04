import React from 'react';
import { Layout } from '@/components/Layout/Layout';

export default function ProfilePage() {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Profile</h1>
        <p className="text-gray-400">Profile details and settings go here.</p>
      </div>
    </Layout>
  );
}
