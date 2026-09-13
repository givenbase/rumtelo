/**
 * Fastify hooks for oRPC compatibility (empty body + defined:false responses).
 */

import { Logger } from '@nestjs/common';
import { type NestFastifyApplication } from '@nestjs/platform-fastify';

const logger = new Logger('ORPC-Error-Fix');

const ERROR_STATUS_MAP: Record<string, number> = {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_SUPPORTED: 405,
    TIMEOUT: 408,
    CONFLICT: 409,
    PRECONDITION_FAILED: 412,
    PAYLOAD_TOO_LARGE: 413,
    UNSUPPORTED_MEDIA_TYPE: 415,
    UNPROCESSABLE_CONTENT: 422,
    TOO_MANY_REQUESTS: 429,
    CLIENT_CLOSED_REQUEST: 499,
    INTERNAL_SERVER_ERROR: 500,
};

export async function setupOrpcErrorFix(app: NestFastifyApplication): Promise<void> {
    const fastifyInstance = app.getHttpAdapter().getInstance();

    fastifyInstance.addHook(
        'preHandler',
        async (request: { body?: unknown; method?: string; url?: string }) => {
            const hasEmptyBody =
                request.body === null ||
                request.body === '' ||
                (typeof request.body === 'string' && request.body.trim() === '');

            if (!hasEmptyBody) return;

            const method = request.method?.toUpperCase();
            const isMutating =
                method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
            if (!isMutating) return;

            const url = request.url?.split('?')[0] ?? '';
            if (url.startsWith('/rpc/') || url.startsWith('/api/')) {
                request.body = {};
            }
        }
    );

    fastifyInstance.addHook('onSend', async (request, reply, payload) => {
        const contentType = reply.getHeader('content-type');
        if (typeof contentType !== 'string' || !contentType.includes('application/json')) {
            return payload;
        }

        try {
            let body: unknown;
            if (typeof payload === 'string') {
                if (!payload.trim()) return payload;
                body = JSON.parse(payload);
            } else if (Buffer.isBuffer(payload)) {
                if (payload.length === 0) return payload;
                body = JSON.parse(payload.toString('utf-8'));
            } else {
                body = payload;
            }

            if (
                body &&
                typeof body === 'object' &&
                'defined' in body &&
                (body as { defined?: boolean }).defined === false &&
                'code' in body &&
                typeof (body as { code?: unknown }).code === 'string'
            ) {
                const code = (body as { code: string }).code;
                const properStatusCode = ERROR_STATUS_MAP[code] || 500;
                if (
                    code === 'BAD_REQUEST' &&
                    (body as { data?: { issues?: unknown } }).data?.issues
                ) {
                    logger.warn(
                        `Input validation failed: ${JSON.stringify((body as { data?: unknown }).data)}`
                    );
                } else if (code === 'INTERNAL_SERVER_ERROR') {
                    const errBody = body as {
                        message?: string;
                        data?: { issues?: unknown };
                        cause?: { issues?: unknown; data?: unknown; message?: string };
                    };
                    const message = errBody.message ?? 'no message';
                    const issues = errBody.data?.issues ?? errBody.cause?.issues;
                    const output = errBody.cause?.data;
                    logger.error(
                        `ORPC ${code} on ${request.method} ${request.url}: ${message}` +
                            (issues ? ` issues=${JSON.stringify(issues)}` : '') +
                            (output && message === 'Output validation failed'
                                ? ` output=${JSON.stringify(output)}`
                                : '')
                    );
                }

                reply.code(properStatusCode);
                return JSON.stringify({
                    ...body,
                    defined: true,
                    status: properStatusCode,
                });
            }
        } catch (error) {
            logger.error('Error parsing response payload', error);
        }

        return payload;
    });

    logger.log('ORPC error response fix configured');
}
