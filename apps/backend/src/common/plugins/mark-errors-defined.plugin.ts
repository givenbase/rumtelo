/**
 * Mark Errors Defined Plugin
 *
 * Workaround for @orpc/nest: contract error definitions are not transferred to
 * runtime procedures, so ORPCErrors serialize as defined:false → HTTP 500.
 */

import { Logger } from '@nestjs/common';
import { ORPCError } from '@orpc/server';

import { mapToOrpcClientError } from '../utils/database-constraint-error.util';

export class MarkErrorsDefinedPlugin {
    name = 'mark-errors-defined';
    private readonly logger = new Logger('ORPC');

    async onError(params: { error: unknown; meta: unknown }) {
        const before = params.error;
        params.error = mapToOrpcClientError(params.error);

        // mapToOrpcClientError leaves unknown throws as-is — those become opaque 500s.
        if (!(params.error instanceof ORPCError)) {
            const err = before instanceof Error ? before : new Error(String(before));
            this.logger.error(
                `Unhandled procedure error: ${err.message}`,
                err.stack ?? String(before)
            );
        }

        if (params.error instanceof ORPCError) {
            const originalToJSON = params.error.toJSON?.bind(params.error);
            if (originalToJSON) {
                params.error.toJSON = () => {
                    const json = originalToJSON();
                    return { ...json, defined: true };
                };
            }
        }

        return params.error;
    }
}
