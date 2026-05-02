import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types';
import { createAuditLog } from '../middleware/audit';

const prisma = new PrismaClient();

export const list = async (req: AuthRequest, res: Response) => {
  const { q, status } = req.query;
  const clients = await prisma.client.findMany({
    where: {
      AND: [
        status ? { status: status as any } : {},
        q
          ? {
              OR: [
                { name: { contains: String(q), mode: 'insensitive' } },
                { cpfCnpj: { contains: String(q) } },
                { actionType: { contains: String(q), mode: 'insensitive' } },
                { responsible: { contains: String(q), mode: 'insensitive' } },
              ],
            }
          : {},
      ],
    },
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { activities: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return res.json(clients);
};

export const getOne = async (req: AuthRequest, res: Response) => {
  const client = await prisma.client.findUnique({
    where: { id: req.params.id },
    include: {
      createdBy: { select: { name: true } },
      activities: {
        include: {
          createdBy: { select: { name: true } },
          files: true,
        },
        orderBy: { date: 'desc' },
      },
    },
  });
  if (!client) return res.status(404).json({ message: 'Cliente não encontrado.' });
  return res.json(client);
};

export const create = async (req: AuthRequest, res: Response) => {
  const { name, cpfCnpj, email, phone, actionType, entryDate, responsible, notes } = req.body;
  if (!name || !cpfCnpj || !actionType || !entryDate || !responsible)
    return res.status(400).json({ message: 'Campos obrigatórios ausentes.' });

  const exists = await prisma.client.findUnique({ where: { cpfCnpj } });
  if (exists) return res.status(409).json({ message: 'CPF/CNPJ já cadastrado.' });

  const client = await prisma.client.create({
    data: {
      name,
      cpfCnpj,
      email,
      phone,
      actionType,
      entryDate: new Date(entryDate),
      responsible,
      notes,
      createdById: req.user!.userId,
    },
  });

  await createAuditLog(req.user!.userId, 'CREATE', 'Client', client.id);
  return res.status(201).json(client);
};

export const update = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, cpfCnpj, email, phone, actionType, entryDate, responsible, notes, status } = req.body;

  const client = await prisma.client.update({
    where: { id },
    data: {
      name,
      cpfCnpj,
      email,
      phone,
      actionType,
      entryDate: entryDate ? new Date(entryDate) : undefined,
      responsible,
      notes,
      status,
    },
  });

  await createAuditLog(req.user!.userId, 'UPDATE', 'Client', id, req.body);
  return res.json(client);
};

export const remove = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  await prisma.client.delete({ where: { id } });
  await createAuditLog(req.user!.userId, 'DELETE', 'Client', id);
  return res.status(204).send();
};
