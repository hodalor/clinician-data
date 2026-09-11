import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import type { Request } from 'express';
import { runWithAuditContext } from './audit-context.js';

type RequestWithAuth = Request & {
  authUser?: {
    userId: string;
  };
};

@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const body = request.body as Record<string, unknown> | undefined;

    return new Observable((subscriber) => {
      runWithAuditContext(
        {
          changedBy: request.authUser?.userId ?? null,
          reason: this.extractReason(body),
          appVersion: this.extractAppVersion(request, body),
        },
        () => {
          const stream = next.handle();
          const subscription = stream.subscribe({
            next: (value) => subscriber.next(value),
            error: (error) => subscriber.error(error),
            complete: () => subscriber.complete(),
          });

          return () => subscription.unsubscribe();
        },
      );
    });
  }

  private extractReason(body?: Record<string, unknown>) {
    const candidates = [
      body?.reason,
      body?.qc_comment,
      body?.error_detail,
      body?.note,
    ];

    for (const value of candidates) {
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }

    return null;
  }

  private extractAppVersion(request: Request, body?: Record<string, unknown>) {
    const headerVersion = request.headers['x-app-version'];

    if (typeof headerVersion === 'string' && headerVersion.trim().length > 0) {
      return headerVersion.trim();
    }

    if (
      typeof body?.app_version === 'string' &&
      body.app_version.trim().length > 0
    ) {
      return body.app_version.trim();
    }

    return null;
  }
}
