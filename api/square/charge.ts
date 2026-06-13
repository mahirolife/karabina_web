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
    const { square_customer_id, square_card_id, party_size } = req.body;
    if (!square_customer_id || !square_card_id || !party_size) {
      return res.status(400).json({ error: 'square_customer_id, square_card_id, and party_size are required' });
    }

    const amountYen = party_size * 3000;
    const locationId = process.env.VITE_SQUARE_LOCATION_ID;
    if (!locationId) throw new Error('VITE_SQUARE_LOCATION_ID is not set');

    const result = await squareClient.payments.create({
      sourceId: square_card_id,
      idempotencyKey: randomUUID(),
      amountMoney: { amount: BigInt(amountYen), currency: 'JPY' },
      customerId: square_customer_id,
      locationId,
    });

    res.json({ success: true, charge_id: result.payment?.id, amount_yen: amountYen });
  } catch (err: any) {
    console.error('charge error:', err);
    const message = err?.errors?.[0]?.detail ?? err?.message ?? 'Charge failed';
    res.status(400).json({ error: message });
  }
}
