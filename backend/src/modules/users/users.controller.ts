import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.interface.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard.js';
import { Roles } from '../../common/auth/roles.decorator.js';
import { RolesGuard } from '../../common/auth/roles.guard.js';
import type { UpsertUserDto } from './dto/upsert-user.dto.js';
import { UsersService } from './users.service.js';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  listUsers(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.listUsers(user);
  }

  @Post()
  createUser(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: UpsertUserDto,
  ) {
    return this.usersService.createUser(user, payload);
  }

  @Put(':id')
  updateUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() payload: UpsertUserDto,
  ) {
    return this.usersService.updateUser(user, id, payload);
  }
}
