// Utility xác định link đang active, hỗ trợ cả route con.
export function isActivePath(pathname: string, href: string): boolean {
  try {
    if (!pathname || !href) return false;
    if (pathname === href) return true;
    const normalized = (v: string) => v.replace(/\/?$/, "");
    const a = normalized(pathname);
    const b = normalized(href);
    if (b === "") return a === "";
    return a === b || a.startsWith(`${b}/`);
  } catch (error) {
    console.error("Sidebar: isActivePath error", { pathname, href, error });
    return false;
  }
}

// Teacher classroom route builders
export const teacherClassroomPath = (classroomId: string) => `/dashboard/teacher/classrooms/${classroomId}`;
export const teacherClassroomAssignmentsPath = (classroomId: string) => `${teacherClassroomPath(classroomId)}/assignments`;
export const teacherClassroomPeoplePath = (classroomId: string) => `${teacherClassroomPath(classroomId)}/people`;
export const teacherClassroomGradesPath = (classroomId: string) => `${teacherClassroomPath(classroomId)}/grades`;
export const teacherAnnouncementDetailPath = (classroomId: string, announcementId: string) => `${teacherClassroomPath(classroomId)}/announcements/${announcementId}`;

// Student class route builders
export const studentClassPath = (classId: string) => `/dashboard/student/classes/${classId}`;
export const studentAnnouncementDetailPath = (classId: string, announcementId: string) => `${studentClassPath(classId)}/announcements/${announcementId}`;

