/**
 * Shared UI primitives.
 *
 * Every page was hand-rolling its own card, header and button classes, so the
 * spacing and borders drifted between screens and the whole app read as
 * unfinished. These are the only building blocks pages should use.
 */

import { useState } from "react";

const TONES = {
  default: "border-dark-border",
  blue: "border-neon-blue/45",
  violet: "border-accent-violet/45",
  green: "border-neon-green/45",
  amber: "border-accent-amber/45",
  rose: "border-accent-rose/45",
};

/**
 * A titled surface. `tone` colours the border to signal what it is.
 *
 * `collapsible` matters more than it sounds: the solve page had eight panels
 * competing with the 3D cube for attention, and the cube is the thing people
 * came for. Secondary panels collapse so the cube gets the space.
 */
export function Panel({
  title,
  action,
  tone = "default",
  className = "",
  collapsible = false,
  defaultOpen = true,
  compact = false,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const pad = compact ? "p-3" : "p-4";

  return (
    <section
      className={`bg-dark-surface/85 backdrop-blur-sm border ${TONES[tone]} rounded-2xl ${pad} ${className}`}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-2">
          {collapsible ? (
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-1.5 cursor-pointer group"
            >
              <span className="text-[10px] text-gray-600 group-hover:text-gray-400">
                {open ? "▾" : "▸"}
              </span>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.13em] text-gray-400 group-hover:text-gray-200">
                {title}
              </h3>
            </button>
          ) : (
            title && (
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.13em] text-gray-400">
                {title}
              </h3>
            )
          )}
          {action}
        </header>
      )}
      {(!collapsible || open) && (
        <div className={title || action ? (compact ? "mt-2.5" : "mt-3") : ""}>
          {children}
        </div>
      )}
    </section>
  );
}

/** Page title row, so every screen starts the same way. */
export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">{title}</h2>
        {subtitle && (
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        )}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

const VARIANTS = {
  primary:
    "bg-neon-blue text-dark-bg font-bold hover:brightness-110 disabled:hover:brightness-100",
  violet:
    "bg-accent-violet text-dark-bg font-bold hover:brightness-110 disabled:hover:brightness-100",
  ghost:
    "border border-dark-border bg-dark-raised/60 text-gray-300 hover:text-white hover:border-dark-border-strong",
  subtle: "text-gray-400 hover:text-white",
  danger:
    "border border-accent-rose/40 bg-accent-rose/10 text-accent-rose hover:bg-accent-rose/20",
};

const SIZES = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2.5 text-sm rounded-xl",
  lg: "px-5 py-3.5 text-base rounded-xl",
};

export function Button({
  variant = "ghost",
  size = "sm",
  className = "",
  children,
  ...rest
}) {
  return (
    <button
      className={`${VARIANTS[variant]} ${SIZES[size]} cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Segmented control -- used for the three solve modes. */
export function Segmented({ options, value, onChange, disabled }) {
  return (
    <div className="inline-flex p-1 rounded-xl bg-dark-bg/70 border border-dark-border">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          disabled={disabled}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
            value === o.value
              ? "bg-neon-blue/15 text-neon-blue shadow-[inset_0_0_0_1px_rgba(34,211,238,0.45)]"
              : "text-gray-400 hover:text-white"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const STAT_TONES = {
  default: "text-white",
  blue: "text-neon-blue",
  green: "text-neon-green",
  violet: "text-accent-violet",
  amber: "text-accent-amber",
};

export function Stat({ label, value, sub, tone = "default" }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.12em] text-gray-500">
        {label}
      </div>
      <div className={`text-xl font-bold font-mono ${STAT_TONES[tone]}`}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}

const NOTE_TONES = {
  info: "border-neon-blue/35 bg-neon-blue/5 text-neon-blue",
  warn: "border-accent-amber/35 bg-accent-amber/5 text-accent-amber",
  error: "border-accent-rose/40 bg-accent-rose/5 text-accent-rose",
  success: "border-neon-green/35 bg-neon-green/5 text-neon-green",
};

export function Note({ tone = "info", children, className = "" }) {
  return (
    <div
      className={`text-xs rounded-xl border px-3 py-2.5 leading-relaxed ${NOTE_TONES[tone]} ${className}`}
    >
      {children}
    </div>
  );
}

export function EmptyState({ icon = "◇", title, children, action }) {
  return (
    <div className="text-center py-10 px-4">
      <div className="text-3xl text-gray-700 mb-3">{icon}</div>
      <p className="text-sm font-semibold text-gray-300">{title}</p>
      {children && (
        <p className="text-xs text-gray-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
          {children}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const MODAL_WIDTH = { md: "max-w-md", lg: "max-w-3xl" };

/**
 * Centred modal. `size="lg"` gives a landscape layout -- the guided pre-flight
 * has three separate choices to make, and stacked vertically it was taller
 * than the viewport, so the Start button fell below the fold.
 */
export function Modal({ open, onClose, title, subtitle, size = "md", children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${MODAL_WIDTH[size]} max-h-[92vh] overflow-y-auto bg-dark-surface border border-dark-border-strong rounded-2xl p-5 pbs-enter shadow-2xl`}
      >
        <h3 className="text-base font-bold text-white">{title}</h3>
        {subtitle && (
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">{subtitle}</p>
        )}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function Spinner({ label = "Loading..." }) {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-400 pbs-pulse">
      <span className="w-2 h-2 rounded-full bg-neon-blue" />
      {label}
    </div>
  );
}
