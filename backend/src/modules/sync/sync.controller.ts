import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.interface.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard.js';
import { Roles } from '../../common/auth/roles.decorator.js';
import { RolesGuard } from '../../common/auth/roles.guard.js';
import type { SyncRecordsDto } from './dto/sync-records.dto.js';
import { SyncService } from './sync.service.js';

@Controller('sync')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('records')
  @HttpCode(200)
  @Roles('RA')
  syncRecords(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-device-id') deviceId: string | undefined,
    @Body() payload: SyncRecordsDto,
  ) {
    return this.syncService.syncRecords(user, deviceId, payload);
  }

  @Get('checkpoint')
  @Roles('RA')
  getCheckpoint(
    @CurrentUser() user: AuthenticatedUser,
    @Query('device_id') deviceId: string,
  ) {
    return this.syncService.getCheckpoint(user, deviceId);
  }
}
