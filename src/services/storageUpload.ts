import { getDownloadURL, ref, uploadBytesResumable, type UploadTask } from 'firebase/storage';
import { storage } from './firebase';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB

export function sanitizeStorageFilename(originalName: string, extensionOverride?: string): string {
  const base = originalName
    .replace(/\.[^/.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48) || 'asset';
  const ext = extensionOverride || originalName.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${base}-${stamp}-${rand}.${ext}`;
}

/**
 * Optimizes smartphone/desktop images by resizing to a maximum dimension of 1600px
 * and re-encoding via HTMLCanvasElement, which inherently strips EXIF/GPS metadata.
 */
export async function optimizeImageForUpload(file: File): Promise<Blob> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Please choose a JPEG, PNG, or WebP image.');
  }
  if (file.size > MAX_IMAGE_BYTES * 3) {
    throw new Error('Original image is larger than 15 MB. Please select a smaller photo.');
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxDim = 1600;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not initialize image optimizer in this browser.'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Image optimization failed. Please try another file.'));
            return;
          }
          if (blob.size > MAX_IMAGE_BYTES) {
            reject(new Error('Optimized image still exceeds the 5 MB limit.'));
            return;
          }
          resolve(blob);
        },
        outputType,
        0.86,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read the selected image file.'));
    };

    img.src = objectUrl;
  });
}

export interface UploadController {
  cancel: () => void;
  promise: Promise<{ downloadUrl: string; fileName: string }>;
}

export function startResumableUpload(params: {
  file: File;
  folder: 'images' | 'cv' | 'research';
  onProgress: (percent: number) => void;
}): UploadController {
  let activeTask: UploadTask | null = null;
  let cancelled = false;

  const promise = (async () => {
    if (!navigator.onLine) {
      throw new Error(
        'You appear to be offline. The file was not uploaded—please reconnect and select the file again.',
      );
    }

    let payload: Blob = params.file;
    let contentType = params.file.type;
    let fileName = sanitizeStorageFilename(params.file.name);

    if (params.folder === 'images') {
      if (!ALLOWED_IMAGE_TYPES.includes(params.file.type)) {
        throw new Error('Accepted image formats: JPEG, PNG, or WebP.');
      }
      payload = await optimizeImageForUpload(params.file);
      contentType = payload.type || 'image/jpeg';
      const ext = contentType === 'image/png' ? 'png' : 'jpg';
      fileName = sanitizeStorageFilename(params.file.name, ext);
    } else {
      if (params.file.type !== 'application/pdf') {
        throw new Error('Accepted document format: PDF (.pdf) only.');
      }
      if (params.file.size > MAX_PDF_BYTES) {
        throw new Error('PDF exceeds the 10 MB size limit.');
      }
      fileName = sanitizeStorageFilename(params.file.name, 'pdf');
    }

    if (cancelled) {
      throw new Error('Upload cancelled before transfer began.');
    }

    const storageRef = ref(storage, `portfolio/${params.folder}/${fileName}`);
    activeTask = uploadBytesResumable(storageRef, payload, { contentType });

    return await new Promise<{ downloadUrl: string; fileName: string }>((resolve, reject) => {
      activeTask!.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0) {
            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            params.onProgress(pct);
          }
        },
        (error) => {
          if (error.code === 'storage/canceled') {
            reject(new Error('Upload cancelled. Your previous media was not changed.'));
          } else if (error.code === 'storage/unauthorized') {
            reject(new Error('Upload rejected: administrator storage permission is required.'));
          } else {
            reject(
              new Error(
                'Upload interrupted before completion. Check your connection and select the file again to retry.',
              ),
            );
          }
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(activeTask!.snapshot.ref);
            resolve({ downloadUrl, fileName });
          } catch {
            reject(new Error('File uploaded, but retrieving its public URL failed. Please retry.'));
          }
        },
      );
    });
  })();

  return {
    cancel: () => {
      cancelled = true;
      activeTask?.cancel();
    },
    promise,
  };
}
