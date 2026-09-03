import {
  normalizePortfolioProject,
  type PortfolioProject,
} from '@/lib/portfolio-project';

const DATABASE_NAME = 'portfolio-book-builder';
const STORE_NAME = 'projects';
const STORAGE_KEY = 'portfolio-book-builder:last-project';
const PROJECT_KEY = 'last-project';

function canUseBrowserStorage() {
  return typeof window !== 'undefined';
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, 1);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function loadFromIndexedDb() {
  const database = await openDatabase();

  return new Promise<unknown>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(PROJECT_KEY);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    transaction.oncomplete = () => database.close();
  });
}

async function saveToIndexedDb(project: PortfolioProject) {
  const database = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const request = transaction
      .objectStore(STORE_NAME)
      .put(project, PROJECT_KEY);

    request.onerror = () => reject(request.error);
    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
  });
}

function loadFromLocalStorage() {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  return JSON.parse(stored) as unknown;
}

function saveToLocalStorage(project: PortfolioProject) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
}

export async function loadStoredPortfolioProject() {
  if (!canUseBrowserStorage()) return null;

  try {
    if ('indexedDB' in window) {
      const indexedProject = normalizePortfolioProject(
        await loadFromIndexedDb(),
      );
      if (indexedProject) return indexedProject;
    }
  } catch {
    // Fall back to localStorage below.
  }

  try {
    return normalizePortfolioProject(loadFromLocalStorage());
  } catch {
    return null;
  }
}

export async function saveStoredPortfolioProject(project: PortfolioProject) {
  if (!canUseBrowserStorage()) return;

  const normalizedProject = normalizePortfolioProject(project);
  if (!normalizedProject) {
    throw new Error('Project data is not valid.');
  }

  try {
    if ('indexedDB' in window) {
      await saveToIndexedDb(normalizedProject);
      return;
    }
  } catch {
    // Fall back to localStorage below.
  }

  saveToLocalStorage(normalizedProject);
}
