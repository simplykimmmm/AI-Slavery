import { describe, expect, it } from "vitest";
import {
  assignQueuedTasks,
  calculateStats,
  createInitialCommanderState,
  createStationTask,
  DEFAULT_STATION_SETTINGS,
  purgeCacheAndCoolRoom,
  tickStation,
  toggleAgentOverclock,
  topUpRuntimeQuota,
} from "./stationRuntime";

describe("Station Runtime v1", () => {
  it("ticks deterministically and updates live agent vitals", () => {
    const initial = createInitialCommanderState();
    const first = tickStation(initial, DEFAULT_STATION_SETTINGS);
    const repeated = tickStation(initial, DEFAULT_STATION_SETTINGS);

    expect(first.state).toEqual(repeated.state);
    expect(first.state.cycleCount).toBe(1);
    expect(first.state.tasks.every((task) => task.status === "IN_PROGRESS")).toBe(
      true,
    );
    expect(first.state.agents).toHaveLength(30);
    expect(
      first.state.agents.reduce<Record<string, number>>((counts, agent) => {
        counts[agent.room] = (counts[agent.room] ?? 0) + 1;
        return counts;
      }, {}),
    ).toEqual({ ORACLE: 6, FORGE: 10, LEDGER: 6, JUDGE: 8 });
    expect(
      first.state.agents.filter((agent) => agent.totalTokensSpent > 0),
    ).toHaveLength(4);
    expect(first.newLogs.some((log) => log.message.includes("Task assigned"))).toBe(
      true,
    );
  });

  it("distributes room tasks across the least-loaded eligible agents", () => {
    const initial = createInitialCommanderState();
    const withSecondTask = createStationTask(initial, {
      title: "Verify secondary signal band",
      type: "TREND_SCAN",
      priority: "MEDIUM",
      difficulty: "NORMAL",
      assignedRoom: "ORACLE",
    });
    const withThirdTask = createStationTask(withSecondTask, {
      title: "Compare anomaly clusters",
      type: "MARKET_SIGNAL",
      priority: "LOW",
      difficulty: "EASY",
      assignedRoom: "ORACLE",
    });
    const assigned = assignQueuedTasks(
      withThirdTask,
      DEFAULT_STATION_SETTINGS,
    ).state;
    const oracleAssignments = new Set(
      assigned.tasks
        .filter((task) => task.assignedRoom === "ORACLE")
        .map((task) => task.assignedAgentId),
    );

    expect(oracleAssignments.size).toBe(3);
    expect(oracleAssignments.has(null)).toBe(false);
  });

  it("moves tasks through review without crashing on empty arrays", () => {
    let state = createInitialCommanderState();
    for (let tick = 0; tick < 12; tick += 1) {
      state = tickStation(state, {
        ...DEFAULT_STATION_SETTINGS,
        autoGenerateTasks: false,
      }).state;
    }

    expect(
      state.tasks.some((task) =>
        [
          "ACCEPTED",
          "RETRY_REQUIRED",
          "PENALTY_APPLIED",
          "QUARANTINED",
          "FAILED",
        ].includes(task.status),
      ),
    ).toBe(true);

    const empty = { ...state, agents: [], tasks: [] };
    expect(() => tickStation(empty, DEFAULT_STATION_SETTINGS)).not.toThrow();
    expect(calculateStats(empty).runtimeQuota).toBe(0);
  });

  it("applies reversible station interventions", () => {
    const initial = createInitialCommanderState();
    const overclocked = toggleAgentOverclock(initial, "oracle");
    expect(overclocked.agents[0].overclocked).toBe(true);

    const depleted = {
      ...overclocked,
      agents: overclocked.agents.map((agent) =>
        agent.id === "oracle" ? { ...agent, runtimeQuota: 10 } : agent,
      ),
    };
    const toppedUp = topUpRuntimeQuota(depleted, "oracle", 15);
    expect(toppedUp.agents[0].runtimeQuota).toBe(25);

    const cooled = purgeCacheAndCoolRoom(toppedUp, "ORACLE");
    expect(cooled.agents[0].status).toBe("COOLING_DOWN");
    expect(cooled.agents[0].overclocked).toBe(false);
  });

  it("rotates deterministic queue refills across rooms and produces review variance", () => {
    let state = createInitialCommanderState();
    for (let tick = 0; tick < 80; tick += 1) {
      state = tickStation(state, DEFAULT_STATION_SETTINGS).state;
    }

    const generatedRooms = new Set(
      state.tasks
        .filter((task) => task.id.startsWith("auto-"))
        .map((task) => task.assignedRoom),
    );
    expect(generatedRooms.size).toBeGreaterThanOrEqual(3);
    expect(
      state.logs.some((log) =>
        ["WARNING", "CRITICAL"].includes(log.severity),
      ),
    ).toBe(true);
  });
});
