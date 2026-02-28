# x402 ARC Facilitator

Open facilitator for the [x402](https://x402.org) HTTP payment protocol on **ARC Testnet**, powered by Circle's Gateway SDK.

**Live:** https://x402-arc.krutovoy.me
**AI docs:** https://x402-arc.krutovoy.me/llms.txt

---

## What it does

Drop-in facilitator that any seller can point to. Handles `/verify` and `/settle` calls from Express middleware — no setup required, no auth, CORS open.

## Network

| Key | Value |
|-----|-------|
| Network | `eip155:5042002` (ARC Testnet) |
| USDC | `0x3600000000000000000000000000000000000000` |
| GatewayWallet | `0x0077777d7eba4688bdef3e311b846f25870a19b9` |
| RPC | `https://rpc.testnet.arc.network` |
| Faucet | https://faucet.circle.com → Arc Testnet |

## Quick Start — Seller

```typescript
import { createGatewayMiddleware } from '@circlefin/x402-batching/server';
import express from 'express';

const app = express();
const gateway = createGatewayMiddleware({
  sellerAddress: '0xYOUR_WALLET',
  facilitatorUrl: 'https://x402-arc.krutovoy.me',
});

app.get('/api/data', gateway.require('$0.001'), (req, res) => {
  res.json({ data: 'paid content', payer: req.payment.payer });
});
```

## Quick Start — Buyer

```typescript
import { GatewayClient } from '@circlefin/x402-batching/client';

const client = new GatewayClient({ chain: 'arcTestnet', privateKey: '0x...' });
await client.deposit('1');                              // one-time USDC deposit
const { data } = await client.pay('https://your-api.com/api/data');
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Landing page |
| GET | `/supported` | Supported networks |
| GET | `/health` | Liveness check |
| GET | `/llms.txt` | AI-readable integration guide |
| POST | `/verify` | Validate payment payload |
| POST | `/settle` | Settle payment on-chain |

## Stack

- **Runtime:** Bun + Express + TypeScript
- **SDK:** `@circlefin/x402-batching` (Circle private registry)
- **Deploy:** Docker → Coolify

## Self-hosting

```bash
# Requires CLOUDSMITH_TOKEN for Circle's private registry
docker build --build-arg CLOUDSMITH_TOKEN=<token> -t x402-arc .
docker run -p 8090:8090 x402-arc
```

## AI Skill

Claude Code skill for integrating this facilitator: [`skill/x402-arc-facilitator/SKILL.md`](skill/x402-arc-facilitator/SKILL.md)
