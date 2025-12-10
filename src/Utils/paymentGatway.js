import Stripe from 'stripe';

// Lazy initialization of Stripe instance
let stripeInstance = null;

const getStripeInstance = () => {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set. Please check your .env file.');
    }
    
    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2024-11-20.acacia',
      typescript: true,
    });
  }
  
  return stripeInstance;
};

// Create a Payment Intent for secure payment processing
export const createPaymentIntent = async ({ amount, currency = "lkr", description = "", metadata = {} }) => {
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

// Create a Stripe Customer
export const createCustomer = async ({ email, name, metadata = {} }) => {
  try {
    const stripe = getStripeInstance();
    
    const customer = await stripe.customers.create({
      email,
      name,
      metadata,
    });

    return {
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
      }
    };
  } catch (error) {
    console.error('Customer creation error:', error);
    return {
      success: false,
      error: error.message,
      code: error.code || 'customer_creation_failed'
    };
  }
};

// Get customer's saved payment methods
export const getCustomerPaymentMethods = async (customerId) => {
  try {
    const stripe = getStripeInstance();
    
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    return {
      success: true,
      paymentMethods: paymentMethods.data.map(pm => ({
        id: pm.id,
        type: pm.type,
        card: pm.card ? {
          brand: pm.card.brand,
          last4: pm.card.last4,
          expiry_month: pm.card.exp_month,
          expiry_year: pm.card.exp_year,
          fingerprint: pm.card.fingerprint,
        } : null,
        created: pm.created,
      }))
    };
  } catch (error) {
    console.error('Payment methods retrieval error:', error);
    return {
      success: false,
      error: error.message,
      code: error.code || 'payment_methods_retrieval_failed'
    };
  }
};

// Attach payment method to customer
export const attachPaymentMethodToCustomer = async (paymentMethodId, customerId) => {
  try {
    const stripe = getStripeInstance();
    
    const paymentMethod = await stripe.paymentMethods.attach(
      paymentMethodId,
      { customer: customerId }
    );

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
    console.error('Payment method attachment error:', error);
    return {
      success: false,
      error: error.message,
      code: error.code || 'payment_method_attachment_failed'
    };
  }
};

// Create Payment Intent with customer and saved payment method
export const createPaymentIntentWithCustomer = async ({
  amount,
  currency = "lkr",
  customerId,
  paymentMethodId,
  description = "", 
  metadata = {} 
}) => {
  try {
    const stripe = getStripeInstance();
    
    const amountInCents = Math.round(amount * 100);
    
    const paymentIntentParams = {
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
    };

    // Add customer if provided
    if (customerId) {
      paymentIntentParams.customer = customerId;
    }

    // Add payment method if provided
    if (paymentMethodId) {
      paymentIntentParams.payment_method = paymentMethodId;
      paymentIntentParams.confirm = true;
      paymentIntentParams.off_session = true;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    return {
      success: true,
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount: amountInCents / 100,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      created: paymentIntent.created,
      nextAction: paymentIntent.next_action
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

// Create Stripe Checkout Session
export const createCheckoutSession = async ({
  amount,
  currency = "lkr",
  customerId,
  successUrl,
  cancelUrl,
  metadata = {} 
}) => {
  try {
    const stripe = getStripeInstance();
    
    const sessionParams = {
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency,
          product_data: {
            name: metadata.description || 'Order Payment',
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      success_url: successUrl || `${process.env.CORS_ORIGIN}/payment/success`,
      cancel_url: cancelUrl || `${process.env.CORS_ORIGIN}/payment/canceled`,
      metadata,
    };

    if (customerId) {
      sessionParams.customer = customerId;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return {
      success: true,
      sessionId: session.id,
      url: session.url,
    };
  } catch (error) {
    console.error('Stripe Checkout Session creation error:', error);
    return {
      success: false,
      error: error.message,
      code: error.code || 'checkout_session_failed'
    };
  }
};

// Cash payment function (kept for cash on delivery option)
export const processCashPayment = async ({ amount, currency = "lkr", description = "" }) => {
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
