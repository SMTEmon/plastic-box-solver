const SPEEDS = [
  { value: 0.25, label: "0.25x", hint: "Slow enough to copy on a real cube" },
  { value: 0.5, label: "0.5x", hint: "Slow" },
  { value: 1, label: "1x", hint: "Normal" },
  { value: 2, label: "2x", hint: "Fast" },
  { value: 4, label: "4x", hint: "Very fast" },
];

/**
 * Speed + pause for solution playback.
 *
 * A speed change applies from the NEXT move: a tween's duration is fixed when
 * it starts, so the turn already spinning finishes at its original rate.
 */
export default function PlaybackControls({
  speed,
  onSpeed,
  paused,
  onPause,
  onResume,
  pending,
  total,
}) {
  const playing = pending > 0;

  return (
    <div>
      <div className="flex gap-1">
        {SPEEDS.map((s) => (
          <button
            key={s.value}
            onClick={() => onSpeed(s.value)}
            title={s.hint}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-mono cursor-pointer transition-colors border ${
              speed === s.value
                ? "border-neon-blue bg-neon-blue/10 text-neon-blue"
                : "border-dark-border bg-dark-bg text-gray-400 hover:text-white"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <button
        onClick={paused ? onResume : onPause}
        disabled={!playing && !paused}
        className="w-full mt-2 py-2 rounded-lg border border-dark-border bg-dark-bg text-gray-300 text-xs cursor-pointer hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {paused ? "Resume" : "Pause"}
      </button>

      {total > 0 && (
        <>
          <div className="mt-3 h-1.5 rounded-full bg-dark-bg overflow-hidden">
            <div
              className="h-full bg-neon-blue transition-[width] duration-200"
              style={{
                width: `${Math.round(((total - pending) / total) * 100)}%`,
              }}
            />
          </div>
          <div className="mt-1.5 text-[11px] text-gray-500">
            {total - pending} / {total} moves played
            {paused && <span className="text-yellow-400"> — paused</span>}
          </div>
        </>
      )}
    </div>
  );
}
