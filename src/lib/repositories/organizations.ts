import { prisma } from "@/lib/prisma";

export async function isUserInOrganization(userId: string, organizationId: string): Promise<boolean> {
  const m = await prisma.organizationMember.findFirst({
    where: { userId, organizationId },
    select: { id: true },
  });
  return !!m;
}

export async function listOrgMembers(organizationId: string) {
  return prisma.organizationMember.findMany({
    where: { organizationId },
    select: {
      id: true,
      roleInOrg: true,
      user: { select: { id: true, email: true, fullname: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}


