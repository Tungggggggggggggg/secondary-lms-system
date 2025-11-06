import { prisma } from "@/lib/prisma";

export async function listAssignmentsByOrg(organizationId: string) {
  return prisma.assignment.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, authorId: true, createdAt: true },
  });
}


