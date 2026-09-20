/**
 * Seeds baseline reference data + a few demo accounts so the system is
 * usable immediately after `npm run prisma:seed`.
 *
 * Demo logins (mobile number / password):
 *   9999900001 / AdminPass123!    (ADMIN)
 *   9999900002 / ManagerPass123!  (MANAGER)
 *   9999900003 / EmployeePass123! (EMPLOYEE, assigned to "Shop A")
 */
import { PrismaClient, Role, UnitType } from '@prisma/client';
import * as argon2 from '@node-rs/argon2';

const prisma = new PrismaClient();

async function hash(pw: string) {
  return argon2.hash(pw, { type: argon2.argon2id });
}

async function main() {
  // --- Units -----------------------------------------------------------
  const units = [
    { name: 'Gram', symbol: 'g', type: UnitType.WEIGHT, toCanonicalFactor: 1 },
    { name: 'Kilogram', symbol: 'kg', type: UnitType.WEIGHT, toCanonicalFactor: 1000 },
    { name: 'Milliliter', symbol: 'ml', type: UnitType.VOLUME, toCanonicalFactor: 1 },
    { name: 'Liter', symbol: 'l', type: UnitType.VOLUME, toCanonicalFactor: 1000 },
    { name: 'Piece', symbol: 'pc', type: UnitType.COUNT, toCanonicalFactor: 1 },
    { name: 'Box', symbol: 'box', type: UnitType.COUNT, toCanonicalFactor: 1 },
  ];
  for (const u of units) {
    await prisma.unit.upsert({ where: { name: u.name }, update: {}, create: u });
  }
  const kg = await prisma.unit.findUniqueOrThrow({ where: { name: 'Kilogram' } });
  const gram = await prisma.unit.findUniqueOrThrow({ where: { name: 'Gram' } });
  const piece = await prisma.unit.findUniqueOrThrow({ where: { name: 'Piece' } });

  // 1 Box = 12 Piece (example custom-unit conversion)
  const box = await prisma.unit.findUniqueOrThrow({ where: { name: 'Box' } });
  await prisma.unitConversion.upsert({
    where: { fromUnitId_toUnitId: { fromUnitId: box.id, toUnitId: piece.id } },
    update: {},
    create: { fromUnitId: box.id, toUnitId: piece.id, factor: 12 },
  });

  // --- Category + demo item ---------------------------------------------
  const groceries = await prisma.category.upsert({
    where: { name: 'Groceries' },
    update: {},
    create: { name: 'Groceries' },
  });

  // --- Users --------------------------------------------------------------
  const admin = await prisma.user.upsert({
    where: { mobileNumber: '9999900001' },
    update: {},
    create: {
      fullName: 'Default Admin',
      mobileNumber: '9999900001',
      passwordHash: await hash('AdminPass123!'),
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { mobileNumber: '9999900002' },
    update: {},
    create: {
      fullName: 'Default Manager',
      mobileNumber: '9999900002',
      passwordHash: await hash('ManagerPass123!'),
      role: Role.MANAGER,
    },
  });

  const employee = await prisma.user.upsert({
    where: { mobileNumber: '9999900003' },
    update: {},
    create: {
      fullName: 'Default Employee',
      mobileNumber: '9999900003',
      passwordHash: await hash('EmployeePass123!'),
      role: Role.EMPLOYEE,
    },
  });

  // --- Shop + assignment + bill pad ---------------------------------------
  const shopA = await prisma.shop.upsert({
    where: { name: 'Shop A' },
    update: {},
    create: { name: 'Shop A', address: 'Demo address, Bengaluru' },
  });

  const existingAssignment = await prisma.employeeShopAssignment.findFirst({
    where: { employeeId: employee.id, endDate: null },
  });
  if (!existingAssignment) {
    await prisma.employeeShopAssignment.create({
      data: { employeeId: employee.id, shopId: shopA.id },
    });
  }

  await prisma.billPad.upsert({
    where: { id: 'seed-bill-pad-shop-a' },
    update: {},
    create: { id: 'seed-bill-pad-shop-a', shopId: shopA.id, label: 'Initial pad' },
  });

  // --- Demo item + price ----------------------------------------------
  const riceA = await prisma.item.upsert({
    where: { name: 'Rice A' },
    update: {},
    create: {
      name: 'Rice A',
      categoryId: groceries.id,
      baseUnitId: gram.id,
      sellingUnitId: kg.id,
    },
  });

  const hasPrice = await prisma.itemPrice.findFirst({ where: { itemId: riceA.id } });
  if (!hasPrice) {
    await prisma.itemPrice.create({
      data: {
        itemId: riceA.id,
        pricePerUnit: 120,
        effectiveDate: new Date(),
        setById: admin.id,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log('Seed complete.');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
