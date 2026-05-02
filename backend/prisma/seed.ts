import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@juridico.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@juridico.com',
      password: adminPassword,
      role: Role.ADMIN,
    },
  });

  const lawyerPassword = await bcrypt.hash('advogado123', 10);
  const lawyer = await prisma.user.upsert({
    where: { email: 'dr.silva@juridico.com' },
    update: {},
    create: {
      name: 'Dr. Carlos Silva',
      email: 'dr.silva@juridico.com',
      password: lawyerPassword,
      role: Role.LAWYER,
    },
  });

  const client = await prisma.client.upsert({
    where: { cpfCnpj: '123.456.789-00' },
    update: {},
    create: {
      name: 'João da Silva Santos',
      cpfCnpj: '123.456.789-00',
      email: 'joao@email.com',
      phone: '(11) 99999-1234',
      actionType: 'Ação Trabalhista',
      entryDate: new Date('2024-01-15'),
      responsible: 'Dr. Carlos Silva',
      notes: 'Cliente referido pelo escritório parceiro.',
      createdById: admin.id,
    },
  });

  await prisma.activity.createMany({
    skipDuplicates: true,
    data: [
      {
        title: 'Abertura do processo',
        description: 'Protocolo inicial da ação trabalhista na 3ª Vara do Trabalho.',
        date: new Date('2024-01-20'),
        responsible: 'Dr. Carlos Silva',
        status: 'COMPLETED',
        clientId: client.id,
        createdById: lawyer.id,
      },
      {
        title: 'Audiência de conciliação',
        description: 'Audiência marcada para tentativa de acordo entre as partes.',
        date: new Date('2024-03-10'),
        responsible: 'Dr. Carlos Silva',
        status: 'IN_PROGRESS',
        clientId: client.id,
        createdById: lawyer.id,
      },
      {
        title: 'Entrega de documentação complementar',
        description: 'Solicitação de documentos adicionais ao cliente para instrução do processo.',
        date: new Date('2024-04-01'),
        responsible: 'Dr. Carlos Silva',
        status: 'PENDING',
        clientId: client.id,
        createdById: admin.id,
      },
    ],
  });

  console.log('✅ Seed concluído.');
  console.log('   Admin: admin@juridico.com / admin123');
  console.log('   Advogado: dr.silva@juridico.com / advogado123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
