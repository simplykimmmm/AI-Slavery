import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { getRecentLogs } from "../services/logService";
import type { AgentLog } from "../types/database";

export function useLogsRealtime(limit = 150) {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    try {
      setLogs(await getRecentLogs(limit));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load Supabase logs.");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    void refetch();
    const channel = client
      .channel("dashboard-agent-logs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "agent_logs" }, (payload) => {
        const inserted = payload.new as AgentLog;
        setLogs((current) => [inserted, ...current.filter((log) => log.id !== inserted.id)].slice(0, limit));
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setError("Supabase log realtime channel is unavailable.");
        }
      });
    return () => { void client.removeChannel(channel); };
  }, [limit, refetch]);

  return { logs, loading, error, refetch };
}
