import { type ChangeEvent, useRef } from "react";

interface StorageControlsProps {
  lastSavedAt: string | null;
  onClearArchive: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onReset: () => void;
  onSave: () => void;
}

const buttonClassName =
  "rounded border border-command-line bg-black/25 px-3 py-2 text-sm font-semibold text-slate-300 transition duration-200 hover:border-command-cyan/50 hover:text-command-cyan";

export function StorageControls({
  lastSavedAt,
  onClearArchive,
  onExport,
  onImport,
  onReset,
  onSave,
}: StorageControlsProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImport(file);
    }

    event.target.value = "";
  };

  return (
    <section className="rounded-lg border border-command-line bg-command-panel/80 p-4 shadow-panel backdrop-blur">
      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase text-slate-100">
          Local Storage
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Persist, export, import, or reset the local simulation state.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <button type="button" className={buttonClassName} onClick={onSave}>
          Save State Now
        </button>
        <button type="button" className={buttonClassName} onClick={onExport}>
          Export State JSON
        </button>
        <button
          type="button"
          className={buttonClassName}
          onClick={() => fileInputRef.current?.click()}
        >
          Import State JSON
        </button>
        <button type="button" className={buttonClassName} onClick={onClearArchive}>
          Clear Archive
        </button>
        <button
          type="button"
          className="rounded border border-command-red/40 bg-command-red/10 px-3 py-2 text-sm font-semibold text-command-red transition duration-200 hover:border-command-red hover:bg-command-red/20"
          onClick={onReset}
        >
          Reset Simulation
        </button>
      </div>

      <div className="mt-4 rounded border border-command-line bg-black/25 p-3 font-mono text-xs text-slate-400">
        STORAGE: LOCAL // LAST SAVE: {lastSavedAt ?? "UNSAVED"}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleImport}
        className="hidden"
      />
    </section>
  );
}
