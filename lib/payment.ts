// Mastercard Payment Gateway Integration
// Based on Mastercard Checkout.js embedded payment form

// Extend Window interface for Mastercard Checkout
declare global {
  interface Window {
    Checkout?: {
      configure: (config: any) => void;
      showEmbeddedPage: (target: string) => void;
    };
    completeCallback?: (result: any) => void;
    errorCallback?: (error: any) => void;
    cancelCallback?: () => void;
  }
}

export interface PaymentGuest {
  order_id: string;
  amount: number;
  currency: string;
  category_id: number;
  category_name: string;
  attendence_type: string;
  customer_email: string;
  customer_name: string;
}

export interface PaymentConfig {
  orderId: string;
  amount: number;
  currency: string;
  categoryName: string;
  categoryId?: number;
  attendenceType?: string;
  customerEmail?: string;
  customerName?: string;
  guests?: PaymentGuest[];
}

export interface PaymentSession {
  sessionId: string;
  token: string;
  orderId: string;
}

export interface PaymentResult {
  success: boolean;
  orderId: string;
  transactionId?: string;
  paymentToken?: string;
  paymentSession?: string;
  error?: string;
}

/**
 * Initialize payment gateway session
 * Calls backend API to create Mastercard payment session
 */
export async function initializePayment(
  config: PaymentConfig
): Promise<PaymentSession | null> {
  try {
    // Call Next.js API route (server-side proxy to avoid CORS issues)
    const response = await fetch('/api/smartevent/Initialize-Payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: config.amount,
        currency: config.currency,
        category_name: config.categoryName,
        category_id: config.categoryId,
        attendence_type: config.attendenceType || 'PHYSICAL',
        customer_email: config.customerEmail,
        customer_name: config.customerName,
        order_id: config.orderId,
        ...(config.guests && config.guests.length > 0 && { guests: config.guests }),
      }),
    });

    if (!response.ok) {
      console.error('Payment initialization failed:', response.status);
      return null;
    }

    const data = await response.json();

    // Backend returns: { data: { result, payment_session, token, orderId } }
    const sessionData = data.data || data;
    const sessionId = sessionData.payment_session || sessionData.session_id || data.session_id;
    const token = sessionData.token || sessionData.payment_token || data.payment_token || sessionData.successIndicator;
    const orderId = sessionData.orderId || sessionData.order_id || data.order_id || config.orderId;

    if (!sessionId || !token) {
      console.error('Invalid payment session response:', data);
      return null;
    }

    return {
      sessionId: sessionId,
      token: token,
      orderId: orderId,
    };
  } catch (error) {
    console.error('Error initializing payment:', error);
    return null;
  }
}

/**
 * Check if we're in simulation mode
 */
export function isSimulationMode(): boolean {
  const mode = process.env.NEXT_PUBLIC_PAYMENT_MODE || 'simulation';
  return mode === 'simulation';
}

/**
 * Load Mastercard Checkout.js script dynamically
 */
export async function loadCheckoutScript(): Promise<void> {
  // In simulation mode, don't load the real Mastercard script
  if (isSimulationMode()) {
    console.log('Payment simulation mode enabled - skipping Mastercard script');
    return Promise.resolve();
  }

  // Check if already loaded
  if (window.Checkout) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    // Get gateway URL from environment
    const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL_JS ||
                       'https://ap-gateway.mastercard.com/static/checkout/checkout.min.js';

    const script = document.createElement('script');
    script.src = gatewayUrl;
    script.setAttribute('data-error', 'errorCallback');
    script.setAttribute('data-cancel', 'cancelCallback');
    script.setAttribute('data-complete', 'completeCallback');

    script.onload = () => {
      console.log('Mastercard Checkout script loaded successfully');
      resolve();
    };

    script.onerror = () => {
      reject(new Error('Failed to load Mastercard Checkout script'));
    };

    document.head.appendChild(script);
  });
}

/**
 * Show Mastercard embedded checkout form
 */
