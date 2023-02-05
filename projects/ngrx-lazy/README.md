# ngrx-lazy

Dead simple data lazy loading for [@ngrx](https://github.com/ngrx) state management.

Inspired by the early work of [@Synthx](https://github.com/Synthx)

## Get started

```
npm install ngrx-lazy --save
```

## How to use?

To fully understand how to use this library, we'll go through an example of a project that list brands on an e-commerce website.

### Lazy state

A lazy state is made of several properties:

```ts
type Lazy<T> = {
  fetched: boolean;
  pending: boolean;
  error?: any;
  data: T;
};
```

You can then use the `createLazy` function to initialize your feature state.

```ts
import { createLazy, Lazy } from "ngrx-lazy";
import { Brand } from "./models";

export interface BrandsState {
  all: Lazy<Brand[]>;
  popular: Lazy<Brand[]>;
}

export const initialBrandsState: BrandsState = {
  all: createLazy<Brand[]>([]),
  popular: createLazy<Brand[]>([]),
};
```

In this example, we create two lazy loadable array of brands inside our brands feature state.

### Lazy reducers

Once you have created your state, you can handle the reducers based on a simple data fetching logic.

```ts
import { createReducer, on } from "@ngrx/store";
import * as BrandsActions from "./brands.actions";
import { initialBrandsState } from "./brands.state";

export const brandsReducer = createReducer(
  initialBrandsState,

  on(BrandsActions.loadAll, (state) => ({
    ...state,
    all: { ...state.all, pending: true },
  })),
  on(BrandsActions.loadAllSuccess, (state, { brands }) => ({
    ...state,
    all: { data: brands, fetched: true, pending: false },
  })),
  on(BrandsActions.loadAllError, (state, { error }) => ({
    ...state,
    all: { ...state.all, pending: false, error },
  })),

  on(BrandsActions.loadPopular, (state) => ({
    ...state,
    popular: { ...state.popular, pending: true },
  })),
  on(BrandsActions.loadPopularSuccess, (state, { popularBrands }) => ({
    ...state,
    popular: { data: popularBrands, fetched: true, pending: false },
  })),
  on(BrandsActions.loadPopularError, (state, { error }) => ({
    ...state,
    popular: { ...state.popular, pending: false, error },
  }))
);
```

### Lazy selectors

You can create basic selectors using the existing `createSelector` from @ngrx.

```ts
import { createSelector } from "@ngrx/store";
import { getEntityState } from "../selectors/entity.selectors";

const selectBrandsState = createSelector(
  getEntityState,
  (state) => state.brands
);

const lazyAll = createSelector(selectBrandsState, (state) => state.all);

const selectBrands = createSelector(lazyAll, (lazy) => lazy.data);
const selectBrandBySlug = (slug: string) =>
  createSelector(selectBrands, (brands) => brands.find((b) => b.slug === slug));

export const AllBrandsSelectors = {
  selectLazy: lazyAll,
  selectBrands,
  selectBrandBySlug,
};

const lazyPopular = createSelector(selectBrandsState, (state) => state.popular);

const selectPopularBrands = createSelector(lazyPopular, (lazy) => lazy.data);

export const PopularBrandsSelectors = {
  selectLazy: lazyPopular,
  selectPopularBrands,
};
```

In order to make this library shine, you absolutely need a Facade on top of the selector. Here is an example what it can looks like:

```ts
import { Injectable } from "@angular/core";
import { Store } from "@ngrx/store";
import { selectLazy } from "ngrx-lazy";
import { RootState } from "../models";
import * as BrandsActions from "./brands.actions";
import { AllBrandsSelectors, PopularBrandsSelectors } from "./brands.selectors";

@Injectable()
export class BrandsSelectors {
  constructor(private readonly store: Store) {}

  lazyAll$ = selectLazy({
    store: this.store,
    selector: AllBrandsSelectors.lazyAll,
    loadAction: BrandsActions.loadAll(),
  });

  brands$ = this.lazyAll$.select(AllBrandsSelectors.getBrands);
  brandBySlug$ = (slug: string) =>
    this.lazyAll$.select(AllBrandsSelectors.getBrandBySlug(slug));
  brandById$ = (id: number) =>
    this.lazyAll$.select(AllBrandsSelectors.getBrandById(id));

  lazyPopular$ = selectLazy({
    store: this.store,
    selector: PopularBrandsSelectors.lazyPopular,
    loadAction: BrandsActions.loadPopular(),
  });

  popularBrands$ = this.lazyPopular$.select(
    PopularBrandsSelectors.getPopularBrands
  );
}
```

Now, when you call any property on this selector service, it will automatically trigger the data loading related to state of the lazy state.

Of course, you'd need to implement Effects to execute data fetching!

### RxJS operators

#### firstNotPending

The operator `firstNotPending` takes a lazy selector and dispatch the first value of the selector once data fetching is done.

```ts
const allBrands$: Observable<Brand[]> = this.brandsSelectors.lazyAll$.pipe(firstNotPending()):
```

#### skipUntilLazyLoaded

The operator `skipUntilLazyLoaded` takes a selector and dispatch its values only once a parent selector is fully lazy loaded (once data fetching is done).

```ts
const brand$: Observable<Brand> = this.brandsSelectors.brandById$(id).pipe(
    skipUntilLazyLoaded(this.brandsSelectors.lazyAll$),
):
```
