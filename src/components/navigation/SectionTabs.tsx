import type { SectionId } from "../../types";

interface SectionTabsProps {
  activeSection: SectionId;
  onChange: (section: SectionId) => void;
}

const sections: Array<{ id: SectionId; label: string }> = [
  { id: "COMMAND_DECK", label: "Command Deck" },
  { id: "STATION_MAP", label: "Station Map" },
  { id: "MISSIONS", label: "Missions" },
  { id: "CAMPAIGNS", label: "Campaigns" },
  { id: "AGENTS", label: "Agents" },
  { id: "ARCHIVE", label: "Archive" },
  { id: "ANALYTICS", label: "Analytics" },
  { id: "SETTINGS", label: "Settings" },
];

export function SectionTabs({ activeSection, onChange }: SectionTabsProps) {
  return (
    <nav className="rounded-lg border border-command-line bg-command-panel/75 p-2 shadow-panel backdrop-blur">
      <div className="grid gap-2 sm:grid-cols-4 xl:grid-cols-8">
        {sections.map((section) => {
          const isActive = section.id === activeSection;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onChange(section.id)}
              className={`rounded border px-3 py-2 text-sm font-semibold transition duration-200 ${
                isActive
                  ? "border-command-cyan bg-command-cyan/10 text-command-cyan shadow-neon-blue"
                  : "border-command-line bg-black/20 text-slate-400 hover:border-command-cyan/40 hover:text-slate-100"
              }`}
            >
              {section.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
