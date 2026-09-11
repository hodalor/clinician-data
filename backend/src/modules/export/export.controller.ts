import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.interface.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard.js';
import { Roles } from '../../common/auth/roles.decorator.js';
import { RolesGuard } from '../../common/auth/roles.guard.js';
import { ExportService } from './export.service.js';

@Controller('export')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PI')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('master.csv')
  async getMasterCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: Record<string, string | undefined>,
    @Res() response: Response,
  ) {
    await this.exportService.logExportAction(user, 'master.csv', filters);
    const csv = await this.exportService.getMasterCsv(filters);
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="master-export.csv"',
    );
    response.send(csv);
  }

  @Get('master.xlsx')
  async getMasterXlsx(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: Record<string, string | undefined>,
    @Res() response: Response,
  ) {
    await this.exportService.logExportAction(user, 'master.xlsx', filters);
    const workbook = await this.exportService.getMasterXlsx(filters);
    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="master-export.xlsx"',
    );
    response.send(workbook);
  }

  @Get('codebook.xlsx')
  async getCodebook(
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    await this.exportService.logExportAction(user, 'codebook.xlsx', {});
    const workbook = await this.exportService.getCodebookXlsx();
    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="codebook.xlsx"',
    );
    response.send(workbook);
  }

  @Get('qc-report')
  async getQcReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: Record<string, string | undefined>,
  ) {
    await this.exportService.logExportAction(user, 'qc-report', filters);
    return this.exportService.getQcReport(filters);
  }

  @Get('qc-report.xlsx')
  async getQcReportXlsx(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: Record<string, string | undefined>,
    @Res() response: Response,
  ) {
    await this.exportService.logExportAction(user, 'qc-report.xlsx', filters);
    const workbook = await this.exportService.getQcReportXlsx(filters);
    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="qc-report.xlsx"',
    );
    response.send(workbook);
  }

  @Get('missing-data-report')
  @Roles('PI', 'ADMIN')
  async getMissingDataReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: Record<string, string | undefined>,
  ) {
    await this.exportService.logExportAction(
      user,
      'missing-data-report',
      filters,
    );
    return this.exportService.getMissingDataReport(filters);
  }

  @Get('missing-data-report.xlsx')
  @Roles('PI', 'ADMIN')
  async getMissingDataReportXlsx(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: Record<string, string | undefined>,
    @Res() response: Response,
  ) {
    await this.exportService.logExportAction(
      user,
      'missing-data-report.xlsx',
      filters,
    );
    const workbook = await this.exportService.getMissingDataReportXlsx(filters);
    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="missing-data-report.xlsx"',
    );
    response.send(workbook);
  }

  @Get('exclusion-log')
  async getExclusionLog(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: Record<string, string | undefined>,
  ) {
    await this.exportService.logExportAction(user, 'exclusion-log', filters);
    return this.exportService.getExclusionLog(filters);
  }

  @Get('exclusion-log.xlsx')
  async getExclusionLogXlsx(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: Record<string, string | undefined>,
    @Res() response: Response,
  ) {
    await this.exportService.logExportAction(
      user,
      'exclusion-log.xlsx',
      filters,
    );
    const workbook = await this.exportService.getExclusionLogXlsx(filters);
    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="exclusion-log.xlsx"',
    );
    response.send(workbook);
  }

  @Get('progress-report')
  @Roles('PI', 'ADMIN')
  async getProgressReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: Record<string, string | undefined>,
  ) {
    await this.exportService.logExportAction(user, 'progress-report', filters);
    return this.exportService.getProgressReport(filters);
  }

  @Get('progress-report.xlsx')
  @Roles('PI', 'ADMIN')
  async getProgressReportXlsx(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: Record<string, string | undefined>,
    @Res() response: Response,
  ) {
    await this.exportService.logExportAction(
      user,
      'progress-report.xlsx',
      filters,
    );
    const workbook = await this.exportService.getProgressReportXlsx(filters);
    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="progress-report.xlsx"',
    );
    response.send(workbook);
  }
}
