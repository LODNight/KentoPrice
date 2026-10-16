/**
 * Cross-tab communication bus for local-first multi-tab synchronization.
 * Notifies other open browser tabs when local IndexedDB data changes,
 * ensuring all tabs reflect current state immediately without cloud latency.
 */

const CHANNEL_NAME = 'ql_thuchi_cross_tab';

export type CrossTabMessage =
  | { type: 'MUTATION'; entity: 'transaction' | 'category' | 'fund'; action: string }
  | { type: 'SYNC_RESTORED' };

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
    return null;
  }
  if (!channel) {
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
    } catch {
      channel = null;
    }
  }
  return channel;
}

export function broadcastLocalMutation(entity: 'transaction' | 'category' | 'fund', action: string): void {
  const ch = getChannel();
  if (ch) {
    try {
      ch.postMessage({ type: 'MUTATION', entity, action } satisfies CrossTabMessage);
    } catch {
      // Channel might be closed in teardown
    }
  }
}

export function broadcastSyncRestored(): void {
  const ch = getChannel();
  if (ch) {
    try {
      ch.postMessage({ type: 'SYNC_RESTORED' } satisfies CrossTabMessage);
    } catch {
      // Channel might be closed in teardown
    }
  }
}

export function subscribeCrossTabMutations(callback: (msg: CrossTabMessage) => void): () => void {
  const ch = getChannel();
  if (!ch) {
    return () => {};
  }

  const handler = (event: MessageEvent<CrossTabMessage>) => {
    if (event.data && typeof event.data === 'object') {
      callback(event.data);
    }
  };

  ch.addEventListener('message', handler);
  return () => {
    ch.removeEventListener('message', handler);
  };
}
