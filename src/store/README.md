# Store Refactoring - Zustand Slice Pattern

This store has been refactored from a single monolithic store into smaller, more manageable slices using the Zustand slice pattern.

## Structure

The store is now organized into the following slices:

- `assetSlice.ts` - Asset management (valid assets, prices, balances)
- `userSlice.ts` - User account & wallet integration
- `swapSlice.ts` - Swap flow functionality
- `depositSlice.ts` - Deposit flow functionality
- `uiSlice.ts` - UI state management (modals, network)

All slice interfaces and the combined `StoreState` type are defined in the main `src/types.ts` file.

## Usage

You can import the store from the main entry point:

```tsx
import { useStore } from '@/store';

const Component = () => {
    // Use all state or actions from any slice
    const { validAssets, userEthAddress, swapFlowState } = useStore();

    // For better performance, use selectors to only subscribe to what you need
    const selectedInputAsset = useStore((state) => state.selectedInputAsset);

    // ...
};
```

You can also import specific helpers directly:

```tsx
import { findAssetByName, getAssetKey } from '@/store';
```

## Adding New State

To add new state to an existing slice:

1. Add the state and its corresponding actions to the slice interface in the respective slice file
2. Update the slice's interface in `src/types.ts` if necessary
3. Implement the state and actions in the slice creator function
4. That's it! The store will automatically include your new state

## Creating New Slices

To create a new slice:

1. Create a new file in `slices/myNewSlice.ts`
2. Define your slice interface with state and actions
3. Add your slice interface to `src/types.ts`
4. Create your slice using `StateCreator<StoreState, [], [], MySliceInterface>`
5. Add your slice to the store in `index.ts`

## Migrating from Old Store

To migrate from the old monolithic store to this new sliced structure:

1. Update imports from `import { useStore } from '@/store.ts';` to `import { useStore } from '@/store';`
2. Everything else should work the same, as the API hasn't changed

## Benefits

- Improved code organization and maintainability
- Better separation of concerns
- Easier to understand and navigate
- Better TypeScript type inference and autocompletion
- Reduced risk of conflicts when multiple developers work on different parts of the store
