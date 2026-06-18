import { apiFetch } from './api';

export async function uploadFileInChunks(
  file: File,
  onProgress: (progress: number) => void
): Promise<string> {
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const uploadId = crypto.randomUUID();

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('uploadId', uploadId);
    formData.append('chunkIndex', String(i));
    formData.append('totalChunks', String(totalChunks));
    formData.append('filename', file.name);
    formData.append('mimeType', file.type);

    await apiFetch('/api/files/upload-chunk', {
      method: 'POST',
      body: formData,
    });

    onProgress(((i + 1) / totalChunks) * 100);
  }

  return uploadId;
}
