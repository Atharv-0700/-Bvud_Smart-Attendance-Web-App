import { storage, database } from '../config/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { ref as dbRef, set, get } from 'firebase/database';

/**
 * Profile Photo Upload Utility
 * 
 * Handles secure profile photo uploads with:
 * - File validation (type, size)
 * - Image compression
 * - Square cropping (1:1 ratio)
 * - Resizing to 256x256px
 * - Firebase Storage upload
 * - Database URL update
 */

// Constants
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const TARGET_SIZE = 256; // 256x256 pixels
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const COMPRESSION_QUALITY = 0.8; // 80% quality

export interface UploadResult {
  success: boolean;
  photoUrl?: string;
  error?: string;
}

/**
 * Validates image file
 */
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload JPG, PNG, or WebP images only.',
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds 2 MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)} MB`,
    };
  }

  return { valid: true };
};

/**
 * Compresses and resizes image to 256x256 square
 */
export const processImage = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Create canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Set canvas to target size
        canvas.width = TARGET_SIZE;
        canvas.height = TARGET_SIZE;

        // Calculate crop dimensions (center crop to square)
        const sourceSize = Math.min(img.width, img.height);
        const sourceX = (img.width - sourceSize) / 2;
        const sourceY = (img.height - sourceSize) / 2;

        // Draw cropped and resized image
        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          sourceSize,
          sourceSize,
          0,
          0,
          TARGET_SIZE,
          TARGET_SIZE
        );

        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          COMPRESSION_QUALITY
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Uploads profile photo to Firebase Storage
 */
export const uploadProfilePhoto = async (
  userId: string,
  role: 'student' | 'teacher' | 'admin',
  file: File
): Promise<UploadResult> => {
  try {
    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Process image (compress, crop, resize)
    const processedImage = await processImage(file);

    // Create storage reference: /profilePhotos/{role}/{userId}.jpg
    const photoRef = storageRef(storage, `profilePhotos/${role}/${userId}.jpg`);

    // Upload to Firebase Storage
    await uploadBytes(photoRef, processedImage, {
      contentType: 'image/jpeg',
      customMetadata: {
        userId,
        role,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Get download URL
    const photoUrl = await getDownloadURL(photoRef);

    // Update user profile in database
    const userRef = dbRef(database, `users/${userId}/profilePhotoUrl`);
    await set(userRef, photoUrl);

    return {
      success: true,
      photoUrl,
    };
  } catch (error: any) {
    console.error('Error uploading profile photo:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload profile photo. Please try again.',
    };
  }
};

/**
 * Deletes profile photo from Firebase Storage and database
 */
export const deleteProfilePhoto = async (
  userId: string,
  role: 'student' | 'teacher' | 'admin'
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Delete from storage
    const photoRef = storageRef(storage, `profilePhotos/${role}/${userId}.jpg`);
    
    try {
      await deleteObject(photoRef);
    } catch (error: any) {
      // Ignore error if file doesn't exist
      if (error.code !== 'storage/object-not-found') {
        throw error;
      }
    }

    // Remove URL from database
    const userRef = dbRef(database, `users/${userId}/profilePhotoUrl`);
    await set(userRef, null);

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting profile photo:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete profile photo.',
    };
  }
};

/**
 * Gets profile photo URL from database
 */
export const getProfilePhotoUrl = async (userId: string): Promise<string | null> => {
  try {
    const userRef = dbRef(database, `users/${userId}/profilePhotoUrl`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    
    return null;
  } catch (error) {
    console.error('Error getting profile photo URL:', error);
    return null;
  }
};

/**
 * Generates a default avatar URL based on user initials
 * This is a fallback when no photo is uploaded
 */
export const getDefaultAvatarUrl = (name: string, role: 'student' | 'teacher' | 'admin'): string => {
  const colors = {
    student: '2563EB', // Primary blue
    teacher: '06B6D4', // Accent cyan
    admin: 'EF4444',   // Red
  };
  
  const initials = name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
  
  // Using UI Avatars API for default avatars
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${colors[role]}&color=fff&size=256&bold=true`;
};
