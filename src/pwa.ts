import { get } from './utils/dom';
import { t } from './utils/i18n';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

function isInstallPrompt(event: Event): event is InstallPromptEvent {
  return 'prompt' in event && typeof event.prompt === 'function' && 'userChoice' in event;
}

export function setupPWA(signal: AbortSignal, announce: (message: string) => void): void {
  let prompt: InstallPromptEvent | null = null;
  let registration: ServiceWorkerRegistration | undefined;
  let updating = false;
  let lastUpdate = Date.now();
  const button = get('#installButton', HTMLButtonElement);
  const offlineStatus = get('#offlineStatus', HTMLElement);
  const updateStatus = (): void => {
    if (registration?.active)
      offlineStatus.textContent = navigator.onLine
        ? t('Offline ready', 'Çevrimdışı hazır')
        : t('Offline · ready to use', 'Çevrimdışı · kullanıma hazır');
  };
  window.addEventListener(
    'beforeinstallprompt',
    (event) => {
      if (!isInstallPrompt(event)) return;
      event.preventDefault();
      prompt = event;
    },
    { signal },
  );
  button.addEventListener(
    'click',
    () => {
      if (!prompt) {
        get('#installDialog', HTMLDialogElement).showModal();
        return;
      }
      const current = prompt;
      prompt = null;
      void current
        .prompt()
        .then(() => current.userChoice)
        .catch(() => get('#installDialog', HTMLDialogElement).showModal());
    },
    { signal },
  );
  window.addEventListener(
    'appinstalled',
    () => {
      prompt = null;
      button.hidden = true;
    },
    { signal },
  );
  if (matchMedia('(display-mode: standalone)').matches) button.hidden = true;
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.addEventListener(
    'controllerchange',
    () => {
      if (updating) window.location.reload();
      updateStatus();
    },
    { signal },
  );
  get('#updateButton', HTMLButtonElement).addEventListener(
    'click',
    () => {
      if (!registration?.waiting) return;
      updating = true;
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    },
    { signal },
  );
  const checkWaiting = (): void => {
    get('#updateBanner', HTMLElement).hidden = !registration?.waiting;
    updateStatus();
  };
  const checkForUpdate = (): void => {
    updateStatus();
    if (!document.hidden && navigator.onLine && Date.now() - lastUpdate > 3600000 && registration) {
      lastUpdate = Date.now();
      void registration.update().catch(() => {
        /* The current offline version stays usable. */
      });
    }
  };
  document.addEventListener('visibilitychange', checkForUpdate, { signal });
  window.addEventListener('online', checkForUpdate, { signal });
  window.addEventListener('offline', updateStatus, { signal });
  // Language changes also need to refresh this dynamically generated status.
  get('#settingLocale', HTMLSelectElement).addEventListener('change', updateStatus, { signal });
  document.addEventListener('preferenceschange', updateStatus, { signal });
  void navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' })
    .then((value) => {
      if (signal.aborted) return;
      registration = value;
      checkWaiting();
      registration.addEventListener(
        'updatefound',
        () => {
          const worker = value.installing;
          worker?.addEventListener(
            'statechange',
            () => {
              if (worker.state === 'installed' || worker.state === 'activated') checkWaiting();
            },
            { signal },
          );
        },
        { signal },
      );
      return navigator.serviceWorker.ready.then(() => {
        if (!signal.aborted) updateStatus();
      });
    })
    .catch(() =>
      announce(
        t(
          'Offline setup is unavailable. You can still use the app while connected.',
          'Çevrimdışı kurulum kullanılamıyor. Uygulamayı bağlantı varken kullanabilirsin.',
        ),
      ),
    );
}
