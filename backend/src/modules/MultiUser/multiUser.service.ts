import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { Repository } from 'typeorm';
import { UserRole } from './domain/userRole';
import { UserOrmEntity } from './infrastructure/user.ormEntity';
import { UserSessionOrmEntity } from './infrastructure/userSession.ormEntity';

@Injectable()
export class MultiUserService {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly users: Repository<UserOrmEntity>,
    @InjectRepository(UserSessionOrmEntity)
    private readonly sessions: Repository<UserSessionOrmEntity>,
  ) {}

  async login(username: string, password: string) {
    const user = await this.users.findOne({ where: { username, enabled: true } });
    if (!user || !this.verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

    await this.sessions.save(
      this.sessions.create({ userId: user.id, tokenHash, expiresAt }),
    );

    return {
      token,
      expiresAt,
      user: this.publicUser(user),
    };
  }

  async me(token: string) {
    const session = await this.findSession(token);
    return this.publicUser(session.user);
  }

  async logout(token: string) {
    await this.sessions.delete({ tokenHash: this.hashToken(token) });
  }

  async findSession(token: string) {
    const session = await this.sessions.findOne({
      where: { tokenHash: this.hashToken(token) },
      relations: { user: true },
    });

    if (!session || session.expiresAt <= new Date() || !session.user.enabled) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    return session;
  }

  async setupInitialAdmin(username: string, displayName: string, password: string) {
    if ((await this.users.count()) > 0) {
      throw new ForbiddenException('Initial setup is already completed');
    }

    try {
      const user = this.users.create({
        username,
        displayName,
        passwordHash: MultiUserService.hashPassword(password),
        role: UserRole.ADMIN,
        enabled: true,
      });
      return this.publicUser(await this.users.save(user));
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Username already exists');
      }
      throw error;
    }
  }

  async listUsers() {
    const users = await this.users.find({ order: { username: 'ASC' } });
    return users.map((user) => this.publicUser(user));
  }

  async createUser(
    username: string,
    displayName: string,
    password: string,
    role: UserRole,
  ) {
    try {
      const user = this.users.create({
        username,
        displayName,
        passwordHash: MultiUserService.hashPassword(password),
        role,
        enabled: true,
      });
      return this.publicUser(await this.users.save(user));
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Username already exists');
      }
      throw error;
    }
  }

  async updateUser(
    id: string,
    changes: {
      displayName?: string;
      password?: string;
      role?: UserRole;
      enabled?: boolean;
    },
  ) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (changes.role && user.role === UserRole.ADMIN && changes.role !== UserRole.ADMIN) {
      await this.ensureAnotherAdminExists(user.id);
    }
    if (changes.enabled === false && user.role === UserRole.ADMIN) {
      await this.ensureAnotherAdminExists(user.id);
    }

    if (changes.displayName !== undefined) user.displayName = changes.displayName;
    if (changes.password !== undefined) {
      user.passwordHash = MultiUserService.hashPassword(changes.password);
    }
    if (changes.role !== undefined) user.role = changes.role;
    if (changes.enabled !== undefined) user.enabled = changes.enabled;

    const saved = await this.users.save(user);
    return this.publicUser(saved);
  }

  async deleteUser(id: string) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === UserRole.ADMIN) {
      await this.ensureAnotherAdminExists(user.id);
    }

    await this.users.delete({ id });
    return { success: true };
  }

  private async ensureAnotherAdminExists(excludedUserId: string) {
    const count = await this.users.count({
      where: { role: UserRole.ADMIN, enabled: true },
    });
    const excluded = await this.users.findOne({
      where: { id: excludedUserId, role: UserRole.ADMIN, enabled: true },
    });
    if (excluded && count <= 1) {
      throw new ForbiddenException('At least one enabled admin must remain');
    }
  }

  private isUniqueViolation(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === '23505'
    );
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  static hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const derived = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${derived}`;
  }

  private verifyPassword(password: string, stored: string) {
    const [salt, expected] = stored.split(':');
    if (!salt || !expected) return false;

    const actual = scryptSync(password, salt, 64);
    const expectedBuffer = Buffer.from(expected, 'hex');
    return (
      expectedBuffer.length === actual.length &&
      timingSafeEqual(actual, expectedBuffer)
    );
  }

  private publicUser(user: UserOrmEntity) {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      enabled: user.enabled,
      canModify:
        user.role === UserRole.EDITOR || user.role === UserRole.ADMIN,
      canAdministerUsers: user.role === UserRole.ADMIN,
    };
  }
}
