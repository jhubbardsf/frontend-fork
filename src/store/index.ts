// src/store/index.ts
import { create } from 'zustand';
import { createAssetSlice } from './slices/assetSlice';
import { createDepositSlice } from './slices/depositSlice';
import { createSwapSlice } from './slices/swapSlice';
import { createUiSlice } from './slices/uiSlice';
import { createUserSlice } from './slices/userSlice';
import { StoreState } from '../types';

// Create the combined store with all slices
export const useStore = create<StoreState>((...params) => ({
    ...createAssetSlice(...params),
    ...createUserSlice(...params),
    ...createSwapSlice(...params),
    ...createDepositSlice(...params),
    ...createUiSlice(...params),
}));

// Re-export slices
export * from './slices/assetSlice';
export * from './slices/userSlice';
export * from './slices/swapSlice';
export * from './slices/depositSlice';
export * from './slices/uiSlice';
