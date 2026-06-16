import { useEffect, useMemo, useState } from "react";
import {
  createInitialCommanderState,
  simulateCommanderTick,
} from "../lib/simulation";
import type { CommanderState } from "../types";
import { AgentCard } from "./AgentCard";
import { EventLog } from "./EventLog";
import { PenaltyProtocolPanel } from "./PenaltyProtocolPanel";
import { StateMachinePanel } from "./StateMachinePanel";
import { TopBar } from "./TopBar";

export function CommanderDashboard() {
  const [state, setState] = useState<CommanderState>(() =>
    createInitialCommanderState(),
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setState((current) => simulateCommanderTick(current));
    }, 2600);

    return () => window.clearInterval(intervalId);
  }, []);

  const roomStatusSummary = useMemo(
    () =>
      state.agents.reduce(
        (summary, agent) => {
          summary[agent.status] += 1;
          return summary;
        },
        {
          IDLE: 0,
          WORKING: 0,
          REVIEWING: 0,
          COOLING_DOWN: 0,
          QUARANTINED: 0,
        },
      ),
    [state.agents],
  );

  const statusLabels: Record<keyof typeof roomStatusSummary, string> = {
    IDLE: "Idle",
    WORKING: "Working",
    REVIEWING: "Review",
    COOLING_DOWN: "Cooldown",
    QUARANTINED: "Quarantine",
  };

  return (
    <main className="command-grid min-h-screen bg-command-black px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
        <TopBar state={state} />

        <section className="grid gap-5 xl:grid-cols-[21rem_1fr_24rem]">
          <div className="space-y-5">
            <StateMachinePanel activeStep={state.activeStep} />
            <PenaltyProtocolPanel tasks={state.tasks} />
          </div>

          <div className="space-y-5">
            <section className="rounded-lg border border-command-line bg-command-panel/65 p-4 shadow-panel backdrop-blur">
              <div className="mb-4 flex flex-col gap-3">
                <div>
                  <h2 className="text-sm font-semibold uppercase text-slate-100">
                    Agent Rooms
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Supervised production rooms under station control
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center font-mono text-xs sm:grid-cols-3 2xl:grid-cols-5">
                  {Object.entries(roomStatusSummary).map(([status, count]) => (
                    <div
                      key={status}
                      className="min-w-0 rounded border border-command-line bg-black/25 px-2 py-1"
                    >
                      <div className="truncate text-slate-500">
                        {statusLabels[status as keyof typeof roomStatusSummary]}
                      </div>
                      <div className="mt-1 text-slate-100">{count}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {state.agents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>
            </section>
          </div>

          <EventLog logs={state.logs} />
        </section>
      </div>
    </main>
  );
}
