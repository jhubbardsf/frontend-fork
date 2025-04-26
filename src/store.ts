/**
 * @deprecated This file is kept for backward compatibility.
 * Please import from '@/store' instead of '@/store.ts'.
 *
 * This store has been refactored into a slice-based implementation
 * to improve maintainability and type safety.
 */

// Re-export everything from the new store
export * from './store/index';

// For backward compatibility, also export the useStore hook as default
export { useStore as default } from './store/index';
