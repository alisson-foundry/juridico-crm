import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../types';

const prisma = new PrismaClient();

export const list = async (_req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    orderBy: { name: 'asc' },
  });
  return res.json(users);
};

export const create = async (req: AuthRequest, res: Response) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Campos obrigatórios.' });

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ message: 'Email já cadastrado.' });

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role: role || 'STAFF' },
    select: { id: true, name: true, email: true, role: true },
  });
  return res.status(201).json(user);
};

export const update = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, email, role, active, password } = req.body;

  const data: Record<string, unknown> = {};
  if (name) data.name = name;
  if (email) data.email = email;
  if (role) data.role = role;
  if (active !== undefined) data.active = active;
  if (password) data.password = await bcrypt.hash(password, 10);

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  return res.json(user);
};

export const remove = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (id === req.user!.userId) return res.status(400).json({ message: 'Não é possível excluir seu próprio usuário.' });
  await prisma.user.update({ where: { id }, data: { active: false } });
  return res.status(204).send();
};
