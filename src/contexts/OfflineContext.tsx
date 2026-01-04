import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { offlineStorage, Draft, createOnlineListener } from '@/lib/offlineStorage';
import { supabase } from '@/lib/supabase';

interface OfflineContextType {
  isOnline: boolean;
  draftsCount: number;
  saveDraft: (type: Draft['type'], data: Record<string, unknown>) => Promise<string>;
  syncDrafts: () => Promise<void>;
  getDrafts: () => Promise<Draft[]>;
}

const OfflineContext = createContext<OfflineContextType | null>(null);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [draftsCount, setDraftsCount] = useState(0);

  const updateDraftsCount = useCallback(async () => {
    const drafts = await offlineStorage.getUnsyncedDrafts();
    setDraftsCount(drafts.length);
  }, []);

  useEffect(() => {
    updateDraftsCount();
    const cleanup = createOnlineListener(
      async () => {
        setIsOnline(true);
        // Auto-sync on reconnect
        await syncDrafts();
      },
      () => setIsOnline(false)
    );
    return cleanup;
  }, []);

  const saveDraft = async (type: Draft['type'], data: Record<string, unknown>) => {
    const id = await offlineStorage.saveDraft({ type, data });
    await updateDraftsCount();
    return id;
  };

  const getDrafts = () => offlineStorage.getAllDrafts();

  const syncDrafts = async () => {
    const drafts = await offlineStorage.getUnsyncedDrafts();
    
    for (const draft of drafts) {
      try {
        let table = '';
        switch (draft.type) {
          case 'container': table = 'containers'; break;
          case 'task': table = 'tasks'; break;
          case 'media_batch': table = 'media_batches'; break;
          case 'qc_result': table = 'qc_results'; break;
        }
        
        if (table) {
          const { error } = await supabase.from(table).insert(draft.data);
          if (!error) {
            await offlineStorage.markSynced(draft.id);
          }
        }
      } catch (e) {
        console.error('Sync error:', e);
      }
    }
    
    await offlineStorage.clearSynced();
    await updateDraftsCount();
  };

  return (
    <OfflineContext.Provider value={{ isOnline, draftsCount, saveDraft, syncDrafts, getDrafts }}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error('useOffline must be used within OfflineProvider');
  return ctx;
}
