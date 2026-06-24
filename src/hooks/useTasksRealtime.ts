import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { getTasks } from "../services/taskService";
import type { Task } from "../types/database";

const sortTasks = (tasks: Task[]) => [...tasks].sort((left, right) => right.created_at.localeCompare(left.created_at));

export function useTasksRealtime() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    try {
      setTasks(await getTasks());
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load Supabase tasks.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    void refetch();
    const channel = client
      .channel("dashboard-tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (payload) => {
        setTasks((current) => {
          if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id?: string }).id;
            return current.filter((task) => task.id !== deletedId);
          }
          const changed = payload.new as Task;
          return sortTasks([changed, ...current.filter((task) => task.id !== changed.id)]);
        });
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setError("Supabase task realtime channel is unavailable.");
        }
      });
    return () => { void client.removeChannel(channel); };
  }, [refetch]);

  return { tasks, loading, error, refetch };
}
