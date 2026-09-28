/** Common status labels used across the product UI. */
const status = {
    labels: {
        ACTIVE: 'Active',
        INACTIVE: 'Inactive',
        ARCHIVED: 'Archived',
        PENDING: 'Pending',
        COMPLETED: 'Completed',
        IN_PROGRESS: 'In progress',
        CANCELED: 'Canceled',
        OVERDUE: 'Overdue',
        DRAFT: 'Draft',
        OK: 'OK',
        DEGRADED: 'Degraded',
        ERROR: 'Error',
    },
} as const;

export default status;
