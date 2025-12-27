/**
 * Supabase File Upload Utilities
 * Xử lý upload file cho Assignment attachments
 */


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

function publicUrlForStored(params: { bucket: string; path: string }): string {
  const { bucket, path } = params;
  console.warn(
    "[SupabaseUpload] publicUrlForStored is disabled. Use signed URLs from server APIs instead.",
    { bucket, path }
  );
  return "#";
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

    return {
      success: true,
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
  try {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/chat/conversations/${conversationId}/attachments`, {
      method: "POST",
      body: fd,
    });
    const json: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const msg =
        typeof (json as { message?: unknown } | null)?.message === "string"
          ? (json as { message: string }).message
          : "Upload failed";
      return { success: false, error: msg };
    }
    const data = (json as { data?: unknown } | null)?.data;
    if (!data || typeof data !== "object") {
      return { success: false, error: "Upload failed" };
    }
    const path = (data as { path?: unknown }).path;
    if (typeof path !== "string" || !path) {
      return { success: false, error: "Upload failed" };
    }
    return { success: true, path };
  } catch (error) {
    console.error("[SupabaseUpload] Unexpected error:", error);
    return { success: false, error: "Lỗi không xác định khi upload file" };
  }
}

// Upload file phục vụ lesson attachments, tái sử dụng bucket "assignments" với folder "lessons"
export async function uploadLessonFile(
  file: File,
  lessonId: string,
  options: FileUploadOptions = {}
): Promise<UploadResult> {
  return uploadAssignmentFile(file, lessonId, {
    bucket: options.bucket ?? "assignments",
    // Đặt dưới thư mục attachments/lessons để tận dụng cùng chính sách RLS với assignment files
    folder: options.folder ?? "attachments/lessons",
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

    const res = await fetch(`/api/storage/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bucket, path: filePath }),
    });
    return res.ok;

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
  return publicUrlForStored({ bucket, path: storagePath });
}

/**
 * Get file info from Supabase Storage
 */
export async function getFileInfo(
  filePath: string,
  bucket: string = 'assignments'
) {
  try {
    console.warn(
      '[SupabaseUpload] getFileInfo is not supported client-side anymore. Use a server API to query storage metadata.',
      { bucket, filePath }
    );
    return null;

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
    console.warn(
      '[SupabaseUpload] ensureBucketExists is not supported client-side anymore. Bucket provisioning must be done server-side.',
      { bucketName }
    );
    return false;

  } catch (error) {
    console.error('[SupabaseUpload] Unexpected error ensuring bucket:', error);
    return false;
  }
}
