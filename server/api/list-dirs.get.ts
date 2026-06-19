import { readdirSync, existsSync } from 'node:fs';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const dirPath = (query.path as string) || (process.platform === 'win32' ? 'C:\\' : '/');

  try {
    if (!existsSync(dirPath)) {
      return { path: dirPath, error: "Le dossier n'existe pas", entries: [] };
    }

    const entries = readdirSync(dirPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.') && !entry.name.startsWith('$'))
      .map((entry) => ({ name: entry.name, isDirectory: true }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { path: dirPath, entries };
  } catch (err: unknown) {
    return { path: dirPath, error: err instanceof Error ? err.message : 'Erreur inconnue', entries: [] };
  }
});
