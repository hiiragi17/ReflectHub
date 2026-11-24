'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * クライアントでの描画(hydration 完了後)なら true、SSR と hydration 中は false。
 *
 * UA 判定や localStorage など SSR と値が一致しない情報を描画に使うときに、
 * hydration mismatch を避けるためのガードとして使う。effect 内で
 * `setMounted(true)` する従来パターンの置き換え。
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
