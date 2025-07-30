// seed.js (ESM version)
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Insert EmployeeDetails
  const employee1 = await prisma.employeeDetails.create({
    data: {
      name: 'Alice Sharma',
      email: 'alice.sharma@example.com',
      department: 'Engineering',
      joinDate: new Date('2023-04-01'),
      createdBy: 1,
      ssn: '123-45-6789'
    },
  });

  const employee2 = await prisma.employeeDetails.create({
    data: {
      name: 'Rahul Mehta',
      email: 'rahul.mehta@example.com',
      department: 'Finance',
      joinDate: new Date('2022-09-15'),
      createdBy: 2,
      ssn: '987-65-4321'
    },
  });

  // Insert PayrollData
  await prisma.payrollData.createMany({
    data: [
      {
        employeeId: employee1.id,
        salary: 90000,
        bonus: 5000,
        lastUpdated: new Date(),
        processedBy: 100,
      },
      {
        employeeId: employee2.id,
        salary: 85000,
        bonus: 4500,
        lastUpdated: new Date(),
        processedBy: 101,
      },
    ],
  });

  // Insert ProjectInfo
  await prisma.projectInfo.createMany({
    data: [
      {
        name: 'NextGen CRM',
        description: 'A CRM tool for customer lifecycle management.',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-08-15'),
        createdBy: 1,
      },
      {
        name: 'Payroll Optimization',
        description: 'System to automate payroll processing.',
        startDate: new Date('2023-11-01'),
        endDate: null,
        createdBy: 2,
      },
    ],
  });
}

main()
  .then(() => {
    console.log(' Seed data inserted.');
    return prisma.$disconnect();
  })
  .catch((e) => {
    console.error(' Error inserting seed data:', e);
    return prisma.$disconnect().finally(() => process.exit(1));
  });
