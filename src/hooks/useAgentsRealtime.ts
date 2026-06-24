import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { getAgents } from "../services/agentService";
import type { Agent } from "../types/database";

const sortAgents = (agents: Agent[]) => [...agents].sort((left, right) => left.created_at.localeCompare(right.created_at));

export function useAgentsRealtime() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    try {
      setAgents(await getAgents());
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load Supabase agents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    void refetch();
    const channel = client
      .channel("dashboard-agents")
      .on("postgres_changes", { event: "*", schema: "public", table: "agents" }, (payload) => {
        setAgents((current) => {
          if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id?: string }).id;
            return current.filter((agent) => agent.id !== deletedId);
          }
          const changed = payload.new as Agent;
          return sortAgents([changed, ...current.filter((agent) => agent.id !== changed.id)]);
        });
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setError("Supabase agent realtime channel is unavailable.");
        }
      });
    return () => { void client.removeChannel(channel); };
  }, [refetch]);

  return { agents, loading, error, refetch };
}
