"use client";

import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { offlineManager } from '@/lib/offline-manager';

/**
 * Network status indicator component that shows online/offline status
 * in a non-intrusive way in the corner of the screen
 */
export default function NetworkStatusIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    // Subscribe to connection status changes
    const unsubscribe = offlineManager.subscribeToConnectionChanges((online) => {
      setIsOnline(online);
      
      // Show the indicator for a few seconds when status changes
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    });
    
    // Clean up subscription on component unmount
    return () => {
      unsubscribe();
    };
  }, []);
  
  // If status hasn't changed or indicator not visible, don't show anything
  if (!visible && isOnline) {
    return null;
  }
  
  return (
    <div 
      className={`fixed bottom-4 right-4 flex items-center gap-2 px-3 py-2 rounded-full shadow-md transition-opacity duration-500 ${
        visible ? 'opacity-90' : 'opacity-40'
      } ${
        isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => {
        if (isOnline) {
          setVisible(false);
        }
      }}
    >
      {isOnline ? (
        <>
          <Wifi size={16} />
          <span className="text-xs font-medium">Online</span>
        </>
      ) : (
        <>
          <WifiOff size={16} />
          <span className="text-xs font-medium">Offline</span>
        </>
      )}
    </div>
  );
} 