import { useCallback, useEffect, useState } from 'react';

type NotificationPermission = 'default' | 'granted' | 'denied';

interface UseNotificationResult {
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
  showNotification: (title: string, options?: NotificationOptions) => void;
  isSupported: boolean;
}

export function useNotification(): UseNotificationResult {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  // Check if browser supports notifications
  useEffect(() => {
    const supported = 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Request permission
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      return 'denied' as NotificationPermission;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied' as NotificationPermission;
    }
  }, [isSupported]);

  // Show notification
  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== 'granted') {
      return;
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });

      // Auto close after 5 seconds if not specified
      if (!options?.tag) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }, [isSupported, permission]);

  return {
    permission,
    requestPermission,
    showNotification,
    isSupported,
  };
}
