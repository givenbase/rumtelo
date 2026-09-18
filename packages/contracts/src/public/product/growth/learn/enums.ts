/**
 * Where a title sits on a person's shelf.
 * This set does not grow. A skill is not in here — it is a key, so the list can.
 * @see LearnSkillKey in learn.schema.ts
 */
export enum LearnProgressStatus {
    QUEUE = 'QUEUE',
    NOW = 'NOW',
    DONE = 'DONE',
}
