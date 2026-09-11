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
import type { UpsertAssignmentDto } from './dto/upsert-assignment.dto.js';
import { AssignmentsService } from './assignments.service.js';

@Controller('assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get('active')
  @Roles('RA')
  getActiveAssignment(@CurrentUser() user: AuthenticatedUser) {
    return this.assignmentsService.getActiveAssignment(user);
  }

  @Get()
  @Roles('PI', 'ADMIN')
  listAssignments(@CurrentUser() user: AuthenticatedUser) {
    return this.assignmentsService.listAssignments(user);
  }

  @Get('options')
  @Roles('PI', 'ADMIN')
  getAssignmentOptions(@CurrentUser() user: AuthenticatedUser) {
    return this.assignmentsService.getAssignmentOptions(user);
  }

  @Get(':id')
  @Roles('PI', 'ADMIN')
  getAssignmentDetail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.assignmentsService.getAssignmentDetail(user, id);
  }

  @Post()
  @Roles('PI', 'ADMIN')
  createAssignment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: UpsertAssignmentDto,
  ) {
    return this.assignmentsService.createAssignment(user, payload);
  }

  @Put(':id')
  @Roles('PI', 'ADMIN')
  updateAssignment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() payload: UpsertAssignmentDto,
  ) {
    return this.assignmentsService.updateAssignment(user, id, payload);
  }
}
