import type { Json, Task, TaskPatch, TaskStatus } from "../types/database";
import { createLog } from "./logService";
import { requireSupabase, throwIfSupabaseError } from "./supabaseService";

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  room: string;
  assigned_agent_id?: string | null;
  priority?: number;
  payload?: Json;
  max_retries?: number;
}

export const getTasks = async (): Promise<Task[]> => {
  const { data, error } = await requireSupabase().from("tasks").select("*").order("created_at", { ascending: false });
  throwIfSupabaseError(error);
  return (data ?? []) as Task[];
};

export const getTasksByStatus = async (status: TaskStatus): Promise<Task[]> => {
  const { data, error } = await requireSupabase().from("tasks").select("*").eq("status", status).order("created_at", { ascending: false });
  throwIfSupabaseError(error);
  return (data ?? []) as Task[];
};

export const createTask = async (input: CreateTaskInput): Promise<Task> => {
  const { data, error } = await requireSupabase()
    .from("tasks")
    .insert({
      title: input.title,
      description: input.description ?? null,
      room: input.room,
      assigned_agent_id: input.assigned_agent_id ?? null,
      priority: input.priority ?? 3,
      payload: input.payload ?? {},
      max_retries: input.max_retries ?? 3,
    })
    .select("*")
    .single();
  throwIfSupabaseError(error);
  return data as Task;
};

export const updateTask = async (taskId: string, patch: TaskPatch): Promise<Task> => {
  const { data, error } = await requireSupabase().from("tasks").update(patch).eq("id", taskId).select("*").single();
  throwIfSupabaseError(error);
  return data as Task;
};

export const assignTask = (taskId: string, agentId: string) =>
  updateTask(taskId, { assigned_agent_id: agentId, status: "ASSIGNED", started_at: new Date().toISOString() });

export const updateTaskStatus = (taskId: string, status: TaskStatus) => updateTask(taskId, { status });

export const completeTask = (taskId: string, result: Json, qualityScore: number) =>
  updateTask(taskId, { status: "ACCEPTED", result, quality_score: qualityScore, completed_at: new Date().toISOString() });

export const failTask = async (taskId: string, reason: string): Promise<Task> => {
  const task = await updateTask(taskId, { status: "FAILED", result: { error: reason }, completed_at: new Date().toISOString() });
  await createLog({ task_id: taskId, room: task.room, level: "ERROR", message: `Task failed quality control: ${reason}` });
  return task;
};

export const retryTask = async (taskId: string): Promise<Task> => {
  const { data, error } = await requireSupabase().from("tasks").select("*").eq("id", taskId).single();
  throwIfSupabaseError(error);
  const task = data as Task;
  return updateTask(taskId, {
    status: task.retry_count + 1 >= task.max_retries ? "QUARANTINED" : "QUEUED",
    retry_count: task.retry_count + 1,
    assigned_agent_id: null,
    result: null,
    quality_score: null,
    started_at: null,
    completed_at: null,
  });
};

export const deleteTasks = async (taskIds: string[]): Promise<void> => {
  if (taskIds.length === 0) return;
  const { error } = await requireSupabase().from("tasks").delete().in("id", taskIds);
  throwIfSupabaseError(error);
};
