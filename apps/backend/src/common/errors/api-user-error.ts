import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
    ServiceUnavailableException,
} from '@nestjs/common';

import { type ApiErrorMessageKey } from '@rumtelo/contracts';

export type ApiErrorParams = Record<string, string | number>;

/**
 * Nest exception whose `message` is an `@rumtelo/i18n` `common.message.error.api` leaf key.
 * Optional `params` travel in the response body for ICU placeholders (e.g. jar_split_total).
 */
export function apiBadRequest(key: ApiErrorMessageKey, params?: ApiErrorParams) {
    if (params) return new BadRequestException({ message: key, params });
    return new BadRequestException(key);
}

export function apiConflict(key: ApiErrorMessageKey, params?: ApiErrorParams) {
    if (params) return new ConflictException({ message: key, params });
    return new ConflictException(key);
}

export function apiForbidden(key: ApiErrorMessageKey, params?: ApiErrorParams) {
    if (params) return new ForbiddenException({ message: key, params });
    return new ForbiddenException(key);
}

export function apiNotFound(key: ApiErrorMessageKey, params?: ApiErrorParams) {
    if (params) return new NotFoundException({ message: key, params });
    return new NotFoundException(key);
}

export function apiUnavailable(key: ApiErrorMessageKey, params?: ApiErrorParams) {
    if (params) return new ServiceUnavailableException({ message: key, params });
    return new ServiceUnavailableException(key);
}
