// src/lib/firebase/storage.ts
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './config';

/**
 * Compress image using Canvas API (client-side)
 * Reduces file size while maintaining quality
 */
async function compressImage(file: File, maxWidth = 1920, quality = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = document.createElement('img');
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize if image is too large
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file); // Fallback to original
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file); // Fallback to original
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = () => resolve(file); // Fallback to original
      img.src = e.target?.result as string;
    };

    reader.onerror = () => resolve(file); // Fallback to original
    reader.readAsDataURL(file);
  });
}

export async function uploadFile(
  path: string, 
  file: File, 
  metadata?: { contentType?: string }
): Promise<string> {
  // Validate file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (file.type.startsWith('image/') && !validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only JPG, PNG, WEBP, and GIF are allowed.');
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error('File too large. Maximum size is 5MB.');
  }

  try {
    // Compress image before upload if it's an image file
    const fileToUpload = file.type.startsWith('image/') 
      ? await compressImage(file) 
      : file;

    const storageRef = ref(storage, path);
    const uploadMetadata = {
      ...metadata,
      cacheControl: 'public, max-age=31536000', // Cache for 1 year
    };

    await uploadBytes(storageRef, fileToUpload, uploadMetadata);
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file');
  }
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const fileName = `${Date.now()}_${file.name}`;
  const path = `avatars/${userId}/${fileName}`;
  return uploadFile(path, file, { contentType: file.type });
}

export async function uploadPollImage(pollId: string, file: File): Promise<string> {
  const fileName = `${Date.now()}_${file.name}`;
  const path = `polls/${pollId}/${fileName}`;
  return uploadFile(path, file, { contentType: file.type });
}

export async function uploadBanner(file: File): Promise<string> {
  const fileName = `banner_${Date.now()}_${file.name}`;
  const path = `banners/${fileName}`;
  return uploadFile(path, file, { contentType: file.type });
}

export async function deleteFile(path: string): Promise<void> {
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
}

/**
 * Generate optimized URL for Firebase Storage image
 * @param url - Original Firebase Storage URL
 * @param options - Optimization options (width, height, quality)
 */
export function getOptimizedImageUrl(
  url: string,
  options: { width?: number; height?: number; quality?: number } = {}
): string {
  if (!url?.includes('firebasestorage.googleapis.com')) {
    return url;
  }

  try {
    const urlObj = new URL(url);
    
    if (options.width) {
      urlObj.searchParams.set('w', options.width.toString());
    }
    
    if (options.height) {
      urlObj.searchParams.set('h', options.height.toString());
    }
    
    if (options.quality) {
      urlObj.searchParams.set('q', options.quality.toString());
    }

    return urlObj.toString();
  } catch {
    return url; // Return original if URL parsing fails
  }
}
