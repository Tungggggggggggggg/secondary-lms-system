"use client";

import { Mail, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import ClassroomItem from "./ClassroomItem";

interface Classroom {
  id: string;
  name: string;
  code: string;
  icon: string;
  students: Array<{
    id: string;
    fullname: string;
  }>;
}

interface TeacherCardProps {
  teacher: {
    id: string;
    email: string;
    fullname: string;
  };
  classrooms: Classroom[];
  onMessageTeacher: (teacherId: string, classroomId: string, studentId: string) => void;
  sendingKey: string | null;
  className?: string;
}

export default function TeacherCard({
  teacher,
  classrooms,
  onMessageTeacher,
  sendingKey,
  className = "",
}: TeacherCardProps) {
  const initial = teacher.fullname?.charAt(0).toUpperCase() || "T";

  return (
    <Card className={`border-amber-100 hover:shadow-lg hover:border-amber-200 transition-all duration-300 hover:scale-102 group ${className}`}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg transition-transform duration-300 group-hover:scale-110">
            {initial}
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg group-hover:text-amber-700 transition-colors duration-300 flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-600" />
              {teacher.fullname}
            </CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <Mail className="h-3 w-3" />
              {teacher.email}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {classrooms.map((classroom) => (
          <ClassroomItem
            key={classroom.id}
            classroom={classroom}
            teacherId={teacher.id}
            onMessageTeacher={onMessageTeacher}
            sendingKey={sendingKey}
          />
        ))}
      </CardContent>
    </Card>
  );
}
