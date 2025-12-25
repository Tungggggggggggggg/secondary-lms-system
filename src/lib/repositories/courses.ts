import { prisma } from "@/lib/prisma";

export async function listCoursesByOrg(organizationId: string) {
  return prisma.course.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, authorId: true, createdAt: true },
  });
}


