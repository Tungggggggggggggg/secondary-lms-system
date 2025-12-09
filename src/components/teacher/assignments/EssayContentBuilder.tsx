"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText, Image as ImageIcon, Video, X, Calendar, CheckCircle, ClipboardList } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Import Types
import { SubmissionFormat } from '@/types/assignment-builder';
import { SubmissionFormatSelector } from "@/components/shared";
import { EssayScheduleSection } from "@/components/shared";
import { UploadArea } from "@/components/shared";
import { EssayQuestionEditor } from "@/components/shared";

interface EssayContent {
  question: string;
  attachments?: File[];
  submissionFormat: SubmissionFormat;
  openAt?: Date;
  dueDate?: Date;
}

interface EssayContentBuilderProps {
  content?: EssayContent;
  onContentChange: (content: EssayContent) => void;
  assignmentId?: string;
}

/**
 * Essay Content Builder - Đơn giản và trực quan
 * Theo đề xuất user: chỉ cần question + file upload + timing
 */
export default function EssayContentBuilder({ content, onContentChange, assignmentId }: EssayContentBuilderProps) {
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  type ServerAttachment = { id: string; name: string; size: number; mimeType: string; url: string | null; createdAt: string };
  const [serverFiles, setServerFiles] = useState<ServerAttachment[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchServerFiles = useCallback(async () => {
    if (!assignmentId) return;
    try {
      setLoadingFiles(true);
      const res = await fetch(`/api/assignments/${assignmentId}/files`);
      const data = await res.json();
      if (data?.success) setServerFiles(data.data || []);
    } catch (err) {
      console.error('[EssayAttachment] Fetch files error:', err);
    } finally {
      setLoadingFiles(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    if (assignmentId) fetchServerFiles();
  }, [assignmentId, fetchServerFiles]);

  const handleServerUpload = useCallback(async (files: FileList | null) => {
    if (!assignmentId || !files || files.length === 0) return;
    try {
      setUploading(true);
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(`/api/assignments/${assignmentId}/upload`, { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok || !data?.success) {
          toast({ title: data?.message || 'Tải lên thất bại', variant: 'destructive' });
          break;
        }
      }
      await fetchServerFiles();
      toast({ title: 'Đã tải lên file', variant: 'success' });
    } catch (err) {
      console.error('[EssayAttachment] Upload error:', err);
      toast({ title: 'Lỗi khi tải lên', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }, [assignmentId, fetchServerFiles, toast]);

  const handleDeleteServerFile = useCallback(async (fileId: string) => {
    if (!assignmentId) return;
    try {
      setDeletingId(fileId);
      const res = await fetch(`/api/assignments/${assignmentId}/files?fileId=${fileId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        toast({ title: data?.message || 'Xoá file thất bại', variant: 'destructive' });
        return;
      }
      setServerFiles(prev => prev.filter(f => f.id !== fileId));
      toast({ title: 'Đã xoá file', variant: 'success' });
    } catch (err) {
      console.error('[EssayAttachment] Delete error:', err);
      toast({ title: 'Lỗi khi xoá file', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  }, [assignmentId, toast]);

  // Initialize default content
  const defaultContent: EssayContent = useMemo(() => ({
    question: '',
    attachments: [],
    submissionFormat: 'BOTH',
    openAt: undefined,
    dueDate: undefined
  }), []);

  const currentContent: EssayContent = content ?? defaultContent;

  // Update handlers
  const updateQuestion = useCallback((question: string) => {
    onContentChange({
      ...currentContent,
      question
    });
  }, [currentContent, onContentChange]);

  const updateSubmissionFormat = useCallback((format: SubmissionFormat) => {
    onContentChange({
      ...currentContent,
      submissionFormat: format
    });
  }, [currentContent, onContentChange]);

  const updateTiming = useCallback((field: 'openAt' | 'dueDate', date: Date | undefined) => {
    onContentChange({
      ...currentContent,
      [field]: date
    });
  }, [currentContent, onContentChange]);

  // File upload handlers
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const newFiles = Array.from(files).filter(file => {
      // Validate file types
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/gif',
        'video/mp4'
      ];
      
      // Max 10MB per file
      const maxSize = 10 * 1024 * 1024;
      
      return allowedTypes.includes(file.type) && file.size <= maxSize;
    });

    const updatedAttachments = [...(currentContent.attachments || []), ...newFiles];
    
    onContentChange({
      ...currentContent,
      attachments: updatedAttachments
    });
  }, [currentContent, onContentChange]);

  const removeFile = useCallback((index: number) => {
    const updatedAttachments = currentContent.attachments?.filter((_, i) => i !== index) || [];
    onContentChange({
      ...currentContent,
      attachments: updatedAttachments
    });
  }, [currentContent, onContentChange]);

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  // File icon helper
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    if (file.type.startsWith('video/')) return <Video className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Nội Dung Bài Tập Tự Luận
        </h2>
        <p className="text-gray-600">
          Tạo câu hỏi và đính kèm tài liệu cho học sinh
        </p>
      </div>

      {/* Question Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Câu hỏi bài tập
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <EssayQuestionEditor
            value={currentContent.question}
            onChange={updateQuestion}
            minChars={5}
            maxChars={5000}
          />
        </CardContent>
      </Card>

      {/* File Upload */}
      {assignmentId ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Quản lý tệp đính kèm (trên hệ thống)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Hỗ trợ PDF/DOC/DOCX/Ảnh/MP4. Tối đa 20MB/file.</div>
              <div>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.mp4"
                  onChange={(e) => handleServerUpload(e.target.files)}
                  className="hidden"
                  id="server-file-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading}
                  onClick={() => document.getElementById('server-file-upload')?.click()}
                >
                  {uploading ? 'Đang tải...' : 'Tải lên file mới'}
                </Button>
              </div>
            </div>

            {/* Server Files List */}
            <div>
              {loadingFiles ? (
                <div className="text-sm text-gray-500">Đang tải danh sách tệp...</div>
              ) : serverFiles.length === 0 ? (
                <div className="text-sm text-gray-500">Chưa có tệp đính kèm.</div>
              ) : (
                <div className="space-y-2">
                  {serverFiles.map((f) => (
                    <div key={f.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {f.mimeType?.startsWith('image/') ? <ImageIcon className="w-4 h-4" /> : f.mimeType?.startsWith('video/') ? <Video className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        <div>
                          {f.url ? (
                            <a href={f.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sm text-blue-600 hover:underline">{f.name}</a>
                          ) : (
                            <p className="font-medium text-sm">{f.name}</p>
                          )}
                          <p className="text-xs text-gray-500">{formatFileSize(f.size)} • {new Date(f.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        className="text-red-500 hover:text-red-700"
                        disabled={deletingId === f.id}
                        onClick={() => handleDeleteServerFile(f.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Đính kèm tài liệu (tùy chọn)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UploadArea
              value={currentContent.attachments || []}
              onChange={(files) => onContentChange({ ...currentContent, attachments: files })}
            />
          </CardContent>
        </Card>
      )}

      {/* Submission Format */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Định dạng nộp bài
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SubmissionFormatSelector
            value={currentContent.submissionFormat}
            onChange={updateSubmissionFormat}
          />
        </CardContent>
      </Card>

      {/* Timing Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Thời gian
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <EssayScheduleSection
            openAt={currentContent.openAt}
            dueDate={currentContent.dueDate}
            onChange={(next) => {
              onContentChange({
                ...currentContent,
                openAt: next.openAt,
                dueDate: next.dueDate,
              });
            }}
          />
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="bg-blue-50 p-6 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          <span>Tóm tắt bài tập</span>
        </h3>
        <div className="space-y-1 text-sm text-blue-700">
          <p className="flex items-center gap-1">• <strong>Câu hỏi:</strong> {currentContent.question ? 'Đã nhập' : 'Chưa nhập'}</p>
          <p>• <strong>File đính kèm:</strong> {currentContent.attachments?.length || 0} file</p>
          <p>• <strong>Định dạng nộp:</strong> {
            currentContent.submissionFormat === 'TEXT' ? 'Văn bản' :
            currentContent.submissionFormat === 'FILE' ? 'File' : 'Cả hai'
          }</p>
          <p>• <strong>Thời gian:</strong> {
            currentContent.openAt && currentContent.dueDate 
              ? `${currentContent.openAt.toLocaleDateString()} - ${currentContent.dueDate.toLocaleDateString()}`
              : 'Chưa thiết lập'
          }</p>
        </div>
      </div>
    </div>
  );
}
