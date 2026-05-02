import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function createAuditLog(
  userId: string,
  action: string,
  entity: string,
  entityId: string,
  changes?: object,
  activityId?: string,
) {
  await prisma.auditLog.create({
    data: { userId, action, entity, entityId, changes, activityId },
  });
}
