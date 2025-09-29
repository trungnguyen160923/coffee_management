// Helper functions để làm việc với localStorage một cách an toàn

export function getLocalStorageItem(key: string): string | null {
  try {
    const item = localStorage.getItem(key);
    // Kiểm tra xem item có phải là valid không
    if (item === null || item === 'undefined' || item === 'null' || item === '') {
      return null;
    }
    return item;
  } catch (error) {
    console.error(`Error getting localStorage item ${key}:`, error);
    return null;
  }
}

export function setLocalStorageItem(key: string, value: any): void {
  try {
    if (value === null || value === undefined) {
      localStorage.removeItem(key);
    } else {
      if (typeof value === 'string') {
        localStorage.setItem(key, value);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    }
  } catch (error) {
    console.error(`Error setting localStorage item ${key}:`, error);
  }
}

export function getLocalStorageJSON<T>(key: string): T | null {
  try {
    const item = getLocalStorageItem(key);
    if (item === null) {
      return null;
    }
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error parsing localStorage JSON ${key}:`, error);
    // Clear invalid data
    localStorage.removeItem(key);
    return null;
  }
}

export function clearLocalStorageItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error clearing localStorage item ${key}:`, error);
  }
}

export function clearAllAuthData(): void {
  clearLocalStorageItem('coffee-user');
  clearLocalStorageItem('coffee-token');
  clearLocalStorageItem('coffee-refresh');
}
