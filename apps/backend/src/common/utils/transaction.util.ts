import type { EntityManager } from '@mikro-orm/postgresql';
import { Logger } from '@nestjs/common';

const logger = new Logger('TransactionUtils');

/**
 * Run `operation` inside a transaction. If `providedEm` is set (nested call),
 * reuse it; otherwise open `em.transactional`.
 */
export async function executeWithTransaction<T>(
    operation: (em: EntityManager) => Promise<T>,
    em: EntityManager,
    providedEm?: EntityManager
): Promise<T> {
    try {
        if (providedEm) return operation(providedEm);
        return em.transactional(operation);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Transaction failed: ${message}`, {
            error,
            stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
    }
}
