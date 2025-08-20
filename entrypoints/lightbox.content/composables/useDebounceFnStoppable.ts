import {
    createFilterWrapper,
    DebounceFilterOptions,
    PromisifyFn,
    AnyFn,
    noop,
    EventFilter,
} from '@vueuse/core';

function debounceFilter(
    ms: MaybeRefOrGetter<number>,
    options: DebounceFilterOptions = {},
) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let maxTimer: ReturnType<typeof setTimeout> | undefined | null;
    let lastRejector: AnyFn = noop;
    const _clearTimeout = (timer: ReturnType<typeof setTimeout>) => {
        clearTimeout(timer);
        lastRejector();
        lastRejector = noop;
    };

    let lastInvoker: () => void;

    const filter: EventFilter & { cancel?: () => void } = (invoke) => {
        const duration = toValue(ms);
        const maxDuration = toValue(options.maxWait);

        if (timer) _clearTimeout(timer);
        if (duration <= 0 || (maxDuration !== undefined && maxDuration <= 0)) {
            if (maxTimer) {
                _clearTimeout(maxTimer);
                maxTimer = null;
            }
            return Promise.resolve(invoke());
        }
        return new Promise((resolve, reject) => {
            lastRejector = options.rejectOnCancel ? reject : resolve;
            lastInvoker = invoke;
            // Create the maxTimer. Clears the regular timer on invoke
            if (maxDuration && !maxTimer) {
                maxTimer = setTimeout(() => {
                    if (timer) _clearTimeout(timer);
                    maxTimer = null;
                    resolve(lastInvoker());
                }, maxDuration);
            }
            // Create the regular timer. Clears the max timer on invoke
            timer = setTimeout(() => {
                if (maxTimer) _clearTimeout(maxTimer);
                maxTimer = null;
                resolve(invoke());
            }, duration);
        });
    };

    filter.cancel = () => {
        if (timer) _clearTimeout(timer);
        if (maxTimer) _clearTimeout(maxTimer);
        maxTimer = null;
    };

    return filter;
}

export function useDebounceFnStoppable<T extends (...args: any) => any>(
    fn: T,
    ms: number,
    options: DebounceFilterOptions = {},
): PromisifyFn<T> & { cancel: () => void } {
    const filter = debounceFilter(ms, options);
    const wrapped = createFilterWrapper(filter, fn) as PromisifyFn<T> & {
        cancel: () => void;
    };
    wrapped.cancel = () => filter.cancel?.();
    return wrapped;
}
