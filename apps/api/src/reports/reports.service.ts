import { Injectable } from '@nestjs/common';
import { BillStatus } from '@prisma/client';
import { PrismaService } from '../common/services/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private getTodayRange() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  async getAdminManagerDashboard() {
    const { start, end } = this.getTodayRange();

    const [todayBills, pendingReviewCount, disputedCount, allShops] =
      await Promise.all([
        this.prisma.bill.findMany({
          where: { billDate: { gte: start, lte: end } },
          select: {
            id: true,
            shopId: true,
            actualAmount: true,
            discountAmount: true,
            status: true,
          },
        }),
        this.prisma.bill.count({
          where: {
            status: { in: [BillStatus.SUBMITTED, BillStatus.UNDER_REVIEW] },
          },
        }),
        this.prisma.bill.count({
          where: { status: BillStatus.DISPUTED },
        }),
        this.prisma.shop.findMany({
          where: { status: 'ACTIVE' },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
      ]);

    const todaySales = todayBills.reduce(
      (acc, b) => acc + Number(b.actualAmount),
      0,
    );
    const todayDiscount = todayBills.reduce(
      (acc, b) => acc + Number(b.discountAmount),
      0,
    );

    // Shop-wise breakdown
    const shopBreakdown = allShops.map((shop) => {
      const shopBills = todayBills.filter((b) => b.shopId === shop.id);
      const sales = shopBills.reduce(
        (acc, b) => acc + Number(b.actualAmount),
        0,
      );
      const discount = shopBills.reduce(
        (acc, b) => acc + Number(b.discountAmount),
        0,
      );
      return {
        shopId: shop.id,
        shopName: shop.name,
        todaySales: sales,
        todayBillsCount: shopBills.length,
        todayDiscount: discount,
      };
    });

    return {
      todaySales,
      todayBillsCount: todayBills.length,
      pendingReviewCount,
      disputedCount,
      totalDiscount: todayDiscount,
      shopBreakdown,
    };
  }

  async getEmployeeDashboard(userId: string) {
    const { start, end } = this.getTodayRange();

    const [currentAssignment, recentBills, todayBills] = await Promise.all([
      this.prisma.employeeShopAssignment.findFirst({
        where: { employeeId: userId, endDate: null },
        include: { shop: true },
      }),
      this.prisma.bill.findMany({
        where: { createdById: userId },
        include: {
          shop: true,
          items: { include: { item: true } },
          reviews: { take: 1, orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.bill.findMany({
        where: {
          createdById: userId,
          billDate: { gte: start, lte: end },
        },
        select: {
          actualAmount: true,
          status: true,
        },
      }),
    ]);

    const todaySales = todayBills.reduce(
      (acc, b) => acc + Number(b.actualAmount),
      0,
    );
    const pendingCount = todayBills.filter(
      (b) => b.status === BillStatus.SUBMITTED || b.status === BillStatus.UNDER_REVIEW,
    ).length;
    const approvedCount = todayBills.filter(
      (b) => b.status === BillStatus.APPROVED,
    ).length;
    const disputedCount = todayBills.filter(
      (b) => b.status === BillStatus.DISPUTED,
    ).length;

    return {
      currentShop: currentAssignment?.shop ?? null,
      todayStats: {
        billsCount: todayBills.length,
        todaySales,
        pendingCount,
        approvedCount,
        disputedCount,
      },
      recentBills,
    };
  }
}
