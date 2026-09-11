import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.interface.js';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard.js';
import { Roles } from '../../common/auth/roles.decorator.js';
import { RolesGuard } from '../../common/auth/roles.guard.js';
import { SuperbinService } from './superbin.service.js';

@Controller('superbin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPERADMIN')
export class SuperbinController {
  constructor(private readonly superbinService: SuperbinService) {}

  @Get(':collection')
  listDeletedItems(
    @CurrentUser() user: AuthenticatedUser,
    @Param('collection') collection: string,
  ) {
    return this.superbinService.listDeletedItems(user, collection);
  }

  @Post(':collection/:id/restore')
  restoreItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('collection') collection: string,
    @Param('id') id: string,
  ) {
    return this.superbinService.restoreItem(user, collection, id);
  }

  @Delete(':collection/:id')
  permanentlyDeleteItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('collection') collection: string,
    @Param('id') id: string,
  ) {
    return this.superbinService.permanentlyDeleteItem(user, collection, id);
  }
}
