import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './useAuth';

export const useUserTrust = () => {
  const { user } = useAuth();
  const [trustData, setTrustData] = useState({
    trustScore: 50,
    misreports: 0,
    suspended: false,
    suspensionReason: null,
    lastMisreportAt: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTrustData({
        trustScore: 50,
        misreports: 0,
        suspended: false,
        suspensionReason: null,
        lastMisreportAt: null,
      });
      setLoading(false);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists) {
        const data = doc.data();
        setTrustData({
          trustScore: data.trustScore || 50,
          misreports: data.misreports || 0,
          suspended: data.suspended || false,
          suspensionReason: data.suspensionReason || null,
          lastMisreportAt: data.lastMisreportAt?.toDate() || null,
        });
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  return { trustData, loading };
};