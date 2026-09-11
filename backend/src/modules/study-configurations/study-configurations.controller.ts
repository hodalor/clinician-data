import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.interface.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard.js';
import { Roles } from '../../common/auth/roles.decorator.js';
import { RolesGuard } from '../../common/auth/roles.guard.js';
import { StudyConfigurationsService } from './study-configurations.service.js';

@Controller('config')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudyConfigurationsController {
  constructor(
    private readonly studyConfigurationsService: StudyConfigurationsService,
  ) {}

  @Get('initial-destination-codes')
  @Roles('RA', 'QC', 'PI', 'ADMIN')
  getInitialDestinationCodes() {
    return this.studyConfigurationsService.getInitialDestinationCodes();
  }

  @Put('initial-destination-codes')
  @Roles('PI', 'ADMIN')
  updateInitialDestinationCodes(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: { values?: Array<{ code?: string; label?: string }> },
  ) {
    return this.studyConfigurationsService.updateInitialDestinationCodes(
      user,
      payload,
    );
  }
}
