const FACES = ["U", "D", "L", "R", "F", "B"];

/**
 * On-screen turn controls. Keyboard-only would fail the mobile NFR, and this
 * also makes the available moves discoverable without reading a hint line.
 */
export default function MoveButtons({ onMove, disabled = false }) {
  return (
    <div className="grid grid-cols-6 gap-1.5 w-full max-w-sm">
      {FACES.map((f) => (
        <div key={f} className="flex flex-col gap-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onMove(f)}
            title={`${f} face: 90° Clockwise (↻)`}
            className="py-1 px-1.5 rounded-lg border border-dark-border bg-dark-bg/90 text-white text-xs font-mono font-bold cursor-pointer transition-all hover:bg-neon-blue/20 hover:border-neon-blue/50 hover:text-neon-blue active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-0.5"
          >
            <span>{f}</span>
            <span className="text-[9px] text-neon-blue/80 font-normal select-none">↻</span>
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onMove(`${f}'`)}
            title={`${f}' face: 90° Counter-Clockwise (↺)`}
            className="py-0.5 px-1.5 rounded-lg border border-dark-border/80 bg-white/[0.03] text-gray-400 text-[11px] font-mono font-medium cursor-pointer transition-all hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-0.5"
          >
            <span>{f}&apos;</span>
            <span className="text-[9px] text-gray-500 font-normal select-none">↺</span>
          </button>
        </div>
      ))}
    </div>
  );
}
