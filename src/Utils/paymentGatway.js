// Enhanced mock payment gateway with card processing
// Replace / extend with Stripe, Razorpay, PayPal SDK when ready

export const createPaymentIntent = async ({ amount, currency = "inr", description = "" }) => {
  // Mock payment intent creation
  const paymentIntentId = "pi_mock_" + Date.now();
  
  return {
    id: paymentIntentId,
    clientSecret: "pi_mock_" + Date.now() + "_secret_" + Math.random().toString(36).substr(2, 9),
    amount,
    currency,
    description,
    status: "requires_payment_method",
    created: Math.floor(Date.now() / 1000)
  };
};

export const processCardPayment = async ({ cardDetails, amount, currency = "inr", description = "" }) => {
  // Mock card processing with validation
  const { cardNumber, expiry, cvv, cardholderName } = cardDetails;
  
  // Basic card validation
  const cardValidation = validateCard(cardNumber, expiry, cvv);
  if (!cardValidation.isValid) {
    return {
      success: false,
      error: cardValidation.error,
      code: "card_validation_failed"
    };
  }
  
  // Mock processing delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Simulate random success/failure (90% success rate for testing)
  const isSuccess = Math.random() > 0.1;
  
  if (!isSuccess) {
    return {
      success: false,
      error: "Payment declined by bank",
      code: "payment_declined"
    };
  }
  
  // Successful payment
  const transactionId = "txn_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  const last4 = cardNumber.slice(-4);
  const brand = detectCardBrand(cardNumber);
  
  return {
    success: true,
    transactionId,
    paymentIntentId: "pi_mock_" + Date.now(),
    amount,
    currency,
    status: "succeeded",
    cardDetails: {
      last4,
      brand,
      expiry,
      cardholderName
    },
    processedAt: new Date().toISOString()
  };
};

export const processCashPayment = async ({ amount, currency = "inr", description = "" }) => {
  // Mock cash payment processing
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

export const validateCard = (cardNumber, expiry, cvv) => {
  // Remove spaces and dashes from card number
  const cleanCardNumber = cardNumber.replace(/[\s-]/g, '');
  
  // Basic card number validation (should be 13-19 digits)
  if (!/^\d{13,19}$/.test(cleanCardNumber)) {
    return {
      isValid: false,
      error: "Invalid card number"
    };
  }
  
  // Luhn algorithm for basic card validation
  let sum = 0;
  let isEven = false;
  
  for (let i = cleanCardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanCardNumber[i]);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  if (sum % 10 !== 0) {
    return {
      isValid: false,
      error: "Invalid card number (failed Luhn check)"
    };
  }
  
  // Expiry validation (MM/YY format)
  if (!/^\d{2}\/\d{2}$/.test(expiry)) {
    return {
      isValid: false,
      error: "Invalid expiry date format (use MM/YY)"
    };
  }
  
  const [month, year] = expiry.split('/').map(num => parseInt(num));
  const currentYear = new Date().getFullYear() % 100;
  const currentMonth = new Date().getMonth() + 1;
  
  if (month < 1 || month > 12) {
    return {
      isValid: false,
      error: "Invalid month"
    };
  }
  
  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return {
      isValid: false,
      error: "Card has expired"
    };
  }
  
  // CVV validation
  if (!/^\d{3,4}$/.test(cvv)) {
    return {
      isValid: false,
      error: "Invalid CVV"
    };
  }
  
  return {
    isValid: true
  };
};

export const detectCardBrand = (cardNumber) => {
  const cleanCardNumber = cardNumber.replace(/[\s-]/g, '');
  
  if (/^4/.test(cleanCardNumber)) {
    return "visa";
  } else if (/^5[1-5]/.test(cleanCardNumber)) {
    return "mastercard";
  } else if (/^3[47]/.test(cleanCardNumber)) {
    return "amex";
  } else if (/^6(?:011|5)/.test(cleanCardNumber)) {
    return "discover";
  } else {
    return "unknown";
  }
};

export const verifyWebhookSignature = (req) => {
  // Implement signature verification when using a real gateway
  return true;
};

// Helper function to format card number for display
export const formatCardNumber = (cardNumber) => {
  const cleanCardNumber = cardNumber.replace(/[\s-]/g, '');
  const groups = cleanCardNumber.match(/\d{4}/g) || [];
  return groups.join(' ').substr(0, 19); // Show max 19 digits
};

// Helper function to mask card number
export const maskCardNumber = (cardNumber) => {
  const cleanCardNumber = cardNumber.replace(/[\s-]/g, '');
  const last4 = cleanCardNumber.slice(-4);
  return "****-****-****-" + last4;
};
