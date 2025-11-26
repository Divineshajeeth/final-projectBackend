import Stripe from 'stripe';

// Lazy initialization of Stripe instance
let stripeInstance = null;

const getStripeInstance = () => {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set. Please check your .env file.');
    }
    
    stripeInstance = new Stripe(secretKey);
  }
  
  return stripeInstance;
};

// Create a Payment Intent for secure payment processing
export const createPaymentIntent = async ({ amount, currency = "inr", description = "", metadata = {} }) => {
  try {
    const stripe = getStripeInstance();
    
    // Convert amount to cents (Stripe expects amount in smallest currency unit)
    const amountInCents = Math.round(amount * 100);
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency,
      description,
      metadata: {
        ...metadata,
        integration_check: 'accept_a_payment'
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      success: true,
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount: amountInCents / 100, // Convert back to original amount
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      created: paymentIntent.created
    };
  } catch (error) {
    console.error('Stripe Payment Intent creation error:', error);
    return {
      success: false,
      error: error.message,
      code: error.code || 'payment_intent_failed'
    };
  }
};

// Confirm a Payment Intent (usually called after client-side confirmation)
export const confirmPaymentIntent = async (paymentIntentId) => {
  try {
    console.log('🔍 Retrieving payment intent:', paymentIntentId);
    
    if (!paymentIntentId) {
      throw new Error('Payment Intent ID is required');
    }

    const stripe = getStripeInstance();
    console.log('🔑 Stripe instance created successfully');
    
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log('✅ Payment intent retrieved:', {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    });
    
    return {
      success: true,
      paymentIntent,
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency
    };
  } catch (error) {
    console.error('❌ Stripe Payment Intent retrieval error:', {
      message: error.message,
      code: error.code,
      type: error.type,
      paymentIntentId: paymentIntentId
    });
    
    // Handle specific Stripe errors
    let errorMessage = error.message;
    if (error.code === 'resource_missing') {
      errorMessage = 'Payment intent not found or expired. Please try again.';
    } else if (error.code === 'api_key_expired') {
      errorMessage = 'Payment service temporarily unavailable. Please try again.';
    } else if (error.type === 'invalid_request_error') {
      errorMessage = 'Invalid payment request. Please try again.';
    }
    
    return {
      success: false,
      error: errorMessage,
      code: error.code || 'payment_intent_retrieval_failed',
      type: error.type
    };
  }
};

// Process refund
export const processRefund = async ({ paymentIntentId, amount, reason = "" }) => {
  try {
    const stripe = getStripeInstance();
    const refundParams = {
      payment_intent: paymentIntentId,
    };

    // Add amount if partial refund
    if (amount) {
      refundParams.amount = Math.round(amount * 100);
    }

    if (reason) {
      refundParams.reason = reason;
    }

    const refund = await stripe.refunds.create(refundParams);

    return {
      success: true,
      refundId: refund.id,
      amount: refund.amount / 100,
      status: refund.status,
      created: refund.created
    };
  } catch (error) {
    console.error('Stripe refund error:', error);
    return {
      success: false,
      error: error.message,
      code: error.code || 'refund_failed'
    };
  }
};

// Verify webhook signature
export const verifyWebhookSignature = (req) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!sig || !webhookSecret) {
    return false;
  }

  try {
    const stripe = getStripeInstance();
    return stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return false;
  }
};

// Get payment method details
export const getPaymentMethod = async (paymentMethodId) => {
  try {
    const stripe = getStripeInstance();
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    
    return {
      success: true,
      paymentMethod: {
        id: paymentMethod.id,
        type: paymentMethod.type,
        card: paymentMethod.card ? {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          expiry_month: paymentMethod.card.exp_month,
          expiry_year: paymentMethod.card.exp_year,
        } : null,
      }
    };
  } catch (error) {
    console.error('Payment method retrieval error:', error);
    return {
      success: false,
      error: error.message,
      code: error.code || 'payment_method_retrieval_failed'
    };
  }
};

// Cash payment function (kept for cash on delivery option)
export const processCashPayment = async ({ amount, currency = "inr", description = "" }) => {
  // Cash payments remain the same (handled locally)
  const transactionId = "cash_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  
  return {
    success: true,
    transactionId,
    amount,
    currency,
    status: "pending",
    method: "cash",
    processedAt: new Date().toISOString()
  };
};
