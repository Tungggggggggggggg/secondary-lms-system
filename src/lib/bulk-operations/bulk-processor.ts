/**
 * Bulk Operations Processor
 * Xử lý tạo lớp học và user hàng loạt với transaction safety
 */

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { 
  BulkClassroomInput, 
  BulkClassroomResult, 
  BulkUserInput, 
  BulkUserResult,
  BulkOperationProgress 
} from "@/types/bulk-operations";
import { 
  validateBulkClassroom,
  normalizeEmail
} from "./validators";
import { 
  generateSecurePassword, 
  generateClassroomCode 
} from "./utils";

// ============================================
// Progress Tracking
// ============================================

const progressStore = new Map<string, BulkOperationProgress>();

export const createProgressTracker = (operationId: string, totalSteps: number): BulkOperationProgress => {
  const progress: BulkOperationProgress = {
    id: operationId,
    type: 'BULK_CLASSROOM_CREATION',
    status: 'PENDING',
    progress: {
      current: 0,
      total: totalSteps,
      percentage: 0
    },
    currentStep: 'Khởi tạo...',
    startedAt: new Date()
  };

  progressStore.set(operationId, progress);
  return progress;
};

export const updateProgress = (
  operationId: string, 
  current: number, 
  step: string
): BulkOperationProgress | null => {
  const progress = progressStore.get(operationId);
  if (!progress) return null;

  progress.progress.current = current;
  progress.progress.percentage = Math.round((current / progress.progress.total) * 100);
  progress.currentStep = step;
  progress.status = current >= progress.progress.total ? 'COMPLETED' : 'IN_PROGRESS';

  if (progress.status === 'COMPLETED') {
    progress.completedAt = new Date();
  }

  progressStore.set(operationId, progress);
  return progress;
};

export const getProgress = (operationId: string): BulkOperationProgress | null => {
  return progressStore.get(operationId) || null;
};

export const setProgressError = (operationId: string, error: string): void => {
  const progress = progressStore.get(operationId);
  if (progress) {
    progress.status = 'FAILED';
    progress.error = error;
    progress.completedAt = new Date();
    progressStore.set(operationId, progress);
  }
};

// ============================================
// User Creation Functions
// ============================================

/**
 * Tạo một user với error handling
 */
export const createSingleUser = async (
  userInput: BulkUserInput,
  organizationId?: string
): Promise<BulkUserResult> => {
  try {
    console.log(`[BULK_PROCESSOR] Creating user: ${userInput.email}`);

    // Kiểm tra user đã tồn tại
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizeEmail(userInput.email) }
    });

    if (existingUser) {
      console.log(`[BULK_PROCESSOR] User already exists: ${userInput.email} (ID: ${existingUser.id})`);
      
      // Nếu có existingUserId, nghĩa là đây là user có sẵn được chọn
      if (userInput.existingUserId) {
        console.log(`[BULK_PROCESSOR] Using existing user: ${userInput.email}`);
        return {
          success: true,
          created: {
            id: existingUser.id,
            email: existingUser.email,
            fullname: existingUser.fullname,
            role: existingUser.role,
            generatedPassword: undefined // Không có password mới
          }
        };
      } else {
        // Nếu không có existingUserId, nghĩa là đang cố tạo user mới nhưng bị trùng
        return {
          success: false,
          error: `Email ${userInput.email} đã tồn tại trong hệ thống`
        };
      }
    }

    // Generate password nếu không có
    const password = userInput.password || generateSecurePassword();
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo user trong transaction
    const result = await prisma.$transaction(async (tx) => {
      // Tạo user
      const user = await tx.user.create({
        data: {
          email: normalizeEmail(userInput.email),
          fullname: userInput.fullname.trim(),
          password: hashedPassword,
          role: 'STUDENT'
        },
        select: {
          id: true,
          email: true,
          fullname: true,
          role: true
        }
      });

      // Thêm vào organization nếu có
      if (organizationId) {
        await tx.organizationMember.create({
          data: {
            organizationId,
            userId: user.id,
            roleInOrg: (['TEACHER','STUDENT','PARENT'].includes(userInput.role as any) ? (userInput.role as any) : 'STUDENT')
          }
        });
      }

      return { user, generatedPassword: userInput.password ? undefined : password };
    });

    console.log(`[BULK_PROCESSOR] User created successfully: ${result.user.id}`);

    return {
      success: true,
      created: {
        id: result.user.id,
        email: result.user.email,
        fullname: result.user.fullname,
        role: result.user.role,
        generatedPassword: result.generatedPassword
      }
    };

  } catch (error) {
    console.error(`[BULK_PROCESSOR] Error creating user ${userInput.email}:`, error);
    
    const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
    return {
      success: false,
      error: `Không thể tạo user ${userInput.email}: ${errorMessage}`
    };
  }
};

