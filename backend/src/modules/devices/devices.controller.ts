import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard.js';
import { Roles } from '../../common/auth/roles.decorator.js';
import { RolesGuard } from '../../common/auth/roles.guard.js';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.interface.js';
import { USER_ROLES } from '../../common/database/schema.constants.js';
import type { RegisterDeviceDto } from './dto/register-device.dto.js';
import { DevicesService } from './devices.service.js';

const ALL_ROLES = [...USER_ROLES];

@Controller('devices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('register')
  @Roles(...ALL_ROLES)
  registerDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Body() registerDeviceDto: RegisterDeviceDto,
  ) {
    return this.devicesService.registerDevice(user, registerDeviceDto);
  }

  @Get()
  @Roles('ADMIN')
  listDevices(@CurrentUser() user: AuthenticatedUser) {
    return this.devicesService.listDevices(user);
  }

  @Get('requests')
  @Roles('ADMIN')
  listDeviceRequests(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
  ) {
    return this.devicesService.listDeviceRequests(user, status ?? 'pending');
  }

  @Post(':id/deactivate')
  @Roles('ADMIN')
  deactivateDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.devicesService.deactivateDevice(user, id);
  }

  @Post('authorise-replacement')
  @Roles('ADMIN')
  authoriseReplacement(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: { user_id: string; device_id: string },
  ) {
    return this.devicesService.authoriseReplacement(user, payload);
  }

  @Post('requests/:id/approve')
  @Roles('ADMIN')
  approveDeviceRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.devicesService.approveDeviceRequest(user, id);
  }

  @Post('requests/:id/reject')
  @Roles('ADMIN')
  rejectDeviceRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.devicesService.rejectDeviceRequest(user, id);
  }
}
