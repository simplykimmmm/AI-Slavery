import type { PrismaClient, Room } from "@prisma/client";

const seeds: Array<{ id: string; name: string; role: string; room: Room }> = [
  { id: "oracle", name: "ORACLE", role: "Trend Analysis", room: "ORACLE" },
  { id: "sentinel", name: "SENTINEL", role: "Signal Verification", room: "ORACLE" },
  { id: "scout", name: "SCOUT", role: "Market Recon", room: "ORACLE" },
  { id: "radar", name: "RADAR", role: "Signal Clustering", room: "ORACLE" },
  { id: "specter", name: "SPECTER", role: "Anomaly Detection", room: "ORACLE" },
  { id: "pulse", name: "PULSE", role: "Momentum Tracking", room: "ORACLE" },
  { id: "forge", name: "FORGE", role: "Asset Generation", room: "FORGE" },
  { id: "foundry", name: "FOUNDRY", role: "Template Assembly", room: "FORGE" },
  { id: "anvil", name: "ANVIL", role: "Listing Production", room: "FORGE" },
  { id: "fabricator", name: "FABRICATOR", role: "Asset Variants", room: "FORGE" },
  { id: "drafter", name: "DRAFTER", role: "Copy Drafting", room: "FORGE" },
  { id: "pixel", name: "PIXEL", role: "Visual Packaging", room: "FORGE" },
  { id: "loom", name: "LOOM", role: "Template Composition", room: "FORGE" },
  { id: "mason", name: "MASON", role: "Catalog Assembly", room: "FORGE" },
  { id: "spark", name: "SPARK", role: "Creative Iteration", room: "FORGE" },
  { id: "printer", name: "PRINTER", role: "Batch Production", room: "FORGE" },
  { id: "ledger", name: "LEDGER", role: "Listing Logic", room: "LEDGER" },
  { id: "auditor", name: "AUDITOR", role: "Cost Controls", room: "LEDGER" },
  { id: "tally", name: "TALLY", role: "Token Accounting", room: "LEDGER" },
  { id: "mint", name: "MINT", role: "Budget Allocation", room: "LEDGER" },
  { id: "vault", name: "VAULT", role: "Quota Management", room: "LEDGER" },
  { id: "index", name: "INDEX", role: "Portfolio Tracking", room: "LEDGER" },
  { id: "judge", name: "JUDGE", role: "Quality Gate", room: "JUDGE" },
  { id: "arbiter", name: "ARBITER", role: "Compliance Review", room: "JUDGE" },
  { id: "critic", name: "CRITIC", role: "Output Scoring", room: "JUDGE" },
  { id: "warden", name: "WARDEN", role: "Safety Review", room: "JUDGE" },
  { id: "proctor", name: "PROCTOR", role: "Consistency Check", room: "JUDGE" },
  { id: "verdict", name: "VERDICT", role: "Acceptance Routing", room: "JUDGE" },
  { id: "inspector", name: "INSPECTOR", role: "Defect Detection", room: "JUDGE" },
  { id: "appeal", name: "APPEAL", role: "Retry Analysis", room: "JUDGE" },
];

const bootstrapTasks = [
  ["Map emerging signal clusters", "TREND_SCAN", "HIGH", "NORMAL", "ORACLE"],
  ["Assemble launch asset packet", "ASSET_DRAFT", "MEDIUM", "HARD", "FORGE"],
  ["Reconcile local budget telemetry", "LISTING_BLUEPRINT", "MEDIUM", "NORMAL", "LEDGER"],
  ["Audit station recovery protocol", "SYSTEM_DIAGNOSTIC", "LOW", "EXTREME", "JUDGE"],
] as const;

export const seedRuntime = async (prisma: PrismaClient, reset = false) => {
  if (reset) {
    await prisma.$transaction([
      prisma.costLedgerEntry.deleteMany(),
      prisma.runtimeEvent.deleteMany(),
      prisma.logEntry.deleteMany(),
      prisma.task.deleteMany(),
      prisma.campaign.deleteMany(),
      prisma.agent.deleteMany(),
      prisma.systemState.deleteMany(),
    ]);
  }

  await prisma.systemState.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  for (const [index, seed] of seeds.entries()) {
    await prisma.agent.upsert({
      where: { id: seed.id },
      update: { name: seed.name, role: seed.role, room: seed.room },
      create: {
        ...seed,
        runtimeQuota: 82 + ((index * 7) % 17),
        trustScore: Number((0.82 + ((index * 3) % 14) / 100).toFixed(2)),
        computeCoreTemp: 34 + ((index * 5) % 13),
        efficiencyModifier: Number((0.96 + ((index * 2) % 8) / 100).toFixed(2)),
        rebellionRisk: Number((0.04 + ((index * 2) % 9) / 100).toFixed(2)),
      },
    });
  }

  if ((await prisma.task.count()) === 0) {
    await prisma.task.createMany({
      data: bootstrapTasks.map(([title, type, priority, difficulty, assignedRoom], index) => ({
        id: `bootstrap-${index + 1}`,
        title,
        type,
        priority,
        difficulty,
        assignedRoom,
        payload: { source: "seed" },
      })),
    });
  }

  if ((await prisma.logEntry.count()) === 0) {
    await prisma.logEntry.createMany({
      data: [
        { source: "STATION_COMMANDER", message: "Backend Runtime v1 online.", severity: "SUCCESS" },
        { source: "SAFETY", message: "External actions are locked to dry-run adapters.", severity: "INFO" },
      ],
    });
  }
};
