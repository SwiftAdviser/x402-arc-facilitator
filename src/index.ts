import express from 'express';
import { BatchFacilitatorClient } from '@circlefin/x402-batching/server';
import { Pool } from 'pg';

const PORT = parseInt(process.env.PORT || '8090', 10);

const facilitator = new BatchFacilitatorClient();

// Pre-fetch supported networks on startup
const supported = await facilitator.getSupported();
console.log(`Supported networks: ${supported.kinds.map((k) => k.network).join(', ')}`);

// PostgreSQL for metrics (optional — gracefully disabled if not configured)
let db: Pool | null = null;
const PG_URL = process.env.METRICS_PG_URL;
if (PG_URL) {
  db = new Pool({ connectionString: PG_URL });
  db.on('error', (err) => console.error('[pg]', err.message));
  console.log('Metrics DB connected');
} else {
  console.log('METRICS_PG_URL not set — metrics disabled');
}

async function logRequest(opts: {
  endpoint: string;
  network?: string;
  payer?: string;
  success: boolean;
  errorReason?: string;
  responseMs: number;
}) {
  if (!db) return;
  try {
    await db.query(
      `INSERT INTO x402.requests (endpoint, network, payer, success, error_reason, response_ms)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [opts.endpoint, opts.network ?? null, opts.payer ?? null, opts.success, opts.errorReason ?? null, opts.responseMs],
    );
  } catch (err) {
    console.error('[metrics]', (err as Error).message);
  }
}

const app = express();
app.use(express.json());

app.use((_, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  next();
});

const startTime = Date.now();
app.get('/health', (_, res) => res.json({
  status: 'ok',
  uptime: Math.floor((Date.now() - startTime) / 1000),
  networks: supported.kinds.length,
  version: '1.0.0',
}));

// Serve landing page, llms.txt, and other static files from public/
app.use(express.static(new URL('../public', import.meta.url).pathname));

// Official x402 protocol endpoints — public, no auth required
app.get('/supported', (_, res) => res.json(supported));

app.post('/verify', async (req, res) => {
  const t0 = Date.now();
  try {
    const { paymentPayload, paymentRequirements } = req.body as {
      paymentPayload: Parameters<typeof facilitator.verify>[0];
      paymentRequirements: Parameters<typeof facilitator.verify>[1];
    };
    const result = await facilitator.verify(paymentPayload, paymentRequirements);
    const ms = Date.now() - t0;
    void logRequest({
      endpoint: '/verify',
      network: paymentRequirements?.network,
      payer: result.payer,
      success: result.isValid,
      errorReason: result.invalidReason,
      responseMs: ms,
    });
    res.json(result);
  } catch (err) {
    console.error('[verify]', err);
    void logRequest({ endpoint: '/verify', success: false, errorReason: String(err), responseMs: Date.now() - t0 });
    res.status(500).json({ error: String(err) });
  }
});

app.post('/settle', async (req, res) => {
  const t0 = Date.now();
  try {
    const { paymentPayload, paymentRequirements } = req.body as {
      paymentPayload: Parameters<typeof facilitator.settle>[0];
      paymentRequirements: Parameters<typeof facilitator.settle>[1];
    };
    const result = await facilitator.settle(paymentPayload, paymentRequirements);
    const ms = Date.now() - t0;
    void logRequest({
      endpoint: '/settle',
      network: paymentRequirements?.network,
      payer: result.payer,
      success: result.success,
      errorReason: result.errorReason,
      responseMs: ms,
    });
    res.json(result);
  } catch (err) {
    console.error('[settle]', err);
    void logRequest({ endpoint: '/settle', success: false, errorReason: String(err), responseMs: Date.now() - t0 });
    res.status(500).json({ error: String(err) });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`x402 ARC Facilitator listening on http://0.0.0.0:${PORT}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
});
