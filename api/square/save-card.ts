import { SquareClient, SquareEnvironment } from 'square';
import { randomUUID } from 'crypto';

const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN ?? '',
  environment: process.env.SQUARE_ENVIRONMENT === 'production'
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox,
});

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { nonce, name, email } = req.body;
    if (!nonce || !name) return res.status(400).json({ error: 'nonce and name are required' });

    const customerResult = await squareClient.customers.create({
      givenName: name,
      emailAddress: email ?? undefined,
      idempotencyKey: randomUUID(),
    });
    const customerId = customerResult.customer?.id;
    if (!customerId) throw new Error('Failed to create Square customer');

    const cardResult = await squareClient.cards.create({
      idempotencyKey: randomUUID(),
      sourceId: nonce,
      card: { customerId },
    });
    const cardId = cardResult.card?.id;
    if (!cardId) throw new Error('Failed to save card on file');

    res.json({ square_customer_id: customerId, square_card_id: cardId });
  } catch (err: any) {
    console.error('save-card error:', err);
    const message = err?.errors?.[0]?.detail ?? err?.message ?? 'Failed to save card';
    res.status(400).json({ error: message });
  }
}
