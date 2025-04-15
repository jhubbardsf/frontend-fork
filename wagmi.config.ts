import { defineConfig } from '@wagmi/cli';
import { abi } from '@/abis/Bundler';
import b from '@/abis/Bundler.json';
import { react, actions } from '@wagmi/cli/plugins';

export default defineConfig({
    out: 'src/generatedWagmi.ts',
    contracts: [
        {
            name: 'Bundler',
            // @ts-ignore
            abi: b.abi,
        },
    ],
    plugins: [react(), actions()],
});
