import type { SrsFields } from '../db/schema';
import { ANSWERS, previewIntervals, type Grade } from '../services/srs';

const COLORS: Record<number, string> = {
  1: 'border-red-300 text-red-700 dark:border-red-900 dark:text-red-400',
  2: 'border-amber-300 text-amber-700 dark:border-amber-900 dark:text-amber-400',
  3: 'border-emerald-300 text-emerald-700 dark:border-emerald-900 dark:text-emerald-400',
  4: 'border-sky-300 text-sky-700 dark:border-sky-900 dark:text-sky-400',
};

export function AnswerButtons({ card, onAnswer, disabled }: { card: SrsFields; onAnswer: (r: Grade) => void; disabled?: boolean }) {
  const intervals = previewIntervals(card);
  return (
    <div className="grid grid-cols-4 gap-2">
      {ANSWERS.map(({ rating, label, key }) => (
        <button key={rating} type="button" disabled={disabled} className={`btn flex-col gap-0 px-1 py-2 ${COLORS[rating]}`} onClick={() => onAnswer(rating)}>
          <span className="font-semibold">{label}</span>
          <span className="text-[11px] opacity-75">
            {intervals[rating]} · <kbd className="font-mono">{key}</kbd>
          </span>
        </button>
      ))}
    </div>
  );
}
