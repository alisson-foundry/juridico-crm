import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types';

const prisma = new PrismaClient();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}
function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function subMonths(d: Date, n: number) {
  const r = new Date(d);
  r.setMonth(r.getMonth() - n);
  return r;
}
const PT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
function monthLabel(d: Date) {
  return `${PT_MONTHS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
}

// ─── Summary (KPIs + cashflow + alerts + metrics) ────────────────────────────
export const getSummary = async (req: AuthRequest, res: Response) => {
  const now = new Date();
  const in30days = addDays(now, 30);
  const in7days = addDays(now, 7);

  // Fetch all non-cancelled installments with full context
  const allInstallments = await prisma.installment.findMany({
    where: { contract: { status: { not: 'CANCELLED' } } },
    include: {
      contract: {
        include: {
          client: {
            select: { id: true, name: true, cpfCnpj: true, responsible: true },
          },
        },
      },
    },
    orderBy: { dueDate: 'asc' },
  });

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalContracted = allInstallments.reduce((s, i) => s + i.value, 0);
  const totalReceived = allInstallments
    .filter((i) => i.status === 'PAID')
    .reduce((s, i) => s + i.value, 0);
  const totalPending = allInstallments
    .filter((i) => i.status === 'PENDING')
    .reduce((s, i) => s + i.value, 0);
  const totalOverdue = allInstallments
    .filter((i) => i.status === 'OVERDUE')
    .reduce((s, i) => s + i.value, 0);
  const next30days = allInstallments
    .filter((i) => i.status === 'PENDING' && new Date(i.dueDate) <= in30days)
    .reduce((s, i) => s + i.value, 0);

  // ── Cashflow (last 6 months + current) ───────────────────────────────────
  const cashflow = Array.from({ length: 6 }, (_, idx) => {
    const d = subMonths(now, 5 - idx);
    const start = startOfMonth(d);
    const end = endOfMonth(d);
    const inRange = allInstallments.filter((i) => {
      const due = new Date(i.dueDate);
      return due >= start && due <= end;
    });
    return {
      month: monthLabel(d),
      received: inRange.filter((i) => i.status === 'PAID').reduce((s, i) => s + i.value, 0),
      pending: inRange.filter((i) => i.status === 'PENDING').reduce((s, i) => s + i.value, 0),
      overdue: inRange.filter((i) => i.status === 'OVERDUE').reduce((s, i) => s + i.value, 0),
    };
  });

  // ── Revenue by Lawyer ─────────────────────────────────────────────────────
  const lawyerMap = new Map<string, { total: number; received: number; pending: number; overdue: number }>();
  for (const inst of allInstallments) {
    const resp = inst.contract.client.responsible;
    if (!lawyerMap.has(resp)) lawyerMap.set(resp, { total: 0, received: 0, pending: 0, overdue: 0 });
    const entry = lawyerMap.get(resp)!;
    entry.total += inst.value;
    if (inst.status === 'PAID') entry.received += inst.value;
    if (inst.status === 'PENDING') entry.pending += inst.value;
    if (inst.status === 'OVERDUE') entry.overdue += inst.value;
  }
  const revenueByLawyer = Array.from(lawyerMap.entries())
    .map(([responsible, data]) => ({ responsible, ...data }))
    .sort((a, b) => b.total - a.total);

  // ── Alerts ────────────────────────────────────────────────────────────────
  const overdueInstallments = allInstallments
    .filter((i) => i.status === 'OVERDUE')
    .slice(0, 20);

  const nearDue = allInstallments
    .filter(
      (i) =>
        i.status === 'PENDING' &&
        new Date(i.dueDate) >= now &&
        new Date(i.dueDate) <= in7days,
    )
    .slice(0, 20);

  // Defaulting clients: clients with ≥1 OVERDUE installment
  const defaultingMap = new Map<
    string,
    { client: { id: string; name: string; cpfCnpj: string; responsible: string }; overdueAmount: number }
  >();
  for (const inst of allInstallments.filter((i) => i.status === 'OVERDUE')) {
    const c = inst.contract.client;
    if (!defaultingMap.has(c.id)) {
      defaultingMap.set(c.id, { client: c, overdueAmount: 0 });
    }
    defaultingMap.get(c.id)!.overdueAmount += inst.value;
  }
  const defaultingClients = Array.from(defaultingMap.values()).sort(
    (a, b) => b.overdueAmount - a.overdueAmount,
  );

  // ── Metrics ───────────────────────────────────────────────────────────────
  const totalContracts = await prisma.contract.count({
    where: { status: { not: 'CANCELLED' } },
  });
  const totalClients = await prisma.client.count({ where: { status: 'ACTIVE' } });
  const avgTicket = totalContracts > 0 ? totalContracted / totalContracts : 0;
  const defaultRate =
    totalContracted > 0 ? Math.round((totalOverdue / totalContracted) * 100 * 10) / 10 : 0;

  return res.json({
    kpis: { totalContracted, totalReceived, totalPending, totalOverdue, next30days },
    cashflow,
    revenueByLawyer,
    alerts: { overdueInstallments, nearDue, defaultingClients },
    metrics: { defaultRate, avgTicket, totalContracts, totalClients },
  });
};

// ─── Installments list with filters ──────────────────────────────────────────
export const listInstallments = async (req: AuthRequest, res: Response) => {
  const { status, clientId, responsible, startDate, endDate, page = '1', limit = '50' } = req.query;

  const skip = (parseInt(String(page)) - 1) * parseInt(String(limit));
  const take = parseInt(String(limit));

  const where: any = {
    contract: {
      status: { not: 'CANCELLED' },
      ...(clientId ? { clientId: String(clientId) } : {}),
      ...(responsible
        ? { client: { responsible: { contains: String(responsible), mode: 'insensitive' } } }
        : {}),
    },
    ...(status ? { status: String(status) } : {}),
    ...(startDate || endDate
      ? {
          dueDate: {
            ...(startDate ? { gte: new Date(String(startDate)) } : {}),
            ...(endDate ? { lte: new Date(String(endDate) + 'T23:59:59') } : {}),
          },
        }
      : {}),
  };

  const [total, installments] = await Promise.all([
    prisma.installment.count({ where }),
    prisma.installment.findMany({
      where,
      include: {
        contract: {
          include: {
            client: { select: { id: true, name: true, cpfCnpj: true, responsible: true } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
      skip,
      take,
    }),
  ]);

  return res.json({ total, page: parseInt(String(page)), limit: take, data: installments });
};
