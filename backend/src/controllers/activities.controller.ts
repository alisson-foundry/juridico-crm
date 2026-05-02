import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types';
import { createAuditLog } from '../middleware/audit';

const prisma = new PrismaClient();

export const listByClient = async (req: AuthRequest, res: Response) => {
  const { status } = req.query;
  const activities = await prisma.activity.findMany({
    where: {
      clientId: req.params.clientId,
      ...(status ? { status: status as any } : {}),
    },
    include: {
      createdBy: { select: { name: true } },
      files: true,
    },
    orderBy: { date: 'desc' },
  });
  return res.json(activities);
};

export const create = async (req: AuthRequest, res: Response) => {
  const { clientId } = req.params;
  const { title, description, date, responsible, status } = req.body;

  if (!title || !date || !responsible)
    return res.status(400).json({ message: 'Campos obrigatórios ausentes.' });

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return res.status(404).json({ message: 'Cliente não encontrado.' });

  const activity = await prisma.activity.create({
    data: {
      title,
      description,
      date: new Date(date),
      responsible,
      status: status || 'PENDING',
      clientId,
      createdById: req.user!.userId,
    },
    include: { createdBy: { select: { name: true } }, files: true },
  });

  await createAuditLog(req.user!.userId, 'CREATE', 'Activity', activity.id, undefined, activity.id);

  // Notify all users about the new activity
  const users = await prisma.user.findMany({ where: { active: true } });
  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      activityId: activity.id,
      message: `Nova atividade: "${title}" para ${client.name}`,
    })),
  });

  return res.status(201).json(activity);
};

export const update = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { title, description, date, responsible, status } = req.body;

  const activity = await prisma.activity.update({
    where: { id },
    data: {
      title,
      description,
      date: date ? new Date(date) : undefined,
      responsible,
      status,
    },
    include: { createdBy: { select: { name: true } }, files: true },
  });

  await createAuditLog(req.user!.userId, 'UPDATE', 'Activity', id, req.body, id);
  return res.json(activity);
};

export const remove = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  await prisma.activity.delete({ where: { id } });
  await createAuditLog(req.user!.userId, 'DELETE', 'Activity', id);
  return res.status(204).send();
};

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  const logs = await prisma.auditLog.findMany({
    where: { activityId: req.params.id },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return res.json(logs);
};
