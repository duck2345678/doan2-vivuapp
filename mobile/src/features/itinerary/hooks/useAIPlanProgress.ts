import { useChatStore } from '@/features/chat/store/chatStore';
import { useEffect, useMemo, useState } from 'react';
import { websocketService } from '@/lib/websocket';
import type { AIPlanProgressEvent } from '@/lib/websocket';

export function useAIPlanProgress(
  sessionId: string | null | undefined,
  enabled = true,
) {
  const socketStatus = useChatStore((state) => state.socketStatus);
  const isConnected = socketStatus === 'connected';
  const [events, setEvents] = useState<AIPlanProgressEvent[]>([]);

  useEffect(() => {
    if (!enabled || !sessionId || !isConnected) return;

    setEvents([]);
    const subscription = websocketService.subscribeToAIPlanProgress((event) => {
      if (event.sessionId !== sessionId) return;
      setEvents((current) => [...current.slice(-19), event]);
    });

    return () => subscription?.unsubscribe();
  }, [enabled, isConnected, sessionId]);

  return useMemo(() => {
    const latest = events.at(-1);
    const active = [...events]
      .reverse()
      .find((event) => event.status === 'RUNNING');

    return {
      events,
      latest,
      activeAgent: active?.agent ?? latest?.agent ?? null,
      message:
        active?.message ??
        latest?.message ??
        'Đang chuẩn bị xử lý...',
      status: latest?.status ?? null,
      isConnected,
    };
  }, [events, isConnected]);
}
