import { Directory, File, Paths } from 'expo-file-system';

export async function persistShiftVideo(cacheUri: string, gameId: string, shiftId: string): Promise<{ uri: string; storage: 'document' | 'cache' }> {
  try {
    const directory = new Directory(Paths.document, 'shift-videos');
    if (!directory.exists) directory.create({ idempotent: true, intermediates: true });
    const source = new File(cacheUri);
    const destination = new File(directory, `${safeName(gameId)}-${safeName(shiftId)}.mp4`);
    await source.move(destination, { overwrite: true });
    return { uri: destination.uri, storage: 'document' };
  } catch {
    return { uri: cacheUri, storage: 'cache' };
  }
}

export function shiftVideoExists(uri: string): boolean {
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

function safeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}
