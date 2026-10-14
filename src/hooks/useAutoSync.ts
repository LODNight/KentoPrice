import { useState, useEffect, useCallback } from 'react';
import {
  autoSyncManager,
  AutoSyncManager,
  type AutoSyncState,
  type AutoSyncStatus,
} from '../services/autoSyncManager';

export interface UseAutoSyncReturn {
  syncStatus: AutoSyncStatus;
  lastSyncedAt: Date | null;
  lastError: string | null;
  isAutoSyncEnabled: boolean;
  setAutoSyncEnabled: (enabled: boolean) => void;
  triggerAutoSync: () => void;
  syncNow: () => Promise<boolean>;
}

export function useAutoSync(managerOrDebounce?: AutoSyncManager | number): UseAutoSyncReturn {
  const manager =
    typeof managerOrDebounce === 'number' || !managerOrDebounce
      ? autoSyncManager
      : managerOrDebounce;
  const [state, setState] = useState<AutoSyncState>(() => manager.getState());


  useEffect(() => {
    const unsubscribe = manager.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, [manager]);

  const setAutoSyncEnabled = useCallback(
    (enabled: boolean) => {
      manager.setAutoSyncEnabled(enabled);
    },
    [manager]
  );

  const triggerAutoSync = useCallback(() => {
    manager.triggerAutoSync();
  }, [manager]);

  const syncNow = useCallback(() => {
    return manager.syncNow();
  }, [manager]);

  return {
    syncStatus: state.status,
    lastSyncedAt: state.lastSyncedAt,
    lastError: state.lastError,
    isAutoSyncEnabled: state.isAutoSyncEnabled,
    setAutoSyncEnabled,
    triggerAutoSync,
    syncNow,
  };
}

export { autoSyncManager };
