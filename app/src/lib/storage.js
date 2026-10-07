/* ---------------------------------------------------------
   The engine reads the browser's localStorage, which is synchronous.
   The phone's storage is not. So everything is read once at launch into
   memory, the engine reads and writes the memory, and each write is
   saved behind it. Taste and ratings now survive a restart, which the
   spike's in-memory copy did not.
   --------------------------------------------------------- */

import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'ls:';

export async function loadLocalStorage() {
  const mem = new Map();
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter(k => k.startsWith(PREFIX));
    const pairs = await AsyncStorage.multiGet(keys);
    pairs.forEach(([k, v]) => { if (v != null) mem.set(k.slice(PREFIX.length), v); });
  } catch {}
  return {
    getItem: k => (mem.has(k) ? mem.get(k) : null),
    setItem(k, v) {
      mem.set(k, String(v));
      AsyncStorage.setItem(PREFIX + k, String(v)).catch(() => {});
    },
    removeItem(k) {
      mem.delete(k);
      AsyncStorage.removeItem(PREFIX + k).catch(() => {});
    },
    clear() {
      const keys = [...mem.keys()].map(k => PREFIX + k);
      mem.clear();
      AsyncStorage.multiRemove(keys).catch(() => {});
    }
  };
}
