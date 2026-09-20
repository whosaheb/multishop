import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { SessionService } from '../session.service';

export interface JwtPayload {
  sub: string; // userId
  mobileNumber: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  sid: string; // sessionId
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly sessionService: SessionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'change_me_in_production',
    });
  }

  async validate(payload: JwtPayload) {
    // Reject tokens whose session has since been revoked, e.g. because the
    // same account logged in from another phone.
    if (!this.sessionService.isSessionActive(payload.sub, payload.sid)) {
      throw new UnauthorizedException('Session has been revoked. Please log in again.');
    }

    return {
      userId: payload.sub,
      mobileNumber: payload.mobileNumber,
      role: payload.role,
      sessionId: payload.sid,
    };
  }
}
