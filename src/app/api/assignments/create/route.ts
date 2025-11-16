import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { AssignmentData } from '@/types/assignment-builder';

/**
 * POST /api/assignments/create
 * Tạo assignment mới với workflow cải tiến
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const assignmentData: AssignmentData = await request.json();
    console.log(`[CreateAssignment] Processing request for user ${session.user.id}:`, {
      type: assignmentData.type,
      title: assignmentData.title,
      subject: assignmentData.subject
    });

    // Validation
    if (!assignmentData.title?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Tên bài tập là bắt buộc' },
        { status: 400 }
      );
    }

    if (!assignmentData.type || !['ESSAY', 'QUIZ'].includes(assignmentData.type)) {
      return NextResponse.json(
        { success: false, message: 'Loại bài tập không hợp lệ' },
        { status: 400 }
      );
    }

    // Content validation
    if (assignmentData.type === 'ESSAY') {
      if (!assignmentData.essayContent?.question?.trim()) {
        return NextResponse.json(
          { success: false, message: 'Câu hỏi tự luận là bắt buộc' },
          { status: 400 }
        );
      }
      if (!assignmentData.essayContent?.dueDate) {
        return NextResponse.json(
          { success: false, message: 'Hạn nộp bài là bắt buộc' },
          { status: 400 }
        );
      }
    } else if (assignmentData.type === 'QUIZ') {
      if (!assignmentData.quizContent?.questions?.length) {
        return NextResponse.json(
          { success: false, message: 'Cần ít nhất 1 câu hỏi trắc nghiệm' },
          { status: 400 }
        );
      }
      if (!assignmentData.quizContent?.lockAt) {
        return NextResponse.json(
          { success: false, message: 'Thời gian đóng bài là bắt buộc' },
          { status: 400 }
        );
      }
    }

    // Prepare assignment data for database
    const assignmentCreateData: any = {
      title: assignmentData.title.trim(),
      description: assignmentData.description?.trim() || null,
      subject: assignmentData.subject?.trim() || null,
      type: assignmentData.type,
      authorId: session.user.id,
    };

    // Essay-specific fields
    if (assignmentData.type === 'ESSAY' && assignmentData.essayContent) {
      assignmentCreateData.openAt = assignmentData.essayContent.openAt || new Date();
      assignmentCreateData.dueDate = assignmentData.essayContent.dueDate;
      assignmentCreateData.submission_format = assignmentData.essayContent.submissionFormat || 'BOTH'; // Fix: use submission_format
    }

    // Quiz-specific fields
    if (assignmentData.type === 'QUIZ' && assignmentData.quizContent) {
      assignmentCreateData.openAt = assignmentData.quizContent.openAt || new Date();
      assignmentCreateData.lockAt = assignmentData.quizContent.lockAt;
      assignmentCreateData.timeLimitMinutes = assignmentData.quizContent.timeLimitMinutes;
      assignmentCreateData.max_attempts = assignmentData.quizContent.maxAttempts || 1; // Fix: use max_attempts
      assignmentCreateData.anti_cheat_config = assignmentData.quizContent.antiCheatConfig || null; // Fix: use anti_cheat_config
    }

    console.log(`[CreateAssignment] Creating assignment with data:`, assignmentCreateData);

    // Create assignment in database
    const assignment = await prisma.assignment.create({
      data: assignmentCreateData,
      include: {
        author: {
          select: {
            id: true,
            fullname: true,
            email: true
          }
        }
      }
    });

    console.log(`[CreateAssignment] Assignment created with ID: ${assignment.id}`);

    // Create question for Essay
    if (assignmentData.type === 'ESSAY' && assignmentData.essayContent?.question) {
      await prisma.question.create({
        data: {
          content: assignmentData.essayContent.question,
          type: 'ESSAY',
          order: 1,
          assignmentId: assignment.id
        }
      });
      console.log(`[CreateAssignment] Created essay question`);
    }

    // Create questions for Quiz
    if (assignmentData.type === 'QUIZ' && assignmentData.quizContent?.questions) {
      const questionsData = assignmentData.quizContent.questions.map((q, index) => ({
        content: q.content,
        type: q.type,
        order: index + 1,
        assignmentId: assignment.id,
        options: {
          create: q.options.map((opt, optIndex) => ({
            label: opt.label,
            content: opt.content,
            isCorrect: opt.isCorrect,
            order: optIndex + 1
          }))
        }
      }));

      await prisma.question.createMany({
        data: questionsData.map(q => ({
          content: q.content,
          type: q.type,
          order: q.order,
          assignmentId: q.assignmentId
        }))
      });

      // Create options separately (due to createMany limitations)
      for (let i = 0; i < questionsData.length; i++) {
        const question = await prisma.question.findFirst({
          where: {
            assignmentId: assignment.id,
            order: i + 1
          }
        });

        if (question) {
          await prisma.option.createMany({
            data: assignmentData.quizContent.questions[i].options.map((opt, optIndex) => ({
              label: opt.label,
              content: opt.content,
              isCorrect: opt.isCorrect,
              order: optIndex + 1,
              questionId: question.id
            }))
          });
        }
      }

      console.log(`[CreateAssignment] Created ${questionsData.length} questions with options`);
    }

    // Create classroom assignments
    if (assignmentData.classrooms && assignmentData.classrooms.length > 0) {
      await prisma.assignmentClassroom.createMany({
        data: assignmentData.classrooms.map((classroomId: string) => ({
          assignmentId: assignment.id,
          classroomId: classroomId
        }))
      });
      console.log(`[CreateAssignment] Assigned to ${assignmentData.classrooms.length} classrooms`);
    }

    // Handle file attachments for Essay (if any)
    if (assignmentData.type === 'ESSAY' && assignmentData.essayContent?.attachments?.length) {
      console.log('[CreateAssignment] Essay attachments raw data:', assignmentData.essayContent.attachments);
      // Filter out invalid files and create file records
      const validFiles = assignmentData.essayContent.attachments.filter((file: any) => 
        file && (file.name || file.fileName || file.originalName)
      );
      
      if (validFiles.length > 0) {
        const fileData = validFiles.map((file: any) => ({
          name: file.name || file.fileName || file.originalName || 'Unknown File',
          path: file.path || file.url || file.src || '', // File path or URL
          size: file.size || 0,
          mimeType: file.type || file.mimeType || 'application/octet-stream',
          assignmentId: assignment.id,
          uploadedById: session.user?.id || '',
          file_type: 'ATTACHMENT' // Essay attachment type
        }));
        
        console.log('[CreateAssignment] File data to create:', fileData);
        
        try {
          await prisma.assignmentFile.createMany({
            data: fileData
          });
          console.log(`[CreateAssignment] Created ${fileData.length} file records for essay`);
        } catch (fileError) {
          console.error('[CreateAssignment] Error creating file records:', fileError);
          // Don't fail the entire assignment creation if file creation fails
        }
      } else {
        console.log('[CreateAssignment] No valid files found in attachments');
      }
    }

    const responseTime = Date.now() - startTime;
    console.log(`[CreateAssignment] Assignment created successfully in ${responseTime}ms`);

    return NextResponse.json({
      success: true,
      message: 'Tạo bài tập thành công',
      data: {
        id: assignment.id,
        title: assignment.title,
        type: assignment.type,
        createdAt: assignment.createdAt,
        author: assignment.author
      }
    });

  } catch (error: unknown) {
    const responseTime = Date.now() - startTime;
    console.error(`[CreateAssignment] Error after ${responseTime}ms:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Lỗi server khi tạo bài tập';

    return NextResponse.json(
      { 
        success: false, 
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}
