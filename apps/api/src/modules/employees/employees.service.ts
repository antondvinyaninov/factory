import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

const employeeSelect = {
  id: true,
  email: true,
  name: true,
  personnelNumber: true,
  lastName: true,
  firstName: true,
  middleName: true,
  birthDate: true,
  hireDate: true,
  terminationDate: true,
  department: true,
  unitBureau: true,
  position: true,
  managerName: true,
  phones: true,
  photoUrl: true,
  isActive: true,
  role: true,
};

type EmployeeRecord = {
  phones: unknown;
};

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const employees = await this.prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { personnelNumber: { not: null } },
          { lastName: { not: null } },
          { firstName: { not: null } },
          { department: { not: null } },
          { position: { not: null } },
        ],
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
        { middleName: 'asc' },
        { name: 'asc' },
      ],
      take: 200,
      select: employeeSelect,
    });

    return employees.map(formatEmployee);
  }

  async findOne(id: string) {
    const employee = await this.prisma.user.findUnique({
      where: { id },
      select: employeeSelect,
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return formatEmployee(employee);
  }
}

function formatEmployee<T extends EmployeeRecord>(employee: T) {
  return {
    ...employee,
    phones: normalizePhones(employee.phones),
  };
}

function normalizePhones(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (phone): phone is string => typeof phone === 'string' && phone.length > 0,
  );
}
