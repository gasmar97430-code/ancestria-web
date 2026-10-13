let deferred = null;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn(installState()));

export function initPWA() {
  // Chemin relatif à l'appli : marche à la racine comme sous un sous-dossier.
  if ('serviceWorker' in navigator) navigator.serviceWorker.register(new URL('sw.js', document.baseURI).href);
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; emit(); });
  window.addEventListener('appinstalled', () => { deferred = null; emit(); });
}

export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Navigateur intégré à Facebook / Instagram / WhatsApp / Messenger : il ne sait pas installer d'appli.
export const isInApp = () => /FBAN|FBAV|FB_IAB|FB4A|Instagram|WhatsApp|Messenger/i.test(navigator.userAgent);
export const isAndroid = () => /android/i.test(navigator.userAgent);

// 'installed' | 'inapp' | 'prompt' | 'ios' | 'unsupported'
export function installState() {
  if (isStandalone()) return 'installed';
  if (isInApp()) return 'inapp';
  if (deferred) return 'prompt';
  if (isIOS()) return 'ios';
  return 'unsupported';
}
export const onInstallChange = (fn) => (listeners.add(fn), () => listeners.delete(fn));

export async function promptInstall() {
  if (!deferred) return installState();
  deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null; emit();
  return outcome;
}
