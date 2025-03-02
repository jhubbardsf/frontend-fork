import { useEffect } from 'react';

export const useLogState = (label: string, state: unknown) => {
    useEffect(() => {
        console.log(`${label} changed:`, { state });
    }, [label, state]);
};
