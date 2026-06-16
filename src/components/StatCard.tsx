interface StatCardProps {
  label: string;
  value: string | number;
  tone?: "cyan" | "violet" | "red" | "amber" | "green";
}

const toneClassName: Record<NonNullable<StatCardProps["tone"]>, string> = {
  cyan: "text-command-cyan border-command-cyan/30 bg-command-cyan/5",
  violet: "text-command-violet border-command-violet/30 bg-command-violet/5",
  red: "text-command-red border-command-red/30 bg-command-red/5",
  amber: "text-command-amber border-command-amber/30 bg-command-amber/5",
  green: "text-command-green border-command-green/30 bg-command-green/5",
};

export function StatCard({ label, value, tone = "cyan" }: StatCardProps) {
  return (
    <div
      className={`rounded border px-3 py-2 shadow-panel transition duration-300 ${toneClassName[tone]}`}
    >
      <div className="text-[0.68rem] font-medium uppercase text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-slate-100">{value}</div>
    </div>
  );
}
