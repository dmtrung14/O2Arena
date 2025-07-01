import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../App';
import { db } from '../firebase';
import { collection, query, getDocs } from 'firebase/firestore';

const SubaccountContext = createContext();

export const useSubaccount = () => {
  const context = useContext(SubaccountContext);
  if (!context) {
    throw new Error('useSubaccount must be used within a SubaccountProvider');
  }
  return context;
};

export const SubaccountProvider = ({ children }) => {
  const { user } = useAuth();
  const [subaccounts, setSubaccounts] = useState([]);
  const [selectedSubaccount, setSelectedSubaccount] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchSubaccounts = async () => {
    if (!user) {
      setSubaccounts([]);
      setSelectedSubaccount(null);
      return;
    }

    setLoading(true);
    const subaccountsColRef = collection(db, 'portfolios', user.uid, 'subaccounts');
    
    try {
      const q = query(subaccountsColRef);
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setSubaccounts([]);
        setSelectedSubaccount(null);
      } else {
        const fetchedSubaccounts = querySnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        
        setSubaccounts(fetchedSubaccounts);
        
        // Keep current selection if it still exists, otherwise select first
        if (selectedSubaccount) {
          const stillExists = fetchedSubaccounts.find(sub => sub.id === selectedSubaccount.id);
          if (stillExists) {
            setSelectedSubaccount(stillExists);
          } else {
            setSelectedSubaccount(fetchedSubaccounts[0]);
          }
        } else {
          setSelectedSubaccount(fetchedSubaccounts[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching subaccounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectSubaccount = (subaccount) => {
    setSelectedSubaccount(subaccount);
    console.log(`[SubaccountContext] Selected subaccount: ${subaccount?.name} (${subaccount?.id})`);
  };

  const updateSubaccount = (updatedSubaccount) => {
    // Update the subaccount in the list
    setSubaccounts(prev => 
      prev.map(sub => 
        sub.id === updatedSubaccount.id ? updatedSubaccount : sub
      )
    );
    
    // Update selected subaccount if it's the one being updated
    if (selectedSubaccount?.id === updatedSubaccount.id) {
      setSelectedSubaccount(updatedSubaccount);
    }
  };

  // Fetch subaccounts when user changes
  useEffect(() => {
    fetchSubaccounts();
  }, [user]);

  const value = {
    subaccounts,
    selectedSubaccount,
    selectSubaccount,
    updateSubaccount,
    fetchSubaccounts,
    loading
  };

  return (
    <SubaccountContext.Provider value={value}>
      {children}
    </SubaccountContext.Provider>
  );
}; 