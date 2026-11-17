import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  errors?: unknown;
}

/** Глобальный фильтр: единый формат ошибок в духе RFC 7807 (problem+json). */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const body: ProblemDetails = {
      type: 'about:blank',
      title: 'Ошибка обработки запроса',
      status,
      instance: request.url,
    };

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        body.detail = res;
      } else if (typeof res === 'object' && res !== null) {
        const r = res as Record<string, unknown>;
        body.title = typeof r.error === 'string' ? r.error : body.title;
        if (Array.isArray(r.message)) {
          body.detail = (r.message as string[]).join('; ');
          body.errors = r.message;
        } else if (typeof r.message === 'string') {
          body.detail = r.message;
        }
      }
    } else {
      body.detail = 'Внутренняя ошибка сервера';
      this.logger.error((exception as Error)?.message, (exception as Error)?.stack);
    }

    response.status(status).json(body);
  }
}