/**
 * Tạo nhiều users với batch processing
 */
export const createBulkUsers = async (
  users: BulkUserInput[],
  organizationId?: string,
  onProgress?: (current: number, total: number) => void
): Promise<BulkUserResult[]> => {
  const results: BulkUserResult[] = [];
  
  console.log(`[BULK_PROCESSOR] Creating ${users.length} users`);

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const result = await createSingleUser(user, organizationId);
    results.push(result);

    // Update progress
    if (onProgress) {
      onProgress(i + 1, users.length);
    }

    // Small delay để tránh overwhelm database
    if (i % 10 === 0 && i > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
};


// ============================================
// Classroom Creation
// ============================================

/**
 * Tạo lớp học với giáo viên và học sinh
 */
export const createBulkClassroom = async (
  input: BulkClassroomInput,
  operationId: string
): Promise<BulkClassroomResult> => {
  const startTime = Date.now();
  let currentStep = 0;
  const totalSteps = 4; // Validation, Teacher, Students, Classroom

  try {
    console.log(`[BULK_PROCESSOR] Starting bulk classroom creation: ${input.name}`);

    // Tạo progress tracker
    createProgressTracker(operationId, totalSteps);
    updateProgress(operationId, ++currentStep, 'Đang validate dữ liệu...');

    // Validate input
    const validation = await validateBulkClassroom(input);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    updateProgress(operationId, ++currentStep, 'Đang xử lý giáo viên...');

    // Xử lý teacher
    let teacherId: string;
    let teacherResult: BulkUserResult | undefined;

    if (input.teacherData) {
      // Tạo teacher mới
      const teacherInput: BulkUserInput = {
        email: input.teacherData.email,
        fullname: input.teacherData.fullname,
        role: 'TEACHER',
        password: input.teacherData.password
      };

      teacherResult = await createSingleUser(teacherInput, input.organizationId);
      
      if (!teacherResult.success || !teacherResult.created) {
        throw new Error(`Không thể tạo giáo viên: ${teacherResult.error}`);
      }

      teacherId = teacherResult.created.id;
    } else if (input.teacherEmail) {
      // Sử dụng teacher có sẵn
      const existingTeacher = await prisma.user.findUnique({
        where: { 
          email: normalizeEmail(input.teacherEmail),
          role: 'TEACHER'
        }
      });

      if (!existingTeacher) {
        throw new Error(`Không tìm thấy giáo viên với email: ${input.teacherEmail}`);
      }

      teacherId = existingTeacher.id;
    } else {
      throw new Error('Phải cung cấp thông tin giáo viên');
    }

    updateProgress(operationId, ++currentStep, 'Đang tạo học sinh...');

    // Tạo students
    console.log(`[BULK_PROCESSOR] Students input:`, input.students.map(s => ({ 
      email: s.email, 
      existingUserId: s.existingUserId 
    })));
    
    const studentResults = await createBulkUsers(
      input.students,
      input.organizationId,
      (current, total) => {
        const stepProgress = currentStep + (current / total) * 0.5;
        updateProgress(operationId, stepProgress, `Đang tạo học sinh ${current}/${total}...`);
      }
    );

    console.log(`[BULK_PROCESSOR] Student results:`, studentResults.map(r => ({
      success: r.success,
      error: r.error,
      email: r.created?.email
    })));

    const successfulStudents = studentResults.filter(r => r.success && r.created);
    
    console.log(`[BULK_PROCESSOR] Successful students: ${successfulStudents.length}/${studentResults.length}`);
    
    if (successfulStudents.length === 0) {
      const errors = studentResults.filter(r => !r.success).map(r => r.error).join(', ');
      throw new Error(`Không thể tạo học sinh nào. Lỗi: ${errors}`);
    }

    updateProgress(operationId, ++currentStep, 'Đang tạo lớp học...');

    // Tạo classroom
    const classroomCode = input.code || generateClassroomCode();
    
    // Kiểm tra code trùng lặp
    const existingClassroom = await prisma.classroom.findUnique({
      where: { code: classroomCode }
    });

    if (existingClassroom) {
      throw new Error(`Mã lớp học ${classroomCode} đã tồn tại`);
    }

    // Xử lý organizationId - set null nếu empty string
    const organizationId = input.organizationId && input.organizationId.trim() !== '' 
      ? input.organizationId 
      : null;

    console.log(`[BULK_PROCESSOR] Creating classroom with organizationId: ${organizationId}`);

    const classroom = await prisma.$transaction(async (tx) => {
      // Tạo classroom
      const newClassroom = await tx.classroom.create({
        data: {
          name: input.name.trim(),
          description: input.description?.trim() || '',
          code: classroomCode,
          icon: input.icon || '📚',
          maxStudents: input.maxStudents || 30,
          teacherId: teacherId,
          organizationId: organizationId
        }
      });

      // Thêm students vào classroom
      const classroomStudents = successfulStudents.map(student => ({
        classroomId: newClassroom.id,
        studentId: student.created!.id
      }));

      await tx.classroomStudent.createMany({
        data: classroomStudents
      });

      return newClassroom;
    });

    updateProgress(operationId, ++currentStep, 'Hoàn thành tạo lớp học...');

    // Tính toán kết quả
    const successCount = studentResults.filter(r => r.success).length;
    const errorCount = studentResults.filter(r => !r.success).length;
    const warningCount = validation.warnings.length;
    const duration = Date.now() - startTime;

    // Ghi audit log trước khi tạo result
    try {
      await prisma.auditLog.create({
        data: {
          actorId: teacherId, // Tạm thời dùng teacherId, sẽ được override bởi API
          action: 'BULK_CLASSROOM_CREATE',
          entityType: 'CLASSROOM',
          entityId: classroom.id,
          metadata: {
            classroomName: classroom.name,
            studentsCount: successCount,
            errorsCount: errorCount,
            duration
          },
          organizationId: organizationId // Sử dụng organizationId đã xử lý (có thể null)
        }
      });
      console.log(`[BULK_PROCESSOR] Audit log created successfully`);
    } catch (auditError) {
      console.error(`[BULK_PROCESSOR] Failed to create audit log:`, auditError);
      // Không throw error để không làm fail toàn bộ operation
    }

    const result: BulkClassroomResult = {
      success: true,
      classroom: {
        id: classroom.id,
        name: classroom.name,
        code: classroom.code,
        teacherId: classroom.teacherId
      },
      teacher: teacherResult ? {
        id: teacherResult.created!.id,
        email: teacherResult.created!.email,
        fullname: teacherResult.created!.fullname,
        isNew: true,
        generatedPassword: teacherResult.created!.generatedPassword
      } : undefined,
      students: studentResults,
      parentLinks: [], // Bỏ parent links
      errors: studentResults.filter(r => !r.success).map(r => r.error!),
      warnings: validation.warnings,
      summary: {
        totalProcessed: input.students.length,
        successCount,
        errorCount,
        warningCount,
        duration
      }
    };

    updateProgress(operationId, totalSteps, 'Hoàn thành!');

    console.log(`[BULK_PROCESSOR] Bulk classroom creation completed: ${classroom.id}`);
    return result;

  } catch (error) {
    console.error(`[BULK_PROCESSOR] Error in bulk classroom creation:`, error);
    
    setProgressError(operationId, error instanceof Error ? error.message : 'Lỗi không xác định');

    return {
      success: false,
      students: [],
      parentLinks: [],
      errors: [error instanceof Error ? error.message : 'Lỗi không xác định'],
      warnings: [],
      summary: {
        totalProcessed: input.students?.length || 0,
        successCount: 0,
        errorCount: 1,
        warningCount: 0,
        duration: Date.now() - startTime
      }
    };
  }
};

// ============================================
// Utility Functions
// ============================================

/**
 * Cleanup progress tracking sau khi hoàn thành
 */
export const cleanupProgress = (operationId: string): void => {
  // Giữ progress trong 1 giờ sau khi hoàn thành
  setTimeout(() => {
    progressStore.delete(operationId);
  }, 60 * 60 * 1000);
};

/**
 * Kiểm tra duplicate emails trong database
 */
export const checkDuplicateEmails = async (emails: string[]): Promise<string[]> => {
  const normalizedEmails = emails.map(normalizeEmail);
  
  const existingUsers = await prisma.user.findMany({
    where: {
      email: {
        in: normalizedEmails
      }
    },
    select: { email: true }
  });

  return existingUsers.map(user => user.email);
};

/**
 * Kiểm tra duplicate classroom codes
 */
export const checkDuplicateClassroomCodes = async (codes: string[]): Promise<string[]> => {
  const existingClassrooms = await prisma.classroom.findMany({
    where: {
      code: {
        in: codes.map(code => code.toUpperCase())
      }
    },
    select: { code: true }
  });

  return existingClassrooms.map(classroom => classroom.code);
};
