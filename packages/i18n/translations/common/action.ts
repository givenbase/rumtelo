/**
 * Common action phrases — parameterized with {entity} where useful.
 * Shared action labels — no healthcare / POS vocabulary.
 */
const action = {
    create: 'Create {entity}',
    update: 'Update {entity}',
    delete: 'Delete {entity}',
    save: 'Save {entity}',
    cancel: 'Cancel',
    confirm: 'Confirm',
    back: 'Back',
    next: 'Next',
    continue: 'Continue',
    close: 'Close',
    search: 'Search',
    export: 'Export {entity}',
    import: 'Import {entity}',
    select: 'Select {entity}',
    edit: 'Edit',
    add: 'Add {entity}',
    remove: 'Remove {entity}',
} as const;

export default action;
