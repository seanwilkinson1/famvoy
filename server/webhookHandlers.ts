import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string, uuid: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature, uuid);

    const stripe = await getUncachableStripeClient();
    const endpointSecret = sync.webhookSecret;
    
    try {
      const event = stripe.webhooks.constructEvent(payload, signature, endpointSecret);
      
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const orderId = session.metadata?.orderId;
        
        if (orderId) {
          await WebhookHandlers.completeOrder(parseInt(orderId), session.id);
        }
      }
    } catch (err) {
      console.error('Webhook event processing error:', err);
    }
  }

  static async completeOrder(orderId: number, sessionId: string): Promise<void> {
    try {
      const order = await storage.getOrderById(orderId);
      if (!order || order.status === 'completed') {
        return;
      }

      const cart = order.cartId ? await storage.getCartByUser(order.userId) : null;
      
      if (cart && cart.items.length > 0) {
        const orderItemsData = cart.items.map(item => ({
          orderId,
          bookingOptionId: item.bookingOptionId,
          quantity: item.quantity,
          guestCount: item.guestCount,
          selectedDate: item.selectedDate,
          priceInCents: item.priceSnapshot,
          status: 'confirmed' as const,
          confirmationCode: `CONF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        }));

        await storage.createOrderItems(orderItemsData);
        await storage.clearCart(cart.id);
      }

      await storage.updateOrder(orderId, {
        status: 'completed',
        stripePaymentIntentId: sessionId,
        completedAt: new Date(),
      });

      console.log(`Order ${orderId} completed successfully`);
    } catch (error) {
      console.error(`Error completing order ${orderId}:`, error);
      throw error;
    }
  }
}
