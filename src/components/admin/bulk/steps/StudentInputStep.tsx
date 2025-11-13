/**
 * Student Input Step - Bước 3 của Wizard
 * Component phức tạp nhất: Upload CSV, nhập thủ công, validation
 */

"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { 
  Upload, 
  FileText, 
  Plus, 
  Trash2, 
  Download,
  AlertCircle,
  CheckCircle,
  Users,
  Copy,
  FileSpreadsheet,
  Mail,
  Search,
  Loader2
} from "lucide-react";
import { WizardData } from "../BulkClassroomWizard";
import { BulkUserInput, CSVImportResult } from "@/types/bulk-operations";
import { processUploadedFile } from "@/lib/bulk-operations/csv-parser";
import { useToast } from "@/hooks/use-toast";

interface StudentInputStepProps {
  data: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

type InputMode = 'upload' | 'manual' | 'paste' | 'existing';

export default function StudentInputStep({
  data,
  onUpdate,
  onNext,
  onPrevious
}: StudentInputStepProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inputMethod, setInputMethod] = useState<InputMode>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationResult, setValidationResult] = useState<CSVImportResult | null>(null);
  const [pasteText, setPasteText] = useState('');
  
  // Existing students selection
  const [existingStudents, setExistingStudents] = useState<any[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [isSearchingStudents, setIsSearchingStudents] = useState(false);
  const [bulkEmailInput, setBulkEmailInput] = useState('');
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Manual input state
  const [newStudent, setNewStudent] = useState<BulkUserInput>({
    email: '',
    fullname: '',
    role: 'STUDENT'
  });

  // ============================================
  // Search Existing Students
  // ============================================

  const searchExistingStudents = async (query: string) => {
    if (!query || query.length < 2) {
      setExistingStudents([]);
      return;
    }

    setIsSearchingStudents(true);
    try {
      const response = await fetch(`/api/admin/system/users?q=${encodeURIComponent(query)}&role=STUDENT&limit=50`);
      const result = await response.json();

      if (response.ok && result.success) {
        setExistingStudents(result.items || []);
      } else {
        setExistingStudents([]);
        toast({
          title: "Lỗi tìm kiếm",
          description: "Không thể tìm kiếm học sinh",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error searching students:', error);
      setExistingStudents([]);
    } finally {
      setIsSearchingStudents(false);
    }
  };


  const handleBulkEmailSearch = async () => {
    if (!bulkEmailInput.trim()) return;

    // Parse emails from input
    const emails = bulkEmailInput
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && line.includes('@'))
      .map(line => {
        // Extract email if line contains other text
        const emailMatch = line.match(/[^\s]+@[^\s]+/);
        return emailMatch ? emailMatch[0] : line;
      });

    if (emails.length === 0) {
      toast({
        title: "Không có email hợp lệ",
        description: "Vui lòng nhập ít nhất một email hợp lệ",
        variant: "destructive"
      });
      return;
    }

    // Use the helper function for direct addition
    await handleBulkEmailSearchWithEmails(emails);
  };

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputMethod === 'existing') {
        searchExistingStudents(studentSearchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [studentSearchQuery, inputMethod]);

  const handleBulkFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('[STUDENT_INPUT] Processing bulk email file:', file.name);

    try {
      setIsSearchingStudents(true);
      
      // Read file content
      const text = await file.text();
      
      // Parse emails from file content
      const emails = text
        .split(/[\n\r,;]+/) // Split by newlines, commas, or semicolons
        .map(line => line.trim())
        .filter(line => line && line.includes('@'))
        .map(line => {
          // Extract email if line contains other text (CSV format, etc.)
          const emailMatch = line.match(/[^\s,;]+@[^\s,;]+/);
          return emailMatch ? emailMatch[0] : line;
        })
        .filter((email, index, arr) => arr.indexOf(email) === index); // Remove duplicates

      if (emails.length === 0) {
        toast({
          title: "Không tìm thấy email",
          description: "File không chứa email hợp lệ nào",
          variant: "destructive"
        });
        return;
      }

      console.log('[STUDENT_INPUT] Parsed emails from file:', emails);

      // Use the same bulk search logic
      setBulkEmailInput(emails.join('\n'));
      
      // Trigger the bulk search with parsed emails
      await handleBulkEmailSearchWithEmails(emails);

    } catch (error) {
      console.error('[STUDENT_INPUT] Error processing bulk file:', error);
      toast({
        title: "Lỗi đọc file",
        description: "Không thể đọc file. Vui lòng thử lại.",
        variant: "destructive"
      });
    } finally {
      // Clear file input
      if (bulkFileInputRef.current) {
        bulkFileInputRef.current.value = '';
      }
    }
  };

  const handleBulkEmailSearchWithEmails = async (emailList: string[]) => {
    console.log('[STUDENT_INPUT] Searching for bulk emails from file:', emailList);
    setIsSearchingStudents(true);

    try {
      // Search for each email
      const searchPromises = emailList.map(async (email) => {
        const response = await fetch(`/api/admin/system/users?q=${encodeURIComponent(email)}&role=STUDENT&limit=1`);
        const result = await response.json();
        
        if (response.ok && result.success && result.items?.length > 0) {
          const student = result.items[0];
          // Exact email match
          if (student.email.toLowerCase() === email.toLowerCase()) {
            return student;
          }
        }
        return null;
      });

      const searchResults = await Promise.all(searchPromises);
      const foundStudents = searchResults.filter(student => student !== null);
      const notFoundEmails = emailList.filter((email, index) => searchResults[index] === null);

      console.log('[STUDENT_INPUT] File search results:', { foundStudents, notFoundEmails });

      if (foundStudents.length > 0) {
        // Auto-add them directly to the main list (no intermediate step)
        const studentsToAdd = foundStudents.map(student => ({
          email: student.email,
          fullname: student.fullname,
          role: 'STUDENT' as const,
          existingUserId: student.id
        }));

        // Check for duplicates in current list
        const currentEmails = new Set((data.students || []).map(s => s.email.toLowerCase()));
        const newStudents = studentsToAdd.filter(s => !currentEmails.has(s.email.toLowerCase()));

        if (newStudents.length > 0) {
          const updatedStudents = [...(data.students || []), ...newStudents];
          onUpdate({ students: updatedStudents });

          toast({
            title: "Upload và thêm học sinh thành công",
            description: `Đã thêm ${newStudents.length} học sinh từ file. ${foundStudents.length - newStudents.length > 0 ? `${foundStudents.length - newStudents.length} học sinh đã có trong danh sách. ` : ''}${notFoundEmails.length > 0 ? `Không tìm thấy ${notFoundEmails.length} email.` : ''}`,
            variant: "success"
          });
        } else {
          toast({
            title: "Không có học sinh mới",
            description: "Tất cả học sinh tìm thấy đã có trong danh sách",
            variant: "default"
          });
        }

        // Clear states
        setBulkEmailInput('');
        setExistingStudents([]);
        setSelectedStudents(new Set());
      } else {
        toast({
          title: "Không tìm thấy học sinh nào",
          description: "Không có email nào trong file khớp với học sinh trong hệ thống",
          variant: "destructive"
        });
      }

      if (notFoundEmails.length > 0) {
        console.log('[STUDENT_INPUT] Not found emails from file:', notFoundEmails);
      }

    } catch (error) {
      console.error('[STUDENT_INPUT] Error in bulk file search:', error);
      toast({
        title: "Lỗi tìm kiếm",
        description: "Không thể tìm kiếm học sinh từ file. Vui lòng thử lại.",
        variant: "destructive"
      });
    } finally {
      setIsSearchingStudents(false);
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    
    if (file) {
      // Create a fake event object for handleBulkFileUpload
      const fakeEvent = {
        target: { files: [file] }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      
      await handleBulkFileUpload(fakeEvent);
    }
  };

  // Remove student from list
  const handleRemoveStudent = (indexToRemove: number) => {
    const updatedStudents = data.students?.filter((_, index) => index !== indexToRemove) || [];
    onUpdate({ students: updatedStudents });
    
    toast({
      title: "Đã xóa học sinh",
      description: "Học sinh đã được xóa khỏi danh sách",
      variant: "success"
    });
  };

  // ============================================
  // File Upload Handlers
  // ============================================

  const handleFileUpload = useCallback(async (file: File) => {
    setIsProcessing(true);
    setValidationResult(null);

    try {
      console.log('[STUDENT_INPUT] Processing file:', file.name);
      
      const result = await processUploadedFile(file, 'STUDENT');
      setValidationResult(result);

      if (result.success && result.data.length > 0) {
        onUpdate({ students: result.data });
        toast({
          title: "Upload thành công!",
          description: `Đã import ${result.data.length} học sinh từ file`,
          variant: "success"
        });
      } else {
        toast({
          title: "Có lỗi trong file",
          description: `${result.errors.length} lỗi cần được sửa`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('[STUDENT_INPUT] File processing error:', error);
      toast({
        title: "Lỗi xử lý file",
        description: error instanceof Error ? error.message : 'Lỗi không xác định',
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [onUpdate, toast]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);


  // ============================================
  // Manual Input Handlers
  // ============================================

  const handleAddStudent = useCallback(() => {
    if (!newStudent.email || !newStudent.fullname) {
      toast({
        title: "Thông tin chưa đầy đủ",
        description: "Email và họ tên là bắt buộc",
        variant: "destructive"
      });
      return;
    }

    // Check duplicate email
    const isDuplicate = data.students.some(s => s.email.toLowerCase() === newStudent.email.toLowerCase());
    if (isDuplicate) {
      toast({
        title: "Email đã tồn tại",
        description: "Email này đã có trong danh sách",
        variant: "destructive"
      });
      return;
    }

    const updatedStudents = [...data.students, { ...newStudent }];
    onUpdate({ students: updatedStudents });

    // Reset form
    setNewStudent({
      email: '',
      fullname: '',
      role: 'STUDENT'
    });

    toast({
      title: "Đã thêm học sinh",
      description: `${newStudent.fullname} đã được thêm vào danh sách`,
      variant: "success"
    });
  }, [newStudent, data.students, onUpdate, toast]);


  // ============================================
  // Paste Text Handler
  // ============================================

  const handlePasteProcess = useCallback(() => {
    if (!pasteText.trim()) return;

    setIsProcessing(true);
    try {
      // Parse paste text as CSV
      const lines = pasteText.trim().split('\n');
      const students: BulkUserInput[] = [];

      lines.forEach((line, index) => {
        const parts = line.split(/[,\t]/).map(p => p.trim());
        if (parts.length >= 2 && parts[0] && parts[1]) {
          students.push({
            email: parts[0],
            fullname: parts[1],
            role: 'STUDENT',
          });
        }
      });

      if (students.length > 0) {
        onUpdate({ students: [...data.students, ...students] });
        setPasteText('');
        toast({
          title: "Đã thêm học sinh",
          description: `${students.length} học sinh đã được thêm từ clipboard`,
          variant: "success"
        });
      } else {
        toast({
          title: "Không có dữ liệu hợp lệ",
          description: "Vui lòng kiểm tra định dạng dữ liệu",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Lỗi xử lý dữ liệu",
        description: "Không thể xử lý dữ liệu từ clipboard",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [pasteText, data.students, data.grade, onUpdate, toast]);

  // ============================================
  // Template Download
  // ============================================

  const handleDownloadTemplate = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/bulk/templates?type=student');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'student-template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      toast({
        title: "Lỗi download",
        description: "Không thể tải template",
        variant: "destructive"
      });
    }
  }, [toast]);

  const isValid = data.students.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-violet-600" />
          Thêm học sinh vào lớp học
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Mode Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Chọn cách thức nhập liệu</Label>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant={inputMethod === 'upload' ? "default" : "outline"}
              onClick={() => setInputMethod('upload')}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload CSV/Excel
            </Button>
            <Button
              type="button"
              variant={inputMethod === 'paste' ? "default" : "outline"}
              onClick={() => setInputMethod('paste')}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Dán từ clipboard
            </Button>
            <Button
              type="button"
              variant={inputMethod === 'manual' ? "default" : "outline"}
              onClick={() => setInputMethod('manual')}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nhập thủ công
            </Button>
            <Button
              type="button"
              variant={inputMethod === 'existing' ? "default" : "outline"}
              onClick={() => setInputMethod('existing')}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Chọn học sinh có sẵn
            </Button>
          </div>
        </div>

        {/* Upload Mode */}
        {inputMethod === 'upload' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Tải template CSV
              </Button>
              <span className="text-sm text-gray-500">
                Tải file mẫu để điền thông tin học sinh
              </span>
            </div>

            {/* Drop Zone */}
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-violet-400 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {isProcessing ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
                  <p className="text-gray-600">Đang xử lý file...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <FileSpreadsheet className="h-12 w-12 text-gray-400" />
                  <div>
                    <p className="text-lg font-medium">Kéo thả file vào đây</p>
                    <p className="text-gray-500">hoặc click để chọn file CSV/Excel</p>
                  </div>
                  <Badge variant="outline">CSV, XLSX, XLS</Badge>
                </div>
              )}
            </div>

            {/* Validation Results */}
            {validationResult && (
              <div className="space-y-3">
                {validationResult.success ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      ✅ Import thành công {validationResult.data.length} học sinh
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      ❌ Có {validationResult.errors.length} lỗi trong file
                    </AlertDescription>
                  </Alert>
                )}

                {validationResult.errors.length > 0 && (
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {validationResult.errors.slice(0, 10).map((error, index) => (
                      <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        Dòng {error.row}: {error.message}
                      </div>
                    ))}
                    {validationResult.errors.length > 10 && (
                      <p className="text-sm text-gray-500">
                        ... và {validationResult.errors.length - 10} lỗi khác
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Paste Mode */}
        {inputMethod === 'paste' && (
          <div className="space-y-4">
            <Alert>
              <Copy className="h-4 w-4" />
              <AlertDescription>
                Dán dữ liệu từ Excel/Google Sheets. Định dạng: Email, Họ tên (mỗi dòng một học sinh)
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="paste-data">Dán dữ liệu vào đây</Label>
              <Textarea
                id="paste-data"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="hocsinh1@example.com	Nguyễn Văn A
hocsinh2@example.com	Trần Thị B"
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            <Button
              onClick={handlePasteProcess}
              disabled={!pasteText.trim() || isProcessing}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Thêm từ clipboard
            </Button>
          </div>
        )}

        {/* Manual Mode */}
        {inputMethod === 'manual' && (
          <div className="space-y-4">
            <Alert>
              <Plus className="h-4 w-4" />
              <AlertDescription>
                Thêm từng học sinh một cách thủ công. Email và họ tên là bắt buộc.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="student-email">Email học sinh *</Label>
                <Input
                  id="student-email"
                  type="email"
                  value={newStudent.email}
                  onChange={(e) => setNewStudent({...newStudent, email: e.target.value})}
                  placeholder="hocsinh@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="student-fullname">Họ và tên *</Label>
                <Input
                  id="student-fullname"
                  value={newStudent.fullname}
                  onChange={(e) => setNewStudent({...newStudent, fullname: e.target.value})}
                  placeholder="Nguyễn Văn A"
                />
              </div>


            </div>

            <Button
              onClick={handleAddStudent}
              disabled={!newStudent.email || !newStudent.fullname}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Thêm học sinh
            </Button>
          </div>
        )}

        {/* Existing Students Mode */}
        {inputMethod === 'existing' && (
          <div className="space-y-4">
            <Alert>
              <Users className="h-4 w-4" />
              <AlertDescription>
                Tìm kiếm và chọn học sinh đã có tài khoản trong hệ thống để thêm vào lớp học.
              </AlertDescription>
            </Alert>

            {/* Search Input */}
            <div className="space-y-2">
              <Label htmlFor="student-search">Tìm kiếm học sinh</Label>
              <Input
                id="student-search"
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                placeholder="Nhập tên hoặc email học sinh..."
                className="w-full"
              />
            </div>

            {/* Bulk Email Input */}
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Upload danh sách email học sinh</span>
                  </div>
                  <div className="text-xs text-blue-600">
                    Hỗ trợ: .txt, .csv, .xlsx
                  </div>
                </div>
                
                {/* Drag & Drop Zone */}
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                    isDragOver 
                      ? 'border-blue-400 bg-blue-100' 
                      : 'border-blue-300 hover:border-blue-400 hover:bg-blue-100'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => bulkFileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-blue-700 font-medium">
                    {isDragOver ? 'Thả file vào đây' : 'Kéo thả file hoặc click để chọn'}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Hỗ trợ: .txt, .csv, .xlsx (danh sách email học sinh có sẵn)
                  </p>
                </div>
                
                {/* Hidden file input */}
                <input
                  ref={bulkFileInputRef}
                  type="file"
                  accept=".txt,.csv,.xlsx,.xls"
                  onChange={handleBulkFileUpload}
                  className="hidden"
                />
              </div>
            </Card>

            {/* Search Results */}
            {isSearchingStudents && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Đang tìm kiếm...</p>
              </div>
            )}


            {studentSearchQuery.length >= 2 && !isSearchingStudents && existingStudents.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>Không tìm thấy học sinh nào</p>
                <p className="text-sm">Thử tìm kiếm với từ khóa khác</p>
              </div>
            )}

            {studentSearchQuery.length < 2 && (
              <div className="text-center py-8 text-gray-400">
                <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>Nhập ít nhất 2 ký tự để tìm kiếm</p>
              </div>
            )}
          </div>
        )}

        {/* Students List */}
        {data.students.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Danh sách học sinh ({data.students.length})
              </Label>
              <Button
                variant="outline"
                size="default"
                onClick={() => onUpdate({ students: [] })}
                className="text-red-600 hover:text-red-700"
              >
                Xóa tất cả
              </Button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {data.students.map((student, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                >
                  <div className="flex-1">
                    <p className="font-medium">{student.fullname}</p>
                    <p className="text-sm text-gray-500">{student.email}</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => handleRemoveStudent(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1 text-sm border-red-200"
                    title="Xóa học sinh"
                  >
                    🗑️ Xóa
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Validation Summary */}
        {!isValid && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-600">
              ⚠️ Vui lòng thêm ít nhất một học sinh
            </p>
          </div>
        )}

        {isValid && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-600">
              ✅ Đã có {data.students.length} học sinh trong danh sách
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
