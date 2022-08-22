import { Action, DefaultProjectorFn, MemoizedSelector, Store } from '@ngrx/store';
import { combineLatest, Observable, of, OperatorFunction } from 'rxjs';
import { first, map, skipUntil, switchMap, tap } from 'rxjs/operators';

export type Lazy<T> = {
    fetched: boolean;
    pending: boolean;
    error?: any;
    data: T;
};

export const createLazy = <T>(data: T): Lazy<T> => ({
    fetched: false,
    pending: false,
    error: undefined,
    data,
});

type SelectLazyInput<T> = {
    store: Store;
    selector: MemoizedSelector<object, Lazy<T>, DefaultProjectorFn<Lazy<T>>>;
    loadAction?: Action;
    when?: MemoizedSelector<object, boolean, DefaultProjectorFn<boolean>>;
};

type LazyStateObservable<T = object> = Observable<Lazy<T>> & {
    select: <U>(selector: MemoizedSelector<object, U, DefaultProjectorFn<U>>) => Observable<U>;
};

export const selectLazy = <T>(input: SelectLazyInput<T>) => {
    const { store, selector, loadAction, when } = input;

    let lazy$: any = store.select(selector).pipe(
        switchMap(lazy => {
            const when$ = when ? store.select(when) : of(true);

            return when$.pipe(
                first(),
                tap(canLoad => {
                    if (!lazy.fetched && !lazy.pending && canLoad && loadAction) {
                        store.dispatch(loadAction);
                    }
                }),
                map(() => lazy),
            );
        }),
    );

    const select = <U>(selector: MemoizedSelector<object, U, DefaultProjectorFn<U>>) =>
        (lazy$ as Observable<Lazy<T>>).pipe(
            first(),
            switchMap(() => store.select(selector)),
        );

    lazy$.select = select;

    return lazy$ as LazyStateObservable<T>;
};

export const firstNotPending = <T>(): OperatorFunction<Lazy<T>, T> => {
    return source$ =>
        source$.pipe(
            first(lazy => lazy.fetched && !lazy.pending),
            map(lazy => lazy.data),
        );
};

export const skipUntilLazyLoaded = <T, U>(lazy$: Observable<Lazy<U>>): OperatorFunction<T, T> => {
    return source$ => source$.pipe(skipUntil(lazy$.pipe(firstNotPending())));
};

export function combineLazy<T1, T2>(
    store: Store,
    lazy1$: LazyStateObservable<T1>,
    lazy2$: LazyStateObservable<T2>,
): LazyStateObservable<[T1, T2]>;
export function combineLazy<T1, T2, T3>(
    store: Store,
    lazy1$: LazyStateObservable<T1>,
    lazy2$: LazyStateObservable<T2>,
    lazy3$: LazyStateObservable<T3>,
): LazyStateObservable<[T1, T2, T3]>;
export function combineLazy<T>(store: Store, ...lazies$: LazyStateObservable<any>[]): LazyStateObservable<T> {
    let lazy$: any = combineLatest(lazies$);

    const select = <U>(selector: MemoizedSelector<object, U, DefaultProjectorFn<U>>) =>
        (lazy$ as Observable<Lazy<T>>).pipe(
            first(),
            switchMap(() => store.select(selector)),
        );

    lazy$.select = select;

    return lazy$ as LazyStateObservable<T>;
}
