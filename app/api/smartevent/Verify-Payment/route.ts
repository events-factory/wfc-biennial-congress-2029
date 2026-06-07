import { NextRequest, NextResponse } from 'next/server';

/**
 * Payment Verification API
 * This endpoint verifies a completed payment transaction
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { order_id, transaction_id } = body;

    // Validate required fields
    if (!order_id) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required field: order_id',
        },
        { status: 400 }
      );
    }

    // In production, this would verify the payment with your payment gateway
    // For now, we'll simulate a successful verification

    // Simulate verification delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Return verification result
    return NextResponse.json({
      success: true,
      status: 'verified',
      order_id: order_id,
      transaction_id: transaction_id,
      verified_at: new Date().toISOString(),
      message: 'Payment verified successfully',
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      {
        success: false,
        status: 'failed',
        message: 'Failed to verify payment',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Handle GET requests (return method not allowed)
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      message: 'Method not allowed. Use POST to verify payment.',
    },
    { status: 405 }
  );
}
