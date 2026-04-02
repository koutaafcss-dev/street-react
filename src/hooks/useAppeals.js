import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './useAuth';

export const useAppeals = () => {
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setAppeals([]);
      setLoading(false);
      return;
    }

    const appealsQuery = query(
      collection(db, 'appeals'),
      where('userId', '==', user.uid),
      orderBy('submittedAt', 'desc')
    );

    const unsubscribe = onSnapshot(appealsQuery, (snapshot) => {
      const appealsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        submittedAt: doc.data().submittedAt?.toDate(),
        reviewedAt: doc.data().reviewedAt?.toDate(),
      }));
      setAppeals(appealsData);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  return { appeals, loading };
};