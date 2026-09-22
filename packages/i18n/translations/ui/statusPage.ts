/** Shared status / empty / loader chrome used by @rumtelo/ui StatusPage etc. */
const status = {
    loading: 'Loading',
    back_home: 'Back home',
    try_again: 'Try again',
    go_back: 'Go back',
    continue: 'Continue',
    scaffold: 'Scaffold.',
    error: {
        title: 'Something went wrong',
        description:
            'We hit an unexpected problem loading this page. Try again — if it keeps happening, come back in a moment.',
    },
    not_found: {
        title: 'This page does not exist',
        description:
            'It may have moved, or the link may be wrong. Head back and pick up where you left off.',
    },
    access_denied: {
        title: 'You cannot open this',
        description: 'Your account does not have access to this part of Rumtelo.',
    },
    unauthorized: {
        title: 'Sign in to continue',
        description:
            'Your session ended or you are not signed in. Sign in again to pick up where you left off.',
    },
    maintenance: {
        title: 'Rumtelo is briefly offline',
        description:
            'We are doing a short update. Your jars and data are safe — try again in a few minutes.',
    },
    offline: {
        title: 'You appear to be offline',
        description:
            'Check your connection, then try again. Nothing here works without the network.',
    },
} as const;

export default status;
