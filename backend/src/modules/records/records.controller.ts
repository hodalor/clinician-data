import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.interface.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard.js';
import { Roles } from '../../common/auth/roles.decorator.js';
import { RolesGuard } from '../../common/auth/roles.guard.js';
import type { ReopenRecordDto } from './dto/reopen-record.dto.js';
import type { UpsertOutcomeDto } from './dto/upsert-outcome.dto.js';
import { RecordsService } from './records.service.js';

@Controller('records')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RecordsController {
  constructor(private readonly recordsService: RecordsService) {}

  @Post()
  @Roles('RA')
  createDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.recordsService.createDraft(user, payload);
  }

  @Put(':id')
  @Roles('RA')
  updateRecord(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.recordsService.updateRecord(id, user, payload);
  }

  @Get(':id')
  @Roles('RA', 'QC', 'PI', 'ADMIN')
  getRecordById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recordsService.getRecordById(id, user);
  }

  @Get(':id/audit')
  @Roles('RA', 'QC', 'PI', 'ADMIN')
  getRecordAuditHistory(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recordsService.getRecordAuditHistory(id, user);
  }

  @Get()
  @Roles('RA', 'QC', 'PI', 'ADMIN')
  getRecords(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.recordsService.getRecords(user, query);
  }

  @Post(':id/submit')
  @Roles('RA')
  submitRecord(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recordsService.submitRecord(id, user);
  }

  @Post(':id/outcome')
  @Roles('RA')
  upsertOutcome(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: UpsertOutcomeDto,
  ) {
    return this.recordsService.upsertOutcome(id, user, payload);
  }

  @Post(':id/reopen')
  @Roles('PI')
  reopenRecord(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: ReopenRecordDto,
  ) {
    return this.recordsService.reopenLockedRecord(id, user, payload.reason);
  }

  @Post(':id/delete')
  @Roles('PI', 'ADMIN')
  deleteRecord(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: { reason?: string },
  ) {
    return this.recordsService.softDeleteRecord(id, user, payload.reason ?? '');
  }
}
