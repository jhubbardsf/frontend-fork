// scripts/generateTokenColors.ts
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

async function main() {
  // 1) Grab the Uniswap token list
  const tokensRes = await fetch('https://tokens.uniswap.org/');
  if (!tokensRes.ok) throw new Error(`Failed to fetch token list: ${tokensRes.statusText}`);
  const { tokens } = await tokensRes.json() as { tokens: Array<{ logoURI: string }> };

  const colorMap: Record<string, { bgColor: string; borderColor: string }> = {};

  for (const { logoURI } of tokens) {
    if (!logoURI) continue;
    try {
      // 2) Hit your local API (run `next dev` on :3000)
      const res = await fetch(
        `http://localhost:3000/api/token-colors?url=${encodeURIComponent(logoURI)}`
      );
      if (!res.ok) {
        console.warn(`⚠️  ${logoURI} → ${await res.text()}`);
        continue;
      }
      const data = await res.json();
      colorMap[logoURI] = data;
      console.log(`✅  ${logoURI}`);
    } catch (e) {
      console.error(`❌  ${logoURI}`, e);
    }
  }

  // 3) Write out to a file in your project
  const outPath = path.resolve(process.cwd(), 'data', 'tokenColors.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(colorMap, null, 2));
  console.log(`Wrote ${Object.keys(colorMap).length} entries to ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

