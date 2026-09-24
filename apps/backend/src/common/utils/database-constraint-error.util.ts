import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { HttpException } from '@nestjs/common';
import { ORPCError } from '@orpc/server';
import { APIError } from 'better-auth/api';

export type ConstraintFieldIssue = {
    message: string;
    path: string[];
};

export type ParsedUniqueConstraint = {
    constraint?: string;
    field?: string;
    message: string;
    value?: string;
};

const FIELD_CONFLICT_MESSAGE: Record<string, string> = {
    email: 'This email address is already registered. Please use a different email.',
    phone: 'This phone number is already registered. Please use a different number.',
    username: 'This username is already taken. Please choose another one.',
    slug: 'This slug is already in use. Please choose a different slug.',
    key: 'This key is already in use.',
};

function walkErrorNodes(error: unknown, maxDepth = 6): unknown[] {
    const nodes: unknown[] = [];
    const seen = new Set<object>();
    let current: unknown = error;
    let depth = 0;

    while (current && depth < maxDepth) {
        nodes.push(current);
        if (typeof current !== 'object') break;
        if (seen.has(current)) break;
        seen.add(current);
        const row = current as { cause?: unknown; driverError?: unknown; originalError?: unknown };
        current = row.cause ?? row.driverError ?? row.originalError;
        depth += 1;
    }

    return nodes;
}

function firstString(...values: unknown[]): string {
    for (const value of values) {
        if (typeof value === 'string' && value.trim()) return value;
    }
    return '';
}

function toFormFieldName(column: string): string {
    const trimmed = column.trim();
    if (!trimmed || trimmed.includes(',')) return '';
    return trimmed.replaceAll(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function humanizeField(field: string): string {
    return field
        .replaceAll(/([A-Z])/g, ' $1')
        .replaceAll('_', ' ')
        .trim()
        .toLowerCase();
}

function conflictMessageForField(field: string): string {
    const lookup = field.replaceAll('_', '').toLowerCase();
    return (
        FIELD_CONFLICT_MESSAGE[field] ??
        FIELD_CONFLICT_MESSAGE[lookup] ??
        `This ${humanizeField(field)} is already in use. Please use a different value.`
    );
}

export function parseUniqueConstraint(error: unknown): null | ParsedUniqueConstraint {
    const nodes = walkErrorNodes(error);
    const blob = nodes
        .map(node => {
            if (node instanceof Error) return node.message;
            if (typeof node === 'string') return node;
            return '';
        })
        .filter(Boolean)
        .join('\n');

    let constraint = '';
    let detail = '';
    let code = '';

    for (const node of nodes) {
        if (!node || typeof node !== 'object') continue;
        const row = node as { code?: unknown; constraint?: unknown; detail?: unknown };
        constraint = firstString(constraint, row.constraint);
        detail = firstString(detail, row.detail);
        code = firstString(code, row.code);
    }

    const isUnique =
        error instanceof UniqueConstraintViolationException ||
        nodes.some(
            node =>
                typeof node === 'object' &&
                node !== null &&
                'name' in node &&
                (node as { name?: unknown }).name === 'UniqueConstraintViolationException'
        ) ||
        code === '23505' ||
        /duplicate key value violates unique constraint/i.test(blob);

    if (!isUnique) return null;

    const constraintMatch = blob.match(/unique constraint "([^"]+)"/i);
    if (!constraint) constraint = constraintMatch?.[1] ?? '';

    const detailMatch =
        detail.match(/Key \(([^)]+)\)=\(([^)]*)\)/i) ?? blob.match(/Key \(([^)]+)\)=\(([^)]*)\)/i);

    const columns = (detailMatch?.[1] ?? '')
        .split(',')
        .map(part => part.trim())
        .filter(Boolean);
    const value = detailMatch?.[2]?.trim() ?? '';
    const field = columns.length === 1 ? toFormFieldName(columns[0] ?? '') : '';

    if (field) {
        return {
            constraint: constraint || undefined,
            field,
            message: conflictMessageForField(field),
            value: value || undefined,
        };
    }

    return {
        constraint: constraint || undefined,
        message: 'This value is already in use. Please use a different value.',
        value: value || undefined,
    };
}

export function uniqueConstraintToOrpcError(
    parsed: ParsedUniqueConstraint
): ORPCError<'CONFLICT', { field?: string; issues?: ConstraintFieldIssue[]; message: string }> {
    const issues: ConstraintFieldIssue[] | undefined = parsed.field
        ? [{ path: [parsed.field], message: parsed.message }]
        : undefined;

    return new ORPCError('CONFLICT', {
        message: parsed.message,
        data: {
            message: parsed.message,
            ...(parsed.field ? { field: parsed.field } : {}),
            ...(issues ? { issues } : {}),
        },
    });
}

/** Map unique-constraint / Nest / Better Auth failures to oRPC client errors. */
export function mapToOrpcClientError(error: unknown): unknown {
    if (error instanceof ORPCError) return error;

    const parsed = parseUniqueConstraint(error);
    if (parsed) return uniqueConstraintToOrpcError(parsed);

    if (error instanceof APIError) {
        const status = typeof error.statusCode === 'number' ? error.statusCode : 400;
        const code =
            status === 401
                ? 'UNAUTHORIZED'
                : status === 403
                  ? 'FORBIDDEN'
                  : status === 404
                    ? 'NOT_FOUND'
                    : status === 429
                      ? 'TOO_MANY_REQUESTS'
                      : 'BAD_REQUEST';
        return new ORPCError(code, {
            message: error.message || 'Request failed',
        });
    }

    if (error instanceof HttpException) {
        const status = error.getStatus();
        const body = error.getResponse();
        let message: string;
        let params: Record<string, string | number> | undefined;

        if (typeof body === 'string') {
            message = body;
        } else if (body && typeof body === 'object') {
            const row = body as { message?: unknown; params?: unknown };
            if (Array.isArray(row.message)) {
                message = row.message.join(', ');
            } else if (typeof row.message === 'string' && row.message.trim()) {
                message = row.message.trim();
            } else {
                message = error.message;
            }
            if (row.params && typeof row.params === 'object' && !Array.isArray(row.params)) {
                params = row.params as Record<string, string | number>;
            }
        } else {
            message = error.message;
        }

        const code =
            status === 401
                ? 'UNAUTHORIZED'
                : status === 403
                  ? 'FORBIDDEN'
                  : status === 404
                    ? 'NOT_FOUND'
                    : status === 409
                      ? 'CONFLICT'
                      : status === 429
                        ? 'TOO_MANY_REQUESTS'
                        : status >= 500
                          ? 'INTERNAL_SERVER_ERROR'
                          : 'BAD_REQUEST';
        return new ORPCError(code, {
            message,
            data: {
                message,
                ...(params ? { params } : {}),
            },
        });
    }

    return error;
}

export function mapDatabaseConstraintErrorInterceptor(options: { next: () => Promise<unknown> }) {
    return options.next().catch((error: unknown) => {
        throw mapToOrpcClientError(error);
    });
}
