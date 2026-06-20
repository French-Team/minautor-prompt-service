import { readdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

interface DriveInfo {
  name: string;
  volumeName: string;
  driveType: number;
  isDirectory: boolean;
}

function getWindowsDrives(): DriveInfo[] {
  try {
    // wmic logicaldisk get name,volumename,drivetype /format:csv
    // Sortie typique :
    //   Node,DriveType,Name,VolumeName
    //   HOSTNAME,3,C:,Windows
    //   HOSTNAME,4,Z:,NetworkShare
    const raw = execSync('wmic logicaldisk get name,volumename,drivetype /format:csv', {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'ignore'],
    });

    // Nettoyer le BOM UTF-16 éventuel et normaliser les fins de ligne
    const clean = raw.replace(/^\uFEFF/, '').replace(/\r?\n/g, '\n');
    const lines = clean.split('\n').filter(Boolean);

    const drives: DriveInfo[] = [];
    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length < 4) continue;
      const name = (parts[2] || '').trim();
      // Ignorer la ligne d'en-tête (Name == 'Name') ou les lignes mal formées
      if (!name || name === 'Name' || !/^[A-Za-z]:$/.test(name)) continue;
      const driveType = parseInt(parts[1], 10);
      // Exclure les disques réseau (type 4)
      if (driveType === 4) continue;
      const volumeName = (parts[3] || '').trim();
      drives.push({ name, volumeName, driveType, isDirectory: true });
    }
    return drives.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    // Fallback : simple détection A-Z sans nom
    const drives: DriveInfo[] = [];
    for (let i = 65; i <= 90; i++) {
      const letter = String.fromCharCode(i);
      const drivePath = `${letter}:\\`;
      try {
        if (existsSync(drivePath)) {
          drives.push({ name: `${letter}:`, volumeName: '', driveType: 3, isDirectory: true });
        }
      } catch {
        /* ignore */
      }
    }
    return drives;
  }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const dirPath = (query.path as string) || (process.platform === 'win32' ? '__drives__' : '/');

  try {
    // Niveau virtuel : liste des disques Windows
    if (dirPath === '__drives__') {
      if (process.platform !== 'win32') {
        return { path: '__drives__', entries: [{ name: '/', isDirectory: true }] };
      }
      return { path: '__drives__', entries: getWindowsDrives() };
    }

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
