'use client';

import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/**
 * The myinstants.com-style "Install app" — the site installs itself to
 * the home screen / desktop as a standalone app straight from the
 * browser: no store, no APK download.
 *
 * This component registers the service worker (installability +
 * offline cache) and renders the sidebar install button only while an
 * install is actually offerable:
 *   - Chrome / Edge (Android + desktop): the browser raises
 *     beforeinstallprompt once it has verified the manifest + service
 *     worker; one tap on the button opens the native install UI
 *   - iOS Safari: there is no prompt event — iOS installs only via
 *     Share → "Add to Home Screen", so the button stays hidden there
 *     (the apple-touch-icon + appleWebApp metadata make that flow
 *     land on the archive icon in standalone mode)
 *   - already running installed (standalone display mode): hidden
 */
export function InstallAppButton() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* the archive must never fail to load over the SW */
      });
    }

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const onPrompt = (event: Event) => {
      // keep Chrome's own mini-infobar down — the sidebar button is the UI
      event.preventDefault();
      setPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setPrompt(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!prompt) return null;

  const install = async () => {
    const pending = prompt;
    await pending.prompt();
    const { outcome } = await pending.userChoice;
    if (outcome === 'accepted') setPrompt(null);
    // dismissed: the button stays — the visitor can tap it again
  };

  return (
    <div className="install-app-block">
      <button type="button" className="install-app" onClick={install}>
        <span>Install app</span>
        <span className="install-app-sub" aria-hidden="true">
          home screen · offline
        </span>
      </button>
    </div>
  );
}
