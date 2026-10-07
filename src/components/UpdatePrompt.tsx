import { useRegisterSW } from 'virtual:pwa-register/react';

/** Offline-ready / new-version banner. The update is applied only when the user asks, never mid-review. */
export function UpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!offlineReady && !needRefresh) return null;
  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <div className="panel fixed inset-x-4 bottom-20 z-30 mx-auto flex max-w-md items-center gap-3 p-3 text-sm shadow-lg sm:bottom-4" role="status">
      <span className="flex-1">{needRefresh ? 'A new version of SubCards is available.' : 'SubCards is ready to work offline.'}</span>
      {needRefresh && (
        <button type="button" className="btn btn-primary btn-sm" onClick={() => updateServiceWorker(true)}>
          Update
        </button>
      )}
      <button type="button" className="btn btn-ghost btn-sm" onClick={close} aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}
