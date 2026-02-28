import express from 'express';
import { BatchFacilitatorClient } from '@circlefin/x402-batching/server';

const PORT = parseInt(process.env.PORT || '8090', 10);
const BEARER_TOKEN = process.env.BEARER_TOKEN?.trim();

if (!BEARER_TOKEN) throw new Error('BEARER_TOKEN env var is required');

const facilitator = new BatchFacilitatorClient();

// Pre-fetch supported networks on startup
const supported = await facilitator.getSupported();
console.log(`Supported networks: ${supported.kinds.map((k) => k.network).join(', ')}`);

const app = express();
app.use(express.json());

// Bearer auth middleware
function requireBearer(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ') || auth.slice(7) !== BEARER_TOKEN) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

app.get('/', (_, res) => res.send('x402 ARC Facilitator — Circle Gateway'));

// Official x402 protocol endpoints
app.get('/supported', (_, res) => res.json(supported));

app.post('/verify', requireBearer, async (req, res) => {
  try {
    const { paymentPayload, paymentRequirements } = req.body as {
      paymentPayload: unknown;
      paymentRequirements: unknown;
    };
    const result = await facilitator.verify(
      paymentPayload as Parameters<typeof facilitator.verify>[0],
      paymentRequirements as Parameters<typeof facilitator.verify>[1],
    );
    res.json(result);
  } catch (err) {
    console.error('[verify]', err);
    res.status(500).json({ error: String(err) });
  }
});

app.post('/settle', requireBearer, async (req, res) => {
  try {
    const { paymentPayload, paymentRequirements } = req.body as {
      paymentPayload: unknown;
      paymentRequirements: unknown;
    };
    const result = await facilitator.settle(
      paymentPayload as Parameters<typeof facilitator.settle>[0],
      paymentRequirements as Parameters<typeof facilitator.settle>[1],
    );
    res.json(result);
  } catch (err) {
    console.error('[settle]', err);
    res.status(500).json({ error: String(err) });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`x402 ARC Facilitator listening on http://0.0.0.0:${PORT}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
});
