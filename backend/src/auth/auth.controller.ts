import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';

const COOKIE_NAME = 'bpmn_session';
const SESSION_TTL_SECONDS = 8 * 60 * 60;

type SessionPayload = {
  sub: string;
  groups: string[];
  exp: number;
};

@Controller('auth')
export class AuthController {
  constructor(private readonly config: ConfigService) {}

  @Post('login')
  login(
    @Body() body: { username?: unknown; password?: unknown },
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const expectedUser = this.config.get<string>('demoAuthUser');
    const expectedPassword = this.config.get<string>('demoAuthPassword');
    const secret = this.getSecret();

    if (!expectedUser || !expectedPassword || !secret) {
      throw new ServiceUnavailableException(
        'Interactive demo login is not configured on this instance.',
      );
    }

    const username = typeof body?.username === 'string' ? body.username.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    if (
      username !== expectedUser ||
      !this.constantTimeEquals(password, expectedPassword)
    ) {
      response.setHeader('Cache-Control', 'no-store');
      return response.status(401).json({
        statusCode: 401,
        message: 'Identifiant ou mot de passe incorrect.',
      });
    }

    const groups = (this.config.get<string>('demoAuthGroups') ?? '')
      .split(',')
      .map((group) => group.trim())
      .filter(Boolean);
    if (!groups.length) {
      throw new ServiceUnavailableException(
        'No application groups are configured for the demo account.',
      );
    }

    const payload: SessionPayload = {
      sub: expectedUser,
      groups,
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    };
    const token = this.signPayload(payload, secret);
    const secure =
      request.headers['x-forwarded-proto'] === 'https' ||
      (request as Request & { secure?: boolean }).secure === true;
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader(
      'Set-Cookie',
      this.cookie(token, SESSION_TTL_SECONDS, secure),
    );
    return response.status(200).json({ userId: expectedUser });
  }

  @Get('session')
  session(@Req() request: Request, @Res() response: Response) {
    const payload = this.readSession(request);
    response.setHeader('Cache-Control', 'no-store');
    if (!payload) {
      return response.status(401).json({
        statusCode: 401,
        message: 'Session absente ou expirée.',
      });
    }
    return response.status(200).json({
      userId: payload.sub,
      groups: payload.groups,
      expiresAt: payload.exp,
    });
  }

  @Post('logout')
  logout(@Req() request: Request, @Res() response: Response) {
    const secure =
      request.headers['x-forwarded-proto'] === 'https' ||
      (request as Request & { secure?: boolean }).secure === true;
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Set-Cookie', this.cookie('', 0, secure));
    return response.status(200).json({ loggedOut: true });
  }

  @Get('verify')
  verify(@Req() request: Request, @Res() response: Response) {
    const payload = this.readSession(request);
    if (!payload) {
      return response.status(401).end();
    }
    response.setHeader('X-Auth-User', payload.sub);
    response.setHeader('X-Auth-Groups', payload.groups.join(','));
    response.setHeader('Cache-Control', 'no-store');
    return response.status(204).end();
  }

  private readSession(request: Request): SessionPayload | null {
    const token = this.readCookie(request.headers.cookie, COOKIE_NAME);
    const secret = this.getSecret();
    if (!token || !secret) return null;

    const separator = token.lastIndexOf('.');
    if (separator <= 0) return null;
    const encodedPayload = token.slice(0, separator);
    const suppliedSignature = token.slice(separator + 1);
    const expectedSignature = this.signature(encodedPayload, secret);
    if (!this.constantTimeEquals(suppliedSignature, expectedSignature)) {
      return null;
    }

    try {
      const payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8'),
      ) as Partial<SessionPayload>;
      if (
        typeof payload.sub !== 'string' ||
        !payload.sub ||
        !Array.isArray(payload.groups) ||
        !payload.groups.every((group) => typeof group === 'string') ||
        typeof payload.exp !== 'number' ||
        payload.exp <= Math.floor(Date.now() / 1000)
      ) {
        return null;
      }
      return payload as SessionPayload;
    } catch {
      return null;
    }
  }

  private signPayload(payload: SessionPayload, secret: string): string {
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${encoded}.${this.signature(encoded, secret)}`;
  }

  private signature(value: string, secret: string): string {
    return createHmac('sha256', secret).update(value).digest('base64url');
  }

  private getSecret(): string | null {
    const secret = this.config.get<string>('authSessionSecret');
    return secret && Buffer.byteLength(secret, 'utf8') >= 32 ? secret : null;
  }

  private constantTimeEquals(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return (
      leftBuffer.length === rightBuffer.length &&
      timingSafeEqual(leftBuffer, rightBuffer)
    );
  }

  private readCookie(
    cookieHeader: string | undefined,
    name: string,
  ): string | null {
    if (!cookieHeader) return null;
    for (const part of cookieHeader.split(';')) {
      const separator = part.indexOf('=');
      if (separator < 0) continue;
      if (part.slice(0, separator).trim() === name) {
        return part.slice(separator + 1).trim() || null;
      }
    }
    return null;
  }

  private cookie(value: string, maxAge: number, secure: boolean): string {
    return [
      `${COOKIE_NAME}=${value}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      `Max-Age=${maxAge}`,
      ...(secure ? ['Secure'] : []),
    ].join('; ');
  }
}
