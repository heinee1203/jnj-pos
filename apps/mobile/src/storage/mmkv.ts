import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV({ id: 'jnj-pos' });

export const secureStorage = new MMKV({
  id: 'jnj-pos-secure',
  encryptionKey: 'JNJ-device-key', // TODO: derive from device keystore in production
});

export function getJSON<T>(store: MMKV, key: string): T | null {
  const raw = store.getString(key);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export function setJSON(store: MMKV, key: string, value: unknown): void {
  store.set(key, JSON.stringify(value));
}
