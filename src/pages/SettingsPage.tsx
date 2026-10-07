import { useRef, useState } from 'react';
import { exportBackup, importBackup } from '../db/actions';
import { saveSettings, useSettings, type Theme } from '../db/settings';

export function SettingsPage() {
  const settings = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');

  const download = async () => {
    const blob = new Blob([await exportBackup()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `subcards-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const restore = async (file: File) => {
    if (!confirm('Replace all your current data with this backup?')) return;
    try {
      await importBackup(await file.text());
      setMessage('Backup restored.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Settings</h1>

      <section className="panel flex flex-col gap-5 p-4">
        <div>
          <label className="label" htmlFor="gap">
            New sequence after a silence of
          </label>
          <div className="flex items-center gap-3">
            <input
              id="gap"
              type="range"
              min={1}
              max={20}
              step={0.5}
              value={settings.gapSeconds}
              onChange={(e) => saveSettings({ gapSeconds: Number(e.target.value) })}
              className="flex-1 accent-indigo-600"
            />
            <span className="w-14 text-right font-mono text-sm">{settings.gapSeconds} s</span>
          </div>
          <p className="muted mt-1 text-xs">Smaller = more, shorter sequences. Default: 4 s.</p>
        </div>

        <div>
          <label className="label" htmlFor="newPerDay">
            New cards per day
          </label>
          <input
            id="newPerDay"
            type="number"
            min={0}
            max={500}
            className="input w-28"
            value={settings.newPerDay}
            onChange={(e) => saveSettings({ newPerDay: Math.max(0, Number(e.target.value) || 0) })}
          />
        </div>
      </section>

      <section className="panel flex flex-col gap-5 p-4">
        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="block text-sm font-medium">Play the clip automatically</span>
            <span className="muted block text-xs">When a card is shown and a video is loaded.</span>
          </span>
          <input
            type="checkbox"
            className="h-5 w-5 accent-indigo-600"
            checked={settings.autoPlay}
            onChange={(e) => saveSettings({ autoPlay: e.target.checked })}
          />
        </label>
        <div>
          <label className="label" htmlFor="padding">
            Extra time around clips
          </label>
          <div className="flex items-center gap-3">
            <input
              id="padding"
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={settings.clipPadding}
              onChange={(e) => saveSettings({ clipPadding: Number(e.target.value) })}
              className="flex-1 accent-indigo-600"
            />
            <span className="w-14 text-right font-mono text-sm">{settings.clipPadding.toFixed(1)} s</span>
          </div>
        </div>
      </section>

      <section className="panel p-4">
        <span className="label">Theme</span>
        <div className="grid grid-cols-3 gap-2">
          {(['system', 'light', 'dark'] as Theme[]).map((t) => (
            <button key={t} type="button" className={`btn capitalize ${settings.theme === t ? 'btn-primary' : ''}`} onClick={() => saveSettings({ theme: t })}>
              {t}
            </button>
          ))}
        </div>
      </section>

      <section className="panel flex flex-col gap-3 p-4">
        <span className="label">Backup</span>
        <p className="muted text-sm">Your data only lives in this browser. Export a backup to move it to another device.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn" onClick={download}>
            Export backup
          </button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            Import backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void restore(f);
              e.target.value = '';
            }}
          />
        </div>
        {message && <p className="text-sm">{message}</p>}
      </section>

      <p className="muted text-center text-xs">SubCards · local-first · no account, no tracking</p>
    </div>
  );
}
