import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { UserRole } from '../database/schema.constants.js';
import { ROLES_KEY } from './roles.decorator.js';
import type { AuthenticatedUser } from './authenticated-user.interface.js';
import { hasRoleAccess } from './role-access.util.js';

type AuthenticatedRequest = Request & {
  authUser?: AuthenticatedUser;
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.authUser;

    if (!user) {
      throw new ForbiddenException('Authenticated user is required');
    }

    if (!hasRoleAccess(user.role, requiredRoles)) {
      throw new ForbiddenException(
        `Role ${user.role} is not allowed to access this resource`,
      );
    }

    return true;
  }
}
