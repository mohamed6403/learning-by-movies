interface Props {
  value: number;
  max: number;
  /** Second, lighter segment (e.g. cards in learning). */
  secondary?: number;
  className?: string;
}

export function ProgressBar({ value, max, secondary = 0, className = '' }: Props) {
  const pct = max ? (value / max) * 100 : 0;
  const pct2 = max ? (secondary / max) * 100 : 0;
  return (
    <div
      className={`flex h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800 ${className}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <div className="bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
      <div className="bg-amber-400/80 transition-all" style={{ width: `${pct2}%` }} />
    </div>
  );
}
