import { useEffect, useState } from 'react';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  createdAt: string;
}

export function useTrainingNotification() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  useEffect(() => {
    // Minimal client-side polling for demo; backend stores in memory
    const id = setInterval(async () => {
      try {
        // Placeholder: would query backend NotificationService
      } catch (_) {}
    }, 8000);
    return () => clearInterval(id);
  }, []);
  return { items };
}


