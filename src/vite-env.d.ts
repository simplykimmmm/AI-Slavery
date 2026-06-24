/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly AGENT_MAX_RUNTIME_SECONDS?: string;
  readonly AGENT_COOLDOWN_SECONDS?: string;
  readonly AGENT_STEP_INTERVAL_SECONDS?: string;
  readonly AGENT_PROVIDER_DAILY_LIMIT?: string;
  readonly AGENT_PROVIDER_REQUEST_LIMIT?: string;
  readonly AGENT_PROVIDER_TOKEN_LIMIT?: string;
  readonly AGENT_MAX_CONSECUTIVE_ERRORS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
