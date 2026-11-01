/** 清除目前網站來源（origin）的所有 localStorage 項目。 */
export function clearAllLocalStorage(storage = localStorage) {
  storage.clear();
}
