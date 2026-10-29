import {
  BadRequestException,
  Controller,
  Get,
  Put,
  Body,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { DataSource } from 'typeorm';
import type { Request } from 'express';

type ThemeMode = 'light' | 'dark';
type SessionPayload = { sub: string; exp: number };

@Controller('auth/preferences')
export class ThemePreferenceController {
  constructor(
    private readonly config: ConfigService,
    private readonly db: DataSource,
  ) {}

  @Get()
  async getPreferences(@Req() request: Request) {
    const userId = await this.getAuthenticatedUserId(request);
    const rows: Array<{ theme: ThemeMode }> = await this.db.query(
      'SELECT theme FROM app_user_preferences WHERE user_id = $1',
      [userId],
    );
    return { theme: rows[0]?.theme ?? null };
  }

  @Put()
  async savePreferences(
    @Req() request: Request,
    @Body() body: { theme?: unknown },
  ) {
    const userId = await this.getAuthenticatedUserId(request);
    if (body?.theme !== 'light' && body?.theme !== 'dark') {
      throw new BadRequestException('Préférence de thème invalide.');
    }
    await this.ensureTable();
    await this.db.query(
      'INSERT INTO app_user_preferences (user_id, theme, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (user_id) DO UPDATE SET theme = EXCLUDED.theme, updated_at = NOW()',
      [userId, body.theme],
    );
    return { theme: body.theme };
  }

  private async getAuthenticatedUserId(request: Request): Promise<string> {
    const payload = this.readSession(request);
    if (!payload) {
      throw new UnauthorizedException('Session absente ou expirée.');
    }
    const rows: Array<{ id: string }> = await this.db.query(
      'SELECT id FROM app_users WHERE lower(username) = lower($1) AND active = TRUE LIMIT 1',
      [payload.sub],
    );
    if (!rows[0]) {
      throw new UnauthorizedException('Compte désactivé ou introuvable.');
    }
    return String(rows[0].id);
  }

  private readSession(request: Request): SessionPayload | null {
    const token = this.readCookie(request.headers.cookie, 'bpmn_session');
    const secret = this.config.get<string>('authSessionSecret');
    if (!token || !secret || Buffer.byteLength(secret, 'utf8') < 32) {
      return null;
    }

    const separator = token.lastIndexOf('.');
    if (separator <= 0) return null;
    const encoded = token.slice(0, separator);
    const supplied = token.slice(separator + 1);
    const expected = createHmac('sha256', secret)
      .update(encoded)
      .digest('base64url');
    const a = Buffer.from(supplied);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    try {
      const payload = JSON.parse(
        Buffer.from(encoded, 'base64url').toString('utf8'),
      ) as Partial<SessionPayload>;
      if (
        typeof payload.sub !== 'string' ||
        !payload.sub ||
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

  private readCookie(header: string | undefined, name: string): string | null {
    if (!header) return null;
    for (const part of header.split(';')) {
      const index = part.indexOf('=');
      if (index >= 0 && part.slice(0, index).trim() === name) {
        return part.slice(index + 1).trim() || null;
      }
    }
    return null;
  }
}
