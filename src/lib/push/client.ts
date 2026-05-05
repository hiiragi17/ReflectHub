/**
 * Web Push API クライアント
 *
 * ブラウザ側で Service Worker を登録し、PushSubscription を取得・解除する。
 * VAPID public key を使って push サーバーへの購読を行う。
 */

const SERVICE_WORKER_PATH = '/sw.js';

export type PushPermissionState = NotificationPermission | 'unsupported';

export interface SerializedPushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getPushPermission(): PushPermissionState {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestPushPermission(): Promise<PushPermissionState> {
  if (!isPushSupported()) return 'unsupported';
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }
  const result = await Notification.requestPermission();
  return result;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!isPushSupported()) {
    throw new Error('このブラウザは Web Push に対応していません。');
  }
  return navigator.serviceWorker.register(SERVICE_WORKER_PATH);
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function arrayBufferToBase64Url(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function serializeSubscription(
  subscription: PushSubscription,
): SerializedPushSubscription {
  const json = subscription.toJSON();
  const keys = json.keys ?? {};
  return {
    endpoint: subscription.endpoint,
    p256dh: keys.p256dh ?? arrayBufferToBase64Url(subscription.getKey('p256dh')),
    auth: keys.auth ?? arrayBufferToBase64Url(subscription.getKey('auth')),
  };
}

export async function subscribeToPush(
  vapidPublicKey: string,
): Promise<SerializedPushSubscription> {
  if (!isPushSupported()) {
    throw new Error('このブラウザは Web Push に対応していません。');
  }
  if (!vapidPublicKey) {
    throw new Error('VAPID public key が設定されていません。');
  }

  const registration = await registerServiceWorker();
  await navigator.serviceWorker.ready;

  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    return serializeSubscription(existing);
  }

  const applicationServerKey = new Uint8Array(urlBase64ToUint8Array(vapidPublicKey));
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey as BufferSource,
  });
  return serializeSubscription(subscription);
}

export async function unsubscribeFromPush(): Promise<string | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_PATH);
  if (!registration) return null;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return null;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  return endpoint;
}

export async function getCurrentSubscription(): Promise<SerializedPushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_PATH);
  if (!registration) return null;
  const subscription = await registration.pushManager.getSubscription();
  return subscription ? serializeSubscription(subscription) : null;
}
