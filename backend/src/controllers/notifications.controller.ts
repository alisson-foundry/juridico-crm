import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types';

const prisma = new PrismaClient();

export const list = async (req: AuthRequest, res: Response) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.userId },
    include: {
      activity: {
        select: { id: true, title: true, clientId: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return res.json(notifications);
};

export const markRead = async (req: AuthRequest, res: Response) => {
  await prisma.notification.update({
    where: { id: req.params.id, userId: req.user!.userId },
    data: { read: true },
  });
  return res.status(204).send();
};

export const markAllRead = async (req: AuthRequest, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.userId, read: false },
    data: { read: true },
  });
  return res.status(204).send();
};
