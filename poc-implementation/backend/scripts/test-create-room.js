#!/usr/bin/env node
// Calls the devnet room creation service and prints the explorer URL
require('dotenv').config();
const path = require('path');

async function main() {
  const svc = require(path.join(process.cwd(), 'src/services/rooms-devnet.js'));
  const record = await svc.createGameRoom({
    settings: {
      timeControl: '10+5',
      boardVariant: 'standard',
      tournamentMode: false,
      allowSpectators: true
    },
    entry: { minElo: 0, entryFeeSol: 0, whitelistMint: '' },
    creator: 'backend'
  });
  console.log(JSON.stringify(record, null, 2));
}

main().catch((e) => {
  console.error('Failed to create room on devnet:', e);
  process.exit(1);
});
