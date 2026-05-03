import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { AuthRequest } from '../types';
import { createAuditLog } from '../middleware/audit';

const prisma = new PrismaClient();

// ─── List contracts for a client ────────────────────────────────────────────
export const list = async (req: AuthRequest, res: Response) => {
  const { clientId } = req.params;
  const contracts = await prisma.contract.findMany({
    where: { clientId },
    include: {
      createdBy: { select: { name: true } },
      installments: { orderBy: { number: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return res.json(contracts);
};

// ─── Get single contract ─────────────────────────────────────────────────────
export const getOne = async (req: AuthRequest, res: Response) => {
  const contract = await prisma.contract.findUnique({
    where: { id: req.params.id },
    include: {
      createdBy: { select: { name: true } },
      installments: { orderBy: { number: 'asc' } },
    },
  });
  if (!contract) return res.status(404).json({ message: 'Contrato não encontrado.' });
  return res.json(contract);
};

// ─── Create contract (+ installments if INSTALLMENT type) ───────────────────
export const create = async (req: AuthRequest, res: Response) => {
  const { clientId } = req.params;
  const { totalValue, paymentType, paymentMethod, startDate, installmentCount, notes } = req.body;

  if (!totalValue || !paymentType || !paymentMethod || !startDate)
    return res.status(400).json({ message: 'Campos obrigatórios ausentes.' });

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return res.status(404).json({ message: 'Cliente não encontrado.' });

  const contract = await prisma.contract.create({
    data: {
      totalValue: parseFloat(totalValue),
      paymentType,
      paymentMethod,
      startDate: new Date(startDate),
      notes,
      clientId,
      createdById: req.user!.userId,
    },
  });

  // Auto-create installments
  if (paymentType === 'INSTALLMENT') {
    const n = Math.max(1, parseInt(installmentCount) || 1);
    const installmentValue = Math.round((parseFloat(totalValue) / n) * 100) / 100;
    const start = new Date(startDate);

    const installmentsData = Array.from({ length: n }, (_, i) => {
      const due = new Date(start);
      due.setMonth(due.getMonth() + i);
      return {
        number: i + 1,
        value: installmentValue,
        dueDate: due,
        contractId: contract.id,
      };
    });

    await prisma.installment.createMany({ data: installmentsData });
  } else {
    // LUMP_SUM — single installment
    await prisma.installment.create({
      data: {
        number: 1,
        value: parseFloat(totalValue),
        dueDate: new Date(startDate),
        contractId: contract.id,
      },
    });
  }

  await createAuditLog(req.user!.userId, 'CREATE', 'Contract', contract.id);

  const full = await prisma.contract.findUnique({
    where: { id: contract.id },
    include: {
      createdBy: { select: { name: true } },
      installments: { orderBy: { number: 'asc' } },
    },
  });

  return res.status(201).json(full);
};

// ─── Update contract status ──────────────────────────────────────────────────
export const update = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  const contract = await prisma.contract.update({
    where: { id },
    data: { status, notes },
    include: { installments: { orderBy: { number: 'asc' } } },
  });

  await createAuditLog(req.user!.userId, 'UPDATE', 'Contract', id, req.body);
  return res.json(contract);
};

// ─── Delete contract ─────────────────────────────────────────────────────────
export const remove = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Clean up receipt files
  const installments = await prisma.installment.findMany({
    where: { contractId: id },
    select: { receiptPath: true },
  });
  for (const inst of installments) {
    if (inst.receiptPath && fs.existsSync(inst.receiptPath)) {
      fs.unlinkSync(inst.receiptPath);
    }
  }

  await prisma.contract.delete({ where: { id } });
  await createAuditLog(req.user!.userId, 'DELETE', 'Contract', id);
  return res.status(204).send();
};

// ─── Pay installment ─────────────────────────────────────────────────────────
export const payInstallment = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { paidWith, paidAt, notes } = req.body;

  if (!paidWith) return res.status(400).json({ message: 'Método de pagamento obrigatório.' });

  const installment = await prisma.installment.findUnique({ where: { id } });
  if (!installment) return res.status(404).json({ message: 'Parcela não encontrada.' });

  let receiptPath: string | undefined;
  let receiptName: string | undefined;

  if (req.file) {
    receiptPath = req.file.path;
    receiptName = req.file.originalname;
  }

  const updated = await prisma.installment.update({
    where: { id },
    data: {
      status: 'PAID',
      paidWith,
      paidAt: paidAt ? new Date(paidAt) : new Date(),
      notes: notes || undefined,
      receiptPath: receiptPath || undefined,
      receiptName: receiptName || undefined,
    },
  });

  // Check if all installments are paid → mark contract as COMPLETED
  const remaining = await prisma.installment.count({
    where: { contractId: installment.contractId, status: { not: 'PAID' } },
  });
  if (remaining === 0) {
    await prisma.contract.update({
      where: { id: installment.contractId },
      data: { status: 'COMPLETED' },
    });
  }

  await createAuditLog(req.user!.userId, 'PAY', 'Installment', id, { paidWith });
  return res.json(updated);
};

// ─── Download receipt ─────────────────────────────────────────────────────────
export const downloadReceipt = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const installment = await prisma.installment.findUnique({ where: { id } });
  if (!installment || !installment.receiptPath)
    return res.status(404).json({ message: 'Comprovante não encontrado.' });

  const absPath = path.resolve(installment.receiptPath);
  if (!fs.existsSync(absPath))
    return res.status(404).json({ message: 'Arquivo não encontrado no servidor.' });

  return res.download(absPath, installment.receiptName || 'comprovante');
};

// ─── Mark overdue ────────────────────────────────────────────────────────────
export const markOverdue = async (req: AuthRequest, res: Response) => {
  const result = await prisma.installment.updateMany({
    where: {
      status: 'PENDING',
      dueDate: { lt: new Date() },
    },
    data: { status: 'OVERDUE' },
  });
  return res.json({ updated: result.count });
};
