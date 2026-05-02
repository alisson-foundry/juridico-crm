import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { AuthRequest } from '../types';

const prisma = new PrismaClient();

export const upload = async (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ message: 'Arquivo não enviado.' });
  const { activityId } = req.params;

  const activity = await prisma.activity.findUnique({ where: { id: activityId } });
  if (!activity) return res.status(404).json({ message: 'Atividade não encontrada.' });

  const file = await prisma.file.create({
    data: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      activityId,
    },
  });
  return res.status(201).json(file);
};

export const download = async (req: AuthRequest, res: Response) => {
  const file = await prisma.file.findUnique({ where: { id: req.params.id } });
  if (!file) return res.status(404).json({ message: 'Arquivo não encontrado.' });

  const filePath = path.resolve(file.path);
  if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'Arquivo não encontrado no servidor.' });

  res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
  res.setHeader('Content-Type', file.mimeType);
  return res.sendFile(filePath);
};

export const remove = async (req: AuthRequest, res: Response) => {
  const file = await prisma.file.findUnique({ where: { id: req.params.id } });
  if (!file) return res.status(404).json({ message: 'Arquivo não encontrado.' });

  const filePath = path.resolve(file.path);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  await prisma.file.delete({ where: { id: req.params.id } });
  return res.status(204).send();
};
