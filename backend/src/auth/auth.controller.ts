import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { DataSource } from 'typeorm';
import type { Request, Response } from 'express';

const COOKIE_NAME = 'bpmn_session';
const SESSION_TTL_SECONDS = 8 * 60 * 60;

type GlobalRole = 'admin' | 'modeler' | 'viewer';
type SessionPayload = {
  sub: string;
  groups: string[];
  role: GlobalRole;
  exp: number;
  impersonatorSub?: string;
};
type UserRow = {
  id: string;
  username: string;
  email: string | null;
  password_hash: string;
  global_role: GlobalRole;
  active: boolean;
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly config: ConfigService,
    private readonly db: DataSource,
  ) {}

  @Post('login')
  async login(
    @Body() body: { username?: unknown; password?: unknown },
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const secret = this.getSecret();
    if (!secret) {
      throw new ServiceUnavailableException(
        'La session sécurisée n’est pas configurée.',
      );
    }

    const login =
      typeof body?.username === 'string'
        ? body.username.trim().toLocaleLowerCase()
        : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!login || !password) return this.unauthorized(response);

    // Bootstrap the first administrator from Coolify secrets on an empty database.
    // After this one-time setup, only PostgreSQL credentials are accepted.
    const countRows = await this.db.query(
      'SELECT COUNT(*)::int AS count FROM app_users',
    );
    if (Number(countRows[0]?.count ?? 0) === 0) {
      const bootstrapUser = this.config.get<string>('demoAuthUser')?.trim();
      const bootstrapPassword = this.config.get<string>('demoAuthPassword');
      if (
        bootstrapUser &&
        bootstrapPassword &&
        login === bootstrapUser.toLocaleLowerCase() &&
        this.constantTimeEquals(password, bootstrapPassword)
      ) {
        const salt = randomBytes(16).toString('hex');
        await this.db.query(
          'INSERT INTO app_users (username, email, password_hash, global_role, active) VALUES ($1, NULL, $2, $3, TRUE) ON CONFLICT DO NOTHING',
          [
            bootstrapUser,
            'scrypt:' + salt + ':' + this.hashPassword(password, salt),
            'admin',
          ],
        );
      }
    }

    const rows: UserRow[] = await this.db.query(
      'SELECT id, username, email, password_hash, global_role, active FROM app_users WHERE (lower(username) = $1 OR lower(email) = $1) AND active = TRUE LIMIT 1',
      [login],
    );
    const user = rows[0];
    if (!user || !this.verifyPassword(password, user.password_hash)) {
      return this.unauthorized(response);
    }

    const payload: SessionPayload = {
      sub: user.username,
      groups: this.groupsForRole(user.global_role),
      role: user.global_role,
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
    return response.status(200).json({
      userId: user.username,
      email: user.email,
      role: user.global_role,
    });
  }

  @Get('session')
  async session(@Req() request: Request, @Res() response: Response) {
    const payload = this.readSession(request);
    response.setHeader('Cache-Control', 'no-store');
    if (!payload) {
      return response
        .status(401)
        .json({ statusCode: 401, message: 'Session absente ou expirée.' });
    }

    const rows: UserRow[] = await this.db.query(
      'SELECT id, username, email, password_hash, global_role, active FROM app_users WHERE lower(username) = lower($1) AND active = TRUE',
      [payload.sub],
    );
    const user = rows[0];
    if (!user) {
      return response.status(401).json({
        statusCode: 401,
        message: 'Compte désactivé ou introuvable.',
      });
    }

    return response.status(200).json({
      userId: user.username,
      email: user.email,
      groups: this.groupsForRole(user.global_role),
      role: user.global_role,
      expiresAt: payload.exp,
      impersonating: Boolean(payload.impersonatorSub),
      impersonatorUserId: payload.impersonatorSub ?? null,
    });
  }

  @Post('users/:id/impersonate')
  async impersonateUser(
    @Req() request: Request,
    @Param('id') id: string,
    @Res() response: Response,
  ) {
    const administrator = await this.requireAdmin(request);
    const rows: UserRow[] = await this.db.query(
      'SELECT id, username, email, password_hash, global_role, active FROM app_users WHERE id = $1 AND active = TRUE',
      [id],
    );
    const target = rows[0];
    if (!target) throw new BadRequestException('Utilisateur introuvable ou désactivé.');

    const secret = this.getSecret();
    if (!secret) {
      throw new ServiceUnavailableException('La session sécurisée n’est pas configurée.');
    }
    const payload: SessionPayload = {
      sub: target.username,
      groups: this.groupsForRole(target.global_role),
      role: target.global_role,
      impersonatorSub: administrator.sub,
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    };
    const secure =
      request.headers['x-forwarded-proto'] === 'https' ||
      (request as Request & { secure?: boolean }).secure === true;
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Set-Cookie', this.cookie(this.signPayload(payload, secret), SESSION_TTL_SECONDS, secure));
    return response.status(200).json({
      userId: target.username,
      role: target.global_role,
      impersonating: true,
      impersonatorUserId: administrator.sub,
    });
  }

  @Post('impersonation/stop')
  async stopImpersonation(
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const current = this.readSession(request);
    if (!current?.impersonatorSub) {
      throw new ForbiddenException('Aucune simulation de compte en cours.');
    }
    const rows: UserRow[] = await this.db.query(
      "SELECT id, username, email, password_hash, global_role, active FROM app_users WHERE lower(username) = lower($1) AND active = TRUE AND global_role = 'admin'",
      [current.impersonatorSub],
    );
    const administrator = rows[0];
    if (!administrator) {
      throw new ForbiddenException('Le compte administrateur d’origine n’est plus actif.');
    }
    const secret = this.getSecret();
    if (!secret) {
      throw new ServiceUnavailableException('La session sécurisée n’est pas configurée.');
    }
    const payload: SessionPayload = {
      sub: administrator.username,
      groups: this.groupsForRole('admin'),
      role: 'admin',
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    };
    const secure =
      request.headers['x-forwarded-proto'] === 'https' ||
      (request as Request & { secure?: boolean }).secure === true;
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Set-Cookie', this.cookie(this.signPayload(payload, secret), SESSION_TTL_SECONDS, secure));
    return response.status(200).json({
      userId: administrator.username,
      email: administrator.email,
      role: 'admin',
      impersonating: false,
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
  async verify(@Req() request: Request, @Res() response: Response) {
    const payload = this.readSession(request);
    if (!payload) return response.status(401).end();

    const rows: UserRow[] = await this.db.query(
      'SELECT id, username, email, password_hash, global_role, active FROM app_users WHERE lower(username) = lower($1) AND active = TRUE',
      [payload.sub],
    );
    const user = rows[0];
    if (!user) return response.status(401).end();

    response.setHeader('X-Auth-User', user.username);
    response.setHeader(
      'X-Auth-Groups',
      this.groupsForRole(user.global_role).join(','),
    );
    response.setHeader('Cache-Control', 'no-store');
    return response.status(204).end();
  }

  @Get('users')
  async listUsers(@Req() request: Request) {
    await this.requireAdmin(request);
    return this.db.query(
      'SELECT id, username, email, global_role AS role, active, created_at AS "createdAt" FROM app_users ORDER BY lower(username)',
    );
  }

  @Post('users')
  async createUser(
    @Req() request: Request,
    @Body()
    body: {
      username?: unknown;
      email?: unknown;
      password?: unknown;
      role?: unknown;
    },
  ) {
    await this.requireAdmin(request);
    const username = this.cleanUsername(body.username);
    const email = this.cleanEmail(body.email);
    const password = this.cleanPassword(body.password);
    const role = this.cleanRole(body.role);
    const salt = randomBytes(16).toString('hex');

    try {
      const rows = await this.db.query(
        'INSERT INTO app_users (username, email, password_hash, global_role, active) VALUES ($1, $2, $3, $4, TRUE) RETURNING id, username, email, global_role AS role, active, created_at AS "createdAt"',
        [
          username,
          email,
          'scrypt:' + salt + ':' + this.hashPassword(password, salt),
          role,
        ],
      );
      return rows[0];
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException(
          'Cet identifiant ou cette adresse e-mail existe déjà.',
        );
      }
      throw error;
    }
  }

  @Patch('users/:id')
  async updateUser(
    @Req() request: Request,
    @Param('id') id: string,
    @Body()
    body: {
      username?: unknown;
      email?: unknown;
      role?: unknown;
      active?: unknown;
    },
  ) {
    const actor = await this.requireAdmin(request);
    const rows: UserRow[] = await this.db.query(
      'SELECT id, username, email, password_hash, global_role, active FROM app_users WHERE id = $1',
      [id],
    );
    const current = rows[0];
    if (!current) throw new BadRequestException('Utilisateur introuvable.');

    const username =
      body.username === undefined
        ? current.username
        : this.cleanUsername(body.username);
    const email =
      body.email === undefined ? current.email : this.cleanEmail(body.email);
    const role =
      body.role === undefined ? current.global_role : this.cleanRole(body.role);
    const active = body.active === undefined ? current.active : body.active;

    if (typeof active !== 'boolean') {
      throw new BadRequestException('Le statut actif doit être booléen.');
    }
    if (current.username === actor.sub && (!active || role !== 'admin')) {
      throw new BadRequestException(
        'Vous ne pouvez pas désactiver votre propre compte ni retirer votre rôle administrateur.',
      );
    }
    if (current.global_role === 'admin' && (!active || role !== 'admin')) {
      const admins = await this.db.query(
        "SELECT COUNT(*)::int AS count FROM app_users WHERE global_role = 'admin' AND active = TRUE",
      );
      if (Number(admins[0]?.count ?? 0) <= 1) {
        throw new BadRequestException(
          'Au moins un administrateur actif doit être conservé.',
        );
      }
    }

    try {
      await this.db.transaction(async (manager) => {
        if (username !== current.username) {
          await manager.query(
            'UPDATE project_members SET "userId" = $1 WHERE "userId" = $2',
            [username, current.username],
          );
        }
        await manager.query(
          'UPDATE app_users SET username = $1, email = $2, global_role = $3, active = $4, updated_at = NOW() WHERE id = $5',
          [username, email, role, active, id],
        );
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException(
          'Cet identifiant ou cette adresse e-mail existe déjà.',
        );
      }
      throw error;
    }
    return { id, username, email, role, active };
  }

  @Post('password')
  async changeOwnPassword(
    @Req() request: Request,
    @Body() body: { currentPassword?: unknown; newPassword?: unknown },
  ) {
    const session = this.readSession(request);
    if (!session) {
      throw new UnauthorizedException('Session absente ou expirée.');
    }
    const rows: UserRow[] = await this.db.query(
      'SELECT id, username, email, password_hash, global_role, active FROM app_users WHERE lower(username) = lower($1) AND active = TRUE',
      [session.sub],
    );
    const user = rows[0];
    if (!user) throw new UnauthorizedException('Compte introuvable.');

    const currentPassword =
      typeof body.currentPassword === 'string' ? body.currentPassword : '';
    if (!this.verifyPassword(currentPassword, user.password_hash)) {
      throw new UnauthorizedException('Le mot de passe actuel est incorrect.');
    }
    const password = this.cleanPassword(body.newPassword);
    const salt = randomBytes(16).toString('hex');
    await this.db.query(
      'UPDATE app_users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      ['scrypt:' + salt + ':' + this.hashPassword(password, salt), user.id],
    );
    return { changed: true };
  }

  @Post('users/:id/password')
  async resetUserPassword(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: { newPassword?: unknown },
  ) {
    await this.requireAdmin(request);
    const password = this.cleanPassword(body.newPassword);
    const salt = randomBytes(16).toString('hex');
    const result = await this.db.query(
      'UPDATE app_users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
      ['scrypt:' + salt + ':' + this.hashPassword(password, salt), id],
    );
    if (!result.length) {
      throw new BadRequestException('Utilisateur introuvable.');
    }
    return { changed: true };
  }

  private async requireAdmin(request: Request): Promise<SessionPayload> {
    const session = this.readSession(request);
    if (!session) {
      throw new UnauthorizedException('Session absente ou expirée.');
    }
    const rows: UserRow[] = await this.db.query(
      'SELECT id, username, email, password_hash, global_role, active FROM app_users WHERE lower(username) = lower($1) AND active = TRUE',
      [session.sub],
    );
    if (session.impersonatorSub || !rows[0] || rows[0].global_role !== 'admin') {
      throw new ForbiddenException('Droits administrateur requis.');
    }
    return session;
  }

  private cleanUsername(value: unknown): string {
    if (
      typeof value !== 'string' ||
      !/^[a-zA-Z0-9._-]{3,64}$/.test(value.trim())
    ) {
      throw new BadRequestException(
        'L’identifiant doit contenir 3 à 64 caractères (lettres, chiffres, point, tiret ou soulignement).',
      );
    }
    return value.trim();
  }

  private cleanEmail(value: unknown): string | null {
    if (value === null || value === '' || value === undefined) return null;
    if (
      typeof value !== 'string' ||
      value.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
    ) {
      throw new BadRequestException('Adresse e-mail invalide.');
    }
    return value.trim().toLocaleLowerCase();
  }

  private cleanPassword(value: unknown): string {
    if (typeof value !== 'string' || value.length < 12 || value.length > 1024) {
      throw new BadRequestException(
        'Le mot de passe doit contenir au moins 12 caractères.',
      );
    }
    return value;
  }

  private cleanRole(value: unknown): GlobalRole {
    if (value !== 'admin' && value !== 'modeler' && value !== 'viewer') {
      throw new BadRequestException('Rôle global invalide.');
    }
    return value;
  }

  private hashPassword(password: string, salt: string): string {
    return scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString(
      'hex',
    );
  }

  private verifyPassword(password: string, stored: string): boolean {
    const parts = (stored || '').split(':');
    if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
    try {
      return this.constantTimeEquals(
        this.hashPassword(password, parts[1]),
        parts[2],
      );
    } catch {
      return false;
    }
  }

  private groupsForRole(role: GlobalRole): string[] {
    if (role === 'admin') {
      return ['bpmn-tool-readwrite-demo', 'bpmn-tool-admin-demo'];
    }
    if (role === 'modeler') return ['bpmn-tool-readwrite-demo'];
    return ['bpmn-tool-readonly-demo'];
  }

  private unauthorized(response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    return response.status(401).json({
      statusCode: 401,
      message: 'Identifiant ou mot de passe incorrect.',
    });
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      !!error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === '23505'
    );
  }

  private signPayload(payload: SessionPayload, secret: string): string {
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return encoded + '.' + this.signature(encoded, secret);
  }

  private signature(value: string, secret: string): string {
    return createHmac('sha256', secret).update(value).digest('base64url');
  }

  private getSecret(): string | null {
    const secret = this.config.get<string>('authSessionSecret');
    return secret && Buffer.byteLength(secret, 'utf8') >= 32 ? secret : null;
  }

  private constantTimeEquals(left: string, right: string): boolean {
    const a = Buffer.from(left);
    const b = Buffer.from(right);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private readSession(request: Request): SessionPayload | null {
    const token = this.readCookie(request.headers.cookie, COOKIE_NAME);
    const secret = this.getSecret();
    if (!token || !secret) return null;

    const separator = token.lastIndexOf('.');
    if (separator <= 0) return null;
    const encoded = token.slice(0, separator);
    const supplied = token.slice(separator + 1);
    if (!this.constantTimeEquals(supplied, this.signature(encoded, secret))) {
      return null;
    }

    try {
      const payload = JSON.parse(
        Buffer.from(encoded, 'base64url').toString('utf8'),
      ) as Partial<SessionPayload>;
      if (
        typeof payload.sub !== 'string' ||
        !payload.sub ||
        !Array.isArray(payload.groups) ||
        !payload.groups.every((group) => typeof group === 'string') ||
        !['admin', 'modeler', 'viewer'].includes(payload.role as string) ||
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

  private cookie(value: string, maxAge: number, secure: boolean): string {
    return [
      COOKIE_NAME + '=' + value,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      'Max-Age=' + maxAge,
      ...(secure ? ['Secure'] : []),
    ].join('; ');
  }
}
