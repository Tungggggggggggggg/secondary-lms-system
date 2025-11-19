/**
 * Supabase File Upload Utilities
 * Xử lý upload file cho Assignment attachments
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

export interface FileUploadOptions {
  bucket?: string;
  folder?: string;
  maxSize?: number; // bytes
  allowedTypes?: string[];
}

/**
 * Upload file to Supabase Storage
 */
export async function uploadAssignmentFile(
  file: File,
  assignmentId: string,
  options: FileUploadOptions = {}
): Promise<UploadResult> {
  try {
    const {
      bucket = 'assignments',
      folder = 'attachments',
      maxSize = 10 * 1024 * 1024, // 10MB
      allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/gif',
        'video/mp4'
      ]
    } = options;

    // Validate file size
    if (file.size > maxSize) {
      return {
        success: false,
        error: `File quá lớn. Tối đa ${Math.round(maxSize / 1024 / 1024)}MB`
      };
    }

    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: 'Định dạng file không được hỗ trợ'
      };
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${timestamp}_${randomString}.${fileExtension}`;
    
    // Create file path
    const filePath = `${folder}/${assignmentId}/${fileName}`;

    console.log(`[SupabaseUpload] Uploading file: ${file.name} -> ${filePath}`);

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('[SupabaseUpload] Upload error:', error);
      return {
        success: false,
        error: `Lỗi upload: ${error.message}`
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    console.log(`[SupabaseUpload] Upload successful: ${urlData.publicUrl}`);

    return {
      success: true,
      url: urlData.publicUrl,
      path: filePath
    };

  } catch (error) {
    console.error('[SupabaseUpload] Unexpected error:', error);
    return {
      success: false,
      error: 'Lỗi không xác định khi upload file'
    };
  }
}

// Upload file phục vụ chat, dùng bucket riêng "chat-files" với folder "chat"
export async function uploadChatFile(
  file: File,
  conversationId: string,
  options: FileUploadOptions = {}
): Promise<UploadResult> {
  return uploadAssignmentFile(file, conversationId, {
    bucket: options.bucket ?? "chat-files",
    folder: options.folder ?? "chat",
    maxSize: options.maxSize,
    allowedTypes: options.allowedTypes,
  });
}

/**
 * Upload multiple files
 */
export async function uploadMultipleFiles(
  files: File[],
  assignmentId: string,
  options: FileUploadOptions = {}
): Promise<UploadResult[]> {
  console.log(`[SupabaseUpload] Uploading ${files.length} files for assignment ${assignmentId}`);
  
  const uploadPromises = files.map(file => 
    uploadAssignmentFile(file, assignmentId, options)
  );

  const results = await Promise.all(uploadPromises);
  
  const successCount = results.filter(r => r.success).length;
  console.log(`[SupabaseUpload] Upload completed: ${successCount}/${files.length} successful`);
  
  return results;
}

/**
 * Delete file from Supabase Storage
 */
export async function deleteAssignmentFile(
  filePath: string,
  bucket: string = 'assignments'
): Promise<boolean> {
  try {
    console.log(`[SupabaseUpload] Deleting file: ${filePath}`);

    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error('[SupabaseUpload] Delete error:', error);
      return false;
    }

    console.log(`[SupabaseUpload] File deleted successfully: ${filePath}`);
    return true;

  } catch (error) {
    console.error('[SupabaseUpload] Unexpected delete error:', error);
    return false;
  }
}

// Lấy public URL cho file chat dựa trên storage path (bucket mặc định: chat-files)
export function getChatFileUrl(
  storagePath: string,
  bucket: string = 'chat-files'
): string {
  if (!storagePath) return '#';
  const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * Get file info from Supabase Storage
 */
export async function getFileInfo(
  filePath: string,
  bucket: string = 'assignments'
) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(filePath.split('/').slice(0, -1).join('/'), {
        search: filePath.split('/').pop()
      });

    if (error) {
      console.error('[SupabaseUpload] Get file info error:', error);
      return null;
    }

    return data?.[0] || null;

  } catch (error) {
    console.error('[SupabaseUpload] Unexpected error getting file info:', error);
    return null;
  }
}

/**
 * Create storage bucket if not exists
 */
export async function ensureBucketExists(bucketName: string = 'assignments') {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);

    if (!bucketExists) {
      console.log(`[SupabaseUpload] Creating bucket: ${bucketName}`);
      
      const { error } = await supabase.storage.createBucket(bucketName, {
        public: true,
        allowedMimeTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/jpeg',
          'image/png',
          'image/gif',
          'video/mp4'
        ],
        fileSizeLimit: 10 * 1024 * 1024 // 10MB
      });

      if (error) {
        console.error('[SupabaseUpload] Create bucket error:', error);
        return false;
      }

      console.log(`[SupabaseUpload] Bucket created successfully: ${bucketName}`);
    }

    return true;

  } catch (error) {
    console.error('[SupabaseUpload] Unexpected error ensuring bucket:', error);
    return false;
  }
}
