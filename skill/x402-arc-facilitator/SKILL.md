# x402 ARC Facilitator Integration Skill

Use this skill when asked to integrate x402 payments using the ARC testnet facilitator,
or when building apps that accept or make x402 micropayments on ARC testnet.

Full AI-readable docs: https://x402-arc.krutovoy.me/llms.txt
Landing page: https://x402-arc.krutovoy.me

---

## Facilitator

```
URL:      https://x402-arc.krutovoy.me
Protocol: x402 (HTTP 402 Payment Required)
Auth:     none required
CORS:     Access-Control-Allow-Origin: *
```

## Network

```
Network ID:    eip155:5042002
Chain ID:      5042002
USDC:          0x3600000000000000000000000000000000000000
GatewayWallet: 0x0077777d7eba4688bdef3e311b846f25870a19b9
RPC:           https://rpc.testnet.arc.network
Explorer:      https://testnet.arcscan.app
Faucet:        https://faucet.circle.com  (select Arc Testnet)
```

## Endpoints

| Method | Path        | Purpose                         |
|--------|-------------|----------------------------------|
| GET    | /supported  | List supported networks          |
| GET    | /health     | Liveness check                   |
| POST   | /verify     | Validate payment payload         |
| POST   | /settle     | Settle payment on-chain          |
| GET    | /llms.txt   | This document (for agents)       |

---

## Seller — TypeScript (Express)

```typescript
import { createGatewayMiddleware } from '@circlefin/x402-batching/server';
import express from 'express';

const app = express();

const gateway = createGatewayMiddleware({
  sellerAddress: '0xYOUR_WALLET_ADDRESS',
  facilitatorUrl: 'https://x402-arc.krutovoy.me',
});

// Charge $0.001 USDC per request
app.get('/api/data', gateway.require('$0.001'), (req, res) => {
  res.json({ data: 'paid content', payer: req.payment.payer });
});

app.listen(3000);
```

Install: `npm install @circlefin/x402-batching express`

Note: `@circlefin/x402-batching` is from Circle's private Cloudsmith registry.
Ask the user for their CLOUDSMITH_TOKEN if needed.

---

## Buyer — TypeScript

```typescript
import { GatewayClient } from '@circlefin/x402-batching/client';

const client = new GatewayClient({
  chain: 'arcTestnet',
  privateKey: '0xYOUR_PRIVATE_KEY',
});

// One-time: deposit USDC to GatewayWallet contract
await client.deposit('1'); // 1 USDC

// Pay and call any x402-protected endpoint
const { data } = await client.pay('https://your-api.com/api/data');
```

Get testnet USDC: https://faucet.circle.com → Arc Testnet

---

## Raw curl Examples

```bash
# Check supported networks
curl https://x402-arc.krutovoy.me/supported | jq .

# Health check
curl https://x402-arc.krutovoy.me/health | jq .

# Verify payment
curl -X POST https://x402-arc.krutovoy.me/verify \
  -H "Content-Type: application/json" \
  -d '{"paymentPayload": {...}, "paymentRequirements": {"network": "eip155:5042002", "asset": "0x3600000000000000000000000000000000000000", "payTo": "0xSELLER", "amount": "1000"}}'
```

---

## Amount Units

USDC has 6 decimals. `amount` in paymentRequirements is in base units:
- $0.001 = "1000"
- $1.00  = "1000000"
- $0.01  = "10000"

---

## Common Errors

| Error              | Fix                                          |
|--------------------|----------------------------------------------|
| isValid: false     | Payload expired (~30s) — retry               |
| insufficient balance | Buyer needs to deposit USDC first          |
| network mismatch   | Use `eip155:5042002`                         |
| 500 error          | Check /health, retry in 5s                   |

---

## Payment Flow Summary

```
Buyer → GET /api/data → 402 Payment Required
Buyer signs GatewayWallet payment header
Buyer → GET /api/data + X-Payment header
Seller → POST /verify → Facilitator → Circle Gateway → isValid: true
Seller → 200 response to Buyer
Seller → POST /settle (async) → on-chain transfer
```
