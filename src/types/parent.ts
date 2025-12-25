export interface Student {
  id: string;
  email: string;
  fullname: string;
  role: string;
}

export interface ParentStudentRelationship {
  id: string;
  studentId: string;
  createdAt: string;
  student: Student;
}
