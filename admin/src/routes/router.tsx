import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AdminShell } from '../components/admin-shell';
import { AssignmentDetailPage } from '../features/assignments/assignment-detail-page';
import { AssignmentFormPage } from '../features/assignments/assignment-form-page';
import { LoginPage } from '../features/auth/login-page';
import { DashboardPage } from '../features/dashboard/dashboard-page';
import { AssignmentsPage } from '../features/assignments/assignments-page';
import { QcQueuePage } from '../features/qc/qc-queue-page';
import { QcRecordDetailPage } from '../features/qc/qc-record-detail-page';
import { RecordDetailPage } from '../features/records/record-detail-page';
import { RecordsPage } from '../features/records/records-page';
import { DuplicatesPage } from '../features/duplicates/duplicates-page';
import { MissingnessPage } from '../features/missingness/missingness-page';
import { DeviceReplacementPage } from '../features/devices/device-replacement-page';
import { UserFormPage } from '../features/users/user-form-page';
import { UsersPage } from '../features/users/users-page';
import { DevicesPage } from '../features/devices/devices-page';
import { ExportPage } from '../features/export/export-page';
import { AuditPage } from '../features/audit/audit-page';
import { ManualPage } from '../features/manual/manual-page';
import { ProtectedRoute } from './protected-route';
import { RoleRoute } from './role-route';

export const appRouter = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminShell />,
        children: [
          {
            index: true,
            element: <Navigate to="/dashboard" replace />,
          },
          {
            element: <RoleRoute allowedRoles={['PI', 'ADMIN']} />,
            children: [
              { path: '/dashboard', element: <DashboardPage /> },
              { path: '/records', element: <RecordsPage /> },
              { path: '/records/:recordId', element: <RecordDetailPage /> },
              { path: '/missingness', element: <MissingnessPage /> },
              { path: '/audit', element: <AuditPage /> },
            ],
          },
          {
            element: <RoleRoute allowedRoles={['PI', 'ADMIN']} />,
            children: [
              { path: '/assignments', element: <AssignmentsPage /> },
              { path: '/assignments/new', element: <AssignmentFormPage /> },
              { path: '/assignments/:assignmentId', element: <AssignmentDetailPage /> },
              {
                path: '/assignments/:assignmentId/edit',
                element: <AssignmentFormPage />,
              },
            ],
          },
          {
            element: <RoleRoute allowedRoles={['PI']} />,
            children: [
              { path: '/export', element: <ExportPage /> },
            ],
          },
          {
            element: <RoleRoute allowedRoles={['QC', 'PI', 'ADMIN']} />,
            children: [{ path: '/manual', element: <ManualPage /> }],
          },
          {
            element: <RoleRoute allowedRoles={['QC', 'PI']} />,
            children: [
              { path: '/qc', element: <QcQueuePage /> },
              { path: '/qc/:recordId', element: <QcRecordDetailPage /> },
              { path: '/duplicates', element: <DuplicatesPage /> },
            ],
          },
          {
            element: <RoleRoute allowedRoles={['ADMIN']} />,
            children: [
              { path: '/users', element: <UsersPage /> },
              { path: '/users/new', element: <UserFormPage /> },
              { path: '/users/:userId/edit', element: <UserFormPage /> },
              { path: '/devices', element: <DevicesPage /> },
              { path: '/devices/replacement', element: <DeviceReplacementPage /> },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
]);
