import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from '@node-rs/argon2';
import { PrismaService } from '../common/services/prisma.service';
import { SessionService } from './session.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly sessionService: SessionService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { mobileNumber: dto.mobileNumber },
    });

    // Same error for "no such user" and "wrong password" to avoid
    // leaking which mobile numbers are registered.
    const invalidCredentials = () =>
      new UnauthorizedException('Invalid mobile number or password.');

    if (!user || user.deletedAt || !user.isActive) {
      throw invalidCredentials();
    }

    const passwordOk = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordOk) {
      throw invalidCredentials();
    }

    // Starting a new session automatically revokes any prior session for
    // this user, satisfying the "one active phone/session" requirement.
    const sessionId = this.sessionService.startSession(user.id);

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      mobileNumber: user.mobileNumber,
      role: user.role,
      sid: sessionId,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        mobileNumber: user.mobileNumber,
        role: user.role,
      },
    };
  }

  async logout(userId: string) {
    this.sessionService.endSession(userId);
    return { success: true };
  }

  static async hashPassword(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }
}
