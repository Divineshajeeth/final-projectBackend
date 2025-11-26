import UserPayment from "../Models/userPaymentModel.js";
import Order from "../Models/orderModel.js";

/**
 * Validates the payment status and consistency for an order
 * @param {Object} order - The order document
 * @returns {Object} - Validation result with isValid flag and reasons
 */
export const validateOrderPayment = async (order) => {
  const validation = {
    isValid: true,
    reasons: [],
    paymentStatus: 'valid'
  };

  try {
    // 1. Check if payment method is valid
    if (!order.paymentMethod || !['card', 'cash'].includes(order.paymentMethod)) {
      validation.isValid = false;
      validation.reasons.push('Invalid payment method');
      validation.paymentStatus = 'invalid_method';
      return validation;
    }

    // 2. Find corresponding payment record
    const paymentRecord = await UserPayment.findOne({ order: order._id });

    // 3. Check for missing payment record for card payments
    if (order.paymentMethod === 'card' && !paymentRecord) {
      validation.isValid = false;
      validation.reasons.push('Missing payment record for card payment');
      validation.paymentStatus = 'missing_payment';
      return validation;
    }

    // 4. If payment record exists, validate its status
    if (paymentRecord) {
      // Check for failed payments
      if (paymentRecord.status === 'failed') {
        validation.isValid = false;
        validation.reasons.push('Payment failed');
        validation.paymentStatus = 'failed';
        return validation;
      }

      // Check for canceled payments
      if (paymentRecord.status === 'canceled') {
        validation.isValid = false;
        validation.reasons.push('Payment canceled');
        validation.paymentStatus = 'canceled';
        return validation;
      }

      // Check payment status consistency
      if (order.paymentStatus && paymentRecord.status !== order.paymentStatus) {
        // Allow some mismatches for orders in transition
        const allowedMismatches = [
          { order: 'pending', payment: 'completed' },
          { order: 'pending', payment: 'processing' }
        ];
        
        const isAllowedMismatch = allowedMismatches.some(
          mismatch => mismatch.order === order.paymentStatus && mismatch.payment === paymentRecord.status
        );

        if (!isAllowedMismatch) {
          validation.isValid = false;
          validation.reasons.push(`Payment status mismatch: order=${order.paymentStatus}, payment=${paymentRecord.status}`);
          validation.paymentStatus = 'status_mismatch';
          return validation;
        }
      }
    }

    // 5. Check for orders marked as paid but without successful payment
    if (order.isPaid && (!paymentRecord || paymentRecord.status !== 'completed')) {
      validation.isValid = false;
      validation.reasons.push('Order marked as paid but no successful payment found');
      validation.paymentStatus = 'paid_without_payment';
      return validation;
    }

    // 6. Check for very old pending payments (older than 24 hours)
    if (order.paymentStatus === 'pending' && paymentRecord && paymentRecord.status === 'pending') {
      const orderAge = Date.now() - new Date(order.createdAt).getTime();
      const hoursOld = orderAge / (1000 * 60 * 60);
      
      if (hoursOld > 24) {
        validation.isValid = false;
        validation.reasons.push('Payment pending for too long (over 24 hours)');
        validation.paymentStatus = 'expired_pending';
        return validation;
      }
    }

    // 7. Validate payment method consistency
    if (paymentRecord) {
      const methodMap = {
        'card': 'stripe',
        'cash': 'cash'
      };
      
      if (paymentRecord.method !== methodMap[order.paymentMethod]) {
        validation.isValid = false;
        validation.reasons.push(`Payment method mismatch: order=${order.paymentMethod}, payment=${paymentRecord.method}`);
        validation.paymentStatus = 'method_mismatch';
        return validation;
      }
    }

  } catch (error) {
    console.error('Error validating order payment:', error);
    validation.isValid = false;
    validation.reasons.push('Payment validation error');
    validation.paymentStatus = 'validation_error';
  }

  return validation;
};

/**
 * Filters an array of orders to only include those with valid payments
 * @param {Array} orders - Array of order documents
 * @returns {Array} - Filtered array with only valid payment orders
 */
export const filterOrdersWithValidPayments = async (orders) => {
  if (!Array.isArray(orders)) {
    return [];
  }

  const validOrders = [];
  
  for (const order of orders) {
    const validation = await validateOrderPayment(order);
    
    if (validation.isValid) {
      // Add validation info to order for frontend use
      order.paymentValidation = {
        isValid: true,
        status: 'valid'
      };
      validOrders.push(order);
    } else {
      // Add validation info for potential admin use
      order.paymentValidation = {
        isValid: false,
        status: validation.paymentStatus,
        reasons: validation.reasons
      };
    }
  }

  return validOrders;
};

/**
 * Enhanced order query that includes payment validation
 * @param {Object} query - MongoDB query for orders
 * @param {Object} options - Additional options (isAdmin, etc.)
 * @returns {Array} - Orders with payment validation
 */
export const getOrdersWithPaymentValidation = async (query, options = {}) => {
  try {
    // Fetch orders
    let ordersQuery = Order.find(query)
      .populate("user", "name email contact")
      .populate("orderItems.product", "name image");

    const orders = await ordersQuery;

    // If admin, return all orders with validation info
    if (options.isAdmin) {
      const validatedOrders = [];
      
      for (const order of orders) {
        const validation = await validateOrderPayment(order);
        order.paymentValidation = validation;
        validatedOrders.push(order);
      }
      
      return validatedOrders;
    } else {
      // For regular users, filter out invalid payment orders
      return await filterOrdersWithValidPayments(orders);
    }

  } catch (error) {
    console.error('Error in getOrdersWithPaymentValidation:', error);
    throw error;
  }
};
