import {
  Action,
  DefaultProjectorFn,
  MemoizedSelector,
  Store,
} from '@ngrx/store';
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
  select: <U>(
    selector: MemoizedSelector<object, U, DefaultProjectorFn<U>>
  ) => Observable<U>;
};

export const selectLazy = <T>(input: SelectLazyInput<T>) => {
  const { store, selector, loadAction, when } = input;

  let lazy$: any = store.select(selector).pipe(
    switchMap((lazy) => {
      const when$ = when ? store.select(when) : of(true);

      return when$.pipe(
        first(),
        tap((canLoad) => {
          if (!lazy.fetched && !lazy.pending && canLoad && loadAction) {
            store.dispatch(loadAction);
          }
        }),
        map(() => lazy)
      );
    })
  );

  const select = <U>(
    selector: MemoizedSelector<object, U, DefaultProjectorFn<U>>
  ) =>
    (lazy$ as Observable<Lazy<T>>).pipe(
      first(),
      switchMap(() => store.select(selector))
    );

  lazy$.select = select;

  return lazy$ as LazyStateObservable<T>;
};

export const firstNotPending = <T>(): OperatorFunction<Lazy<T>, T> => {
  return (source$) =>
    source$.pipe(
      first((lazy) => lazy.fetched && !lazy.pending),
      map((lazy) => lazy.data)
    );
};

export const skipUntilLazyLoaded = <T, U>(
  lazy$: Observable<Lazy<U>>
): OperatorFunction<T, T> => {
  return (source$) => source$.pipe(skipUntil(lazy$.pipe(firstNotPending())));
};

export function combineLazy<T1, T2>(
  store: Store,
  lazy1$: LazyStateObservable<T1>,
  lazy2$: LazyStateObservable<T2>
): LazyStateObservable<[T1, T2]>;
export function combineLazy<T1, T2, T3>(
  store: Store,
  lazy1$: LazyStateObservable<T1>,
  lazy2$: LazyStateObservable<T2>,
  lazy3$: LazyStateObservable<T3>
): LazyStateObservable<[T1, T2, T3]>;
export function combineLazy<T1, T2, T3, T4>(
  store: Store,
  lazy1$: LazyStateObservable<T1>,
  lazy2$: LazyStateObservable<T2>,
  lazy3$: LazyStateObservable<T3>,
  lazy4$: LazyStateObservable<T4>
): LazyStateObservable<[T1, T2, T3, T4]>;
export function combineLazy<T1, T2, T3, T4, T5>(
  store: Store,
  lazy1$: LazyStateObservable<T1>,
  lazy2$: LazyStateObservable<T2>,
  lazy3$: LazyStateObservable<T3>,
  lazy4$: LazyStateObservable<T4>,
  lazy5$: LazyStateObservable<T5>
): LazyStateObservable<[T1, T2, T3, T4, T5]>;
export function combineLazy<T1, T2, T3, T4, T5, T6>(
  store: Store,
  lazy1$: LazyStateObservable<T1>,
  lazy2$: LazyStateObservable<T2>,
  lazy3$: LazyStateObservable<T3>,
  lazy4$: LazyStateObservable<T4>,
  lazy5$: LazyStateObservable<T5>,
  lazy6$: LazyStateObservable<T6>
): LazyStateObservable<[T1, T2, T3, T4, T5, T6]>;
export function combineLazy<T1, T2, T3, T4, T5, T6, T7>(
  store: Store,
  lazy1$: LazyStateObservable<T1>,
  lazy2$: LazyStateObservable<T2>,
  lazy3$: LazyStateObservable<T3>,
  lazy4$: LazyStateObservable<T4>,
  lazy5$: LazyStateObservable<T5>,
  lazy6$: LazyStateObservable<T6>,
  lazy7$: LazyStateObservable<T7>
): LazyStateObservable<[T1, T2, T3, T4, T5, T6, T7]>;
export function combineLazy<T1, T2, T3, T4, T5, T6, T7, T8>(
  store: Store,
  lazy1$: LazyStateObservable<T1>,
  lazy2$: LazyStateObservable<T2>,
  lazy3$: LazyStateObservable<T3>,
  lazy4$: LazyStateObservable<T4>,
  lazy5$: LazyStateObservable<T5>,
  lazy6$: LazyStateObservable<T6>,
  lazy7$: LazyStateObservable<T7>,
  lazy8$: LazyStateObservable<T8>
): LazyStateObservable<[T1, T2, T3, T4, T5, T6, T7, T8]>;
export function combineLazy<T>(
  store: Store,
  ...lazies$: LazyStateObservable<any>[]
): LazyStateObservable<T> {
  let lazy$: any = combineLatest(lazies$);

  const select = <U>(
    selector: MemoizedSelector<object, U, DefaultProjectorFn<U>>
  ) =>
    (lazy$ as Observable<Lazy<T>>).pipe(
      first(),
      switchMap(() => store.select(selector))
    );

  lazy$.select = select;

  return lazy$ as LazyStateObservable<T>;
}
