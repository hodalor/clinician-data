import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.interface.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard.js';
import { Roles } from '../../common/auth/roles.decorator.js';
import { RolesGuard } from '../../common/auth/roles.guard.js';
import type {
  QcAssignDto,
  QcDuplicateResolveDto,
  QcReabstractDto,
  QcResolveDto,
} from './dto/qc-workflow.dto.js';
import { QcService } from './qc.service.js';

@Controller('qc')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QcController {
  constructor(private readonly qcService: QcService) {}

  @Post('assign')
  @Roles('PI')
  assignRecords(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: QcAssignDto,
  ) {
    return this.qcService.assignRecords(user, payload);
  }

  @Post(':recordId/reabstract')
  @Roles('QC', 'PI')
  reabstract(
    @CurrentUser() user: AuthenticatedUser,
    @Param('recordId') recordId: string,
    @Body() payload: QcReabstractDto,
  ) {
    return this.qcService.submitReabstractedValues(user, recordId, payload);
  }

  @Get(':recordId/compare')
  @Roles('QC', 'PI')
  compare(
    @CurrentUser() user: AuthenticatedUser,
    @Param('recordId') recordId: string,
  ) {
    return this.qcService.compareRecord(recordId, user);
  }

  @Post(':recordId/resolve')
  @Roles('QC', 'PI')
  resolve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('recordId') recordId: string,
    @Body() payload: QcResolveDto,
  ) {
    return this.qcService.resolveRecord(user, recordId, payload);
  }

  @Get('duplicates')
  @Roles('QC', 'PI')
  duplicates(@CurrentUser() user: AuthenticatedUser) {
    return this.qcService.listDuplicateQueue(user);
  }

  @Post('duplicates/:recordId/resolve')
  @Roles('QC', 'PI')
  resolveDuplicate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('recordId') recordId: string,
    @Body() payload: QcDuplicateResolveDto,
  ) {
    return this.qcService.resolveDuplicate(user, recordId, payload);
  }
}
