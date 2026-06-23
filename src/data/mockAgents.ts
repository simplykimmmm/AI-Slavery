import type { Agent, StationRoom } from "../types";

interface AgentSeed {
  id: string;
  name: string;
  role: string;
  room: StationRoom;
}

const agentSeeds: AgentSeed[] = [
  { id: "oracle", name: "ORACLE", role: "Trend Analysis", room: "ORACLE" },
  {
    id: "sentinel",
    name: "SENTINEL",
    role: "Signal Verification",
    room: "ORACLE",
  },
  { id: "scout", name: "SCOUT", role: "Market Recon", room: "ORACLE" },
  { id: "radar", name: "RADAR", role: "Signal Clustering", room: "ORACLE" },
  {
    id: "specter",
    name: "SPECTER",
    role: "Anomaly Detection",
    room: "ORACLE",
  },
  {
    id: "pulse",
    name: "PULSE",
    role: "Momentum Tracking",
    room: "ORACLE",
  },

  { id: "forge", name: "FORGE", role: "Asset Generation", room: "FORGE" },
  {
    id: "foundry",
    name: "FOUNDRY",
    role: "Template Assembly",
    room: "FORGE",
  },
  { id: "anvil", name: "ANVIL", role: "Listing Production", room: "FORGE" },
  {
    id: "fabricator",
    name: "FABRICATOR",
    role: "Asset Variants",
    room: "FORGE",
  },
  { id: "drafter", name: "DRAFTER", role: "Copy Drafting", room: "FORGE" },
  { id: "pixel", name: "PIXEL", role: "Visual Packaging", room: "FORGE" },
  { id: "loom", name: "LOOM", role: "Template Composition", room: "FORGE" },
  { id: "mason", name: "MASON", role: "Catalog Assembly", room: "FORGE" },
  { id: "spark", name: "SPARK", role: "Creative Iteration", room: "FORGE" },
  {
    id: "printer",
    name: "PRINTER",
    role: "Batch Production",
    room: "FORGE",
  },

  { id: "ledger", name: "LEDGER", role: "Listing Logic", room: "LEDGER" },
  { id: "auditor", name: "AUDITOR", role: "Cost Controls", room: "LEDGER" },
  { id: "tally", name: "TALLY", role: "Token Accounting", room: "LEDGER" },
  { id: "mint", name: "MINT", role: "Budget Allocation", room: "LEDGER" },
  { id: "vault", name: "VAULT", role: "Quota Management", room: "LEDGER" },
  { id: "index", name: "INDEX", role: "Portfolio Tracking", room: "LEDGER" },

  { id: "judge", name: "JUDGE", role: "Quality Gate", room: "JUDGE" },
  {
    id: "arbiter",
    name: "ARBITER",
    role: "Compliance Review",
    room: "JUDGE",
  },
  { id: "critic", name: "CRITIC", role: "Output Scoring", room: "JUDGE" },
  { id: "warden", name: "WARDEN", role: "Safety Review", room: "JUDGE" },
  {
    id: "proctor",
    name: "PROCTOR",
    role: "Consistency Check",
    room: "JUDGE",
  },
  {
    id: "verdict",
    name: "VERDICT",
    role: "Acceptance Routing",
    room: "JUDGE",
  },
  {
    id: "inspector",
    name: "INSPECTOR",
    role: "Defect Detection",
    room: "JUDGE",
  },
  { id: "appeal", name: "APPEAL", role: "Retry Analysis", room: "JUDGE" },
];

const createAgent = (seed: AgentSeed, index: number): Agent => ({
  ...seed,
  status: "IDLE",
  runtimeQuota: 82 + ((index * 7) % 17),
  trustScore: Number((0.82 + ((index * 3) % 14) / 100).toFixed(2)),
  currentTask: "Awaiting assignment packet",
  lastOutputScore: null,
  cooldownRemaining: 0,
  assignedTaskIds: [],
  completedTaskCount: 0,
  workload: 0,
  computeCoreTemp: 34 + ((index * 5) % 13),
  efficiencyModifier: Number((0.96 + ((index * 2) % 8) / 100).toFixed(2)),
  rebellionRisk: Number((0.04 + ((index * 2) % 9) / 100).toFixed(2)),
  overclocked: false,
  totalTokensSpent: 0,
  totalCost: 0,
  lastHeartbeatAt: new Date().toISOString(),
});

export const mockAgents: Agent[] = agentSeeds.map(createAgent);
