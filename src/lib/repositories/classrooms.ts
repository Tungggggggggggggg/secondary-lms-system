import { prisma } from "@/lib/prisma";

export async function listClassroomsByOrg(organizationId: string) {
  return prisma.classroom.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, code: true, teacherId: true, createdAt: true },
  });
}


