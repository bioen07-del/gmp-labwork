import localforage from 'localforage';

// Configure localforage
localforage.config({
  name: 'gmp-labwork',
  storeName: 'drafts',
});

export interface Draft {
  id: string;
  type: 'container' | 'task' | 'media_batch' | 'qc_result';
  data: Record<string, unknown>;
  createdAt: string;
  synced: boolean;
}

export const offlineStorage = {
  async saveDraft(draft: Omit<Draft, 'id' | 'createdAt' | 'synced'>): Promise<string> {
    const id = `draft_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const fullDraft: Draft = {
      ...draft,
      id,
      createdAt: new Date().toISOString(),
      synced: false,
    };
    await localforage.setItem(id, fullDraft);
    return id;
  },

  async getDraft(id: string): Promise<Draft | null> {
    return localforage.getItem(id);
  },

  async getAllDrafts(): Promise<Draft[]> {
    const drafts: Draft[] = [];
    await localforage.iterate((value: Draft) => {
      if (value && value.id?.startsWith('draft_')) {
        drafts.push(value);
      }
    });
    return drafts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getUnsyncedDrafts(): Promise<Draft[]> {
    const all = await this.getAllDrafts();
    return all.filter(d => !d.synced);
  },

  async markSynced(id: string): Promise<void> {
    const draft = await this.getDraft(id);
    if (draft) {
      draft.synced = true;
      await localforage.setItem(id, draft);
    }
  },

  async deleteDraft(id: string): Promise<void> {
    await localforage.removeItem(id);
  },

  async clearSynced(): Promise<void> {
    const drafts = await this.getAllDrafts();
    for (const draft of drafts) {
      if (draft.synced) {
        await this.deleteDraft(draft.id);
      }
    }
  },
};

// Online status listener
export function createOnlineListener(onOnline: () => void, onOffline: () => void) {
  const handleOnline = () => onOnline();
  const handleOffline = () => onOffline();
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
