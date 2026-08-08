const FACES = ["U", "D", "L", "R", "F", "B"];

/**
 * On-screen turn controls. Keyboard-only would fail the mobile NFR, and this
 * also makes the available moves discoverable without reading a hint line.
 */
export default function MoveButtons({ onMove, disabled = false }) {
  return (
    <div className="grid grid-cols-6 gap-1.5">
      {FACES.map((f) => (
        <div key={f} className="flex flex-col gap-1">
          <button
            disabled={disabled}
            onClick={() => onMove(f)}
            className="py-2 rounded-lg border border-dark-border bg-dark-surface text-white text-sm font-mono cursor-pointer transition-colors hover:border-neon-blue disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {f}
          </button>
          <button
            disabled={disabled}
            onClick={() => onMove(`${f}'`)}
            className="py-2 rounded-lg border border-dark-border bg-dark-bg text-gray-300 text-sm font-mono cursor-pointer transition-colors hover:border-neon-blue disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {f}&apos;
          </button>
        </div>
      ))}
    </div>
  );
}
