import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const SAFE_SELECT = {
  id: true,
  fullName: true,
  mobileNumber: true,
  role: true,
  isActive: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Only Admin can manage users (create/disable/enable/soft-delete/reassign),
 * per the spec: "Admin's only major privilege over Manager is user
 * management/control." Enforced at the controller via @Roles(Role.ADMIN).
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      select: SAFE_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: SAFE_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(dto: CreateUserDto, actingUserId: string) {
    const existing = await this.prisma.user.findUnique({
      where: { mobileNumber: dto.mobileNumber },
    });
    if (existing) {
      throw new ConflictException('A user with this mobile number already exists');
    }

    const passwordHash = await AuthService.hashPassword(dto.password);
    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        mobileNumber: dto.mobileNumber,
        passwordHash,
        role: dto.role,
      },
      select: SAFE_SELECT,
    });

    await this.audit.record({
      userId: actingUserId,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: user.id,
      afterData: user,
    });

    return user;
  }

  async update(id: string, dto: UpdateUserDto, actingUserId: string) {
    const before = await this.findOne(id);

    const data: Record<string, unknown> = {};
    if (dto.fullName !== undefined) data.fullName = dto.fullName;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.newPassword) {
      data.passwordHash = await AuthService.hashPassword(dto.newPassword);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: SAFE_SELECT,
    });

    await this.audit.record({
      userId: actingUserId,
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: id,
      beforeData: before,
      afterData: user,
    });

    return user;
  }

  /** Soft-delete only — users are never hard-deleted (spec: audit history must survive). */
  async softDelete(id: string, actingUserId: string) {
    const before = await this.findOne(id);

    const user = await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
      select: SAFE_SELECT,
    });

    await this.audit.record({
      userId: actingUserId,
      action: 'USER_SOFT_DELETED',
      entityType: 'User',
      entityId: id,
      beforeData: before,
      afterData: user,
    });

    return user;
  }
}
