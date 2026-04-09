import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import type { Firearm, ShootingSession, Alert, InventoryItem, BallisticRecord } from '@/types';

// ── useFirearms ───────────────────────────────────────────────────────────────
export function useFirearms() {
  const [firearms, setFirearms] = useState<Firearm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    const res = await window.fetch('/api/firearms');
    const json = await res.json();
    if (!res.ok) setError(json.error);
    else setFirearms(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { firearms, loading, error, refetch: fetch };
}

// ── useSessions ───────────────────────────────────────────────────────────────
export function useSessions(firearmId?: string) {
  const [sessions, setSessions] = useState<ShootingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = firearmId ? `/api/sessions?firearm_id=${firearmId}` : '/api/sessions';
    window.fetch(url)
      .then(r => r.json())
      .then(j => { setSessions(j.data ?? []); setLoading(false); });
  }, [firearmId]);

  return { sessions, loading };
}

// ── useAlerts ─────────────────────────────────────────────────────────────────
export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    const res = await window.fetch('/api/alerts');
    const json = await res.json();
    setAlerts(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const markRead = async (id: string) => {
    await window.fetch('/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'read' }),
    });
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'read' } : a));
  };

  const unreadCount = alerts.filter(a => a.status === 'unread').length;
  return { alerts, loading, markRead, unreadCount, refetch: fetchAlerts };
}

// ── useInventory ──────────────────────────────────────────────────────────────
export function useInventory(type?: string) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = type ? `/api/inventory?type=${type}` : '/api/inventory';
    window.fetch(url)
      .then(r => r.json())
      .then(j => { setItems(j.data ?? []); setLoading(false); });
  }, [type]);

  return { items, loading };
}

// ── useBallistics ─────────────────────────────────────────────────────────────
export function useBallistics(firearmId?: string) {
  const [records, setRecords] = useState<BallisticRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firearmId) { setLoading(false); return; }
    window.fetch(`/api/ballistics?firearm_id=${firearmId}`)
      .then(r => r.json())
      .then(j => { setRecords(j.data ?? []); setLoading(false); });
  }, [firearmId]);

  return { records, loading };
}

// ── useRealtimeAlerts — Supabase Realtime subscription ───────────────────────
export function useRealtimeAlerts(userId: string, onNewAlert: (alert: Alert) => void) {
  const supabase = createClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
          filter: `user_id=eq.${userId}`,
        },
        payload => onNewAlert(payload.new as Alert)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, onNewAlert, supabase]);
}