export function showEmbeddedCheckout(
  sessionId: string,
  targetElement: string = '#payment-container',
  token?: string
): void {
  // In simulation mode, show a mock payment form
  if (isSimulationMode()) {
    const container = document.querySelector(targetElement);
    if (!container) {
      console.error(`Container ${targetElement} not found`);
      return;
    }

    // Create simulation payment form
    container.innerHTML = `
      <div class="simulation-payment-form" style="padding: 20px; background: #f8f9fa; border-radius: 8px; border: 2px dashed #dee2e6;">
        <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 12px; margin-bottom: 16px;">
          <strong>⚠️ Simulation Mode</strong>
          <p style="margin: 8px 0 0 0; font-size: 14px;">This is a payment simulation for testing. No real payment will be processed.</p>
        </div>

        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 500;">Card Number</label>
          <input type="text" value="4111 1111 1111 1111" readonly
                 style="width: 100%; padding: 10px; border: 1px solid #ced4da; border-radius: 4px; background: #e9ecef;">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
          <div>
            <label style="display: block; margin-bottom: 8px; font-weight: 500;">Expiry</label>
            <input type="text" value="12/25" readonly
                   style="width: 100%; padding: 10px; border: 1px solid #ced4da; border-radius: 4px; background: #e9ecef;">
          </div>
          <div>
            <label style="display: block; margin-bottom: 8px; font-weight: 500;">CVV</label>
            <input type="text" value="123" readonly
                   style="width: 100%; padding: 10px; border: 1px solid #ced4da; border-radius: 4px; background: #e9ecef;">
          </div>
        </div>

        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 500;">Cardholder Name</label>
          <input type="text" value="Test User" readonly
                 style="width: 100%; padding: 10px; border: 1px solid #ced4da; border-radius: 4px; background: #e9ecef;">
        </div>

        <button id="simulate-payment-btn"
                style="width: 100%; padding: 12px; background: #28a745; color: white; border: none; border-radius: 4px; font-weight: 600; cursor: pointer; font-size: 16px;">
          Complete Test Payment
        </button>

        <button id="simulate-cancel-btn"
                style="width: 100%; padding: 12px; background: #dc3545; color: white; border: none; border-radius: 4px; font-weight: 600; cursor: pointer; font-size: 16px; margin-top: 8px;">
          Cancel Payment
        </button>
      </div>
    `;

    // Attach event listeners for simulation
    const payBtn = container.querySelector('#simulate-payment-btn');
    const cancelBtn = container.querySelector('#simulate-cancel-btn');

    if (payBtn) {
      payBtn.addEventListener('click', () => {
        console.log('Simulating successful payment...');
        // Trigger the complete callback with simulated result
        const callback = window.completeCallback;
        if (callback) {
          setTimeout(() => {
            callback({
              resultIndicator: token || sessionId.replace('SESSION', ''), // Use provided token or fallback
              sessionId: sessionId,
              status: 'SUCCESS',
            });
          }, 1000);
        }
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        console.log('Simulating payment cancellation...');
        const callback = window.cancelCallback;
        if (callback) {
          callback();
        }
      });
    }

    return;
  }

  // Production mode - use real Mastercard Checkout
  if (!window.Checkout) {
    throw new Error('Checkout.js not loaded');
  }

  // Configure checkout with session ID
  window.Checkout.configure({
    session: {
      id: sessionId,
    },
  });

  // Show embedded payment page
  window.Checkout.showEmbeddedPage(targetElement);
}

/**
 * Process payment with Mastercard Payment Gateway
 * Uses embedded checkout form
 */
export async function processPayment(
  session: PaymentSession,
  config: PaymentConfig
): Promise<PaymentResult> {
  return new Promise((resolve) => {
    try {
      // Load Mastercard Checkout script
      loadCheckoutScript().then(() => {
        // Setup success callback
        window.completeCallback = (result: any) => {
          console.log('Payment completed:', result);

          // Verify result indicator matches the expected token
          if (result.resultIndicator === session.token) {
            resolve({
              success: true,
              orderId: session.orderId,
              transactionId: result.resultIndicator,
              paymentToken: session.token,
              paymentSession: session.sessionId,
            });
          } else {
            resolve({
              success: false,
              orderId: session.orderId,
              error: 'Payment verification failed - token mismatch',
            });
          }

          // Cleanup
          delete window.completeCallback;
          delete window.errorCallback;
          delete window.cancelCallback;
        };

        // Setup error callback
        window.errorCallback = (error: any) => {
          console.error('Payment error:', error);

          resolve({
            success: false,
            orderId: session.orderId,
            error: error?.['error.explanation'] || 'Payment processing failed',
          });

          // Cleanup
          delete window.completeCallback;
          delete window.errorCallback;
          delete window.cancelCallback;
        };

        // Setup cancel callback
        window.cancelCallback = () => {
          console.log('Payment cancelled by user');

          resolve({
            success: false,
            orderId: session.orderId,
            error: 'Payment cancelled by user',
          });

          // Cleanup
          delete window.completeCallback;
          delete window.errorCallback;
          delete window.cancelCallback;
        };

        // Show embedded checkout - this will be called after modal opens
        // The actual showEmbeddedCheckout() call happens in the modal component

      }).catch((error) => {
        resolve({
          success: false,
          orderId: session.orderId,
          error: error instanceof Error ? error.message : 'Failed to load payment gateway',
        });
      });

    } catch (error) {
      resolve({
        success: false,
        orderId: session.orderId,
        error: error instanceof Error ? error.message : 'Payment failed',
      });
    }
  });
}

/**
 * Verify payment status
 * Call this after payment completion to verify with backend
 */
export async function verifyPayment(
  orderId: string,
  transactionId?: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/smartevent/Verify-Payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        order_id: orderId,
        transaction_id: transactionId,
      }),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.success === true || data.status === 'verified';
  } catch (error) {
    console.error('Error verifying payment:', error);
    return false;
  }
}

/**
 * Parse fee amount from string (e.g., "USD 150" -> 150)
 */
export function parseFeeAmount(feeString: string): number {
  const match = feeString.match(/[\d,]+\.?\d*/);
  if (match) {
    return parseFloat(match[0].replace(/,/g, ''));
  }
  return 0;
}

/**
 * Check if category requires payment
 */
export function requiresPayment(categoryFee: string): boolean {
  const normalizedFee = categoryFee.toUpperCase();
  return !normalizedFee.includes('FREE') &&
         !normalizedFee.includes('$0') &&
         !normalizedFee.includes('0.00') &&
         parseFeeAmount(categoryFee) > 0;
}

/**
 * Extract currency from fee string
 */
export function extractCurrency(feeString: string): string {
  const match = feeString.match(/[A-Z]{3}/);
  return match ? match[0] : 'USD';
}
