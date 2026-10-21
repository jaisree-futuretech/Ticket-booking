import express, { Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../auth.js';
import { verifyPaymentAndConfirm } from '../services/bookingService.js';

const router = express.Router();

// Verify test payment and finalize booking
router.post('/verify', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { bookingId, paymentMethod, shouldFailTest, transactionRef } = req.body;
  const userId = req.user!.id;

  if (!bookingId) {
    return res.status(400).json({ error: 'Booking ID is required.' });
  }

  try {
    const result = await verifyPaymentAndConfirm(bookingId, userId, {
      paymentMethod: paymentMethod || 'TEST_CARD',
      shouldFailTest: Boolean(shouldFailTest),
      transactionRef,
    });

    if (!result.success) {
      return res.status(402).json({ error: result.error });
    }

    return res.json({
      success: true,
      message: 'Payment verified and booking confirmed successfully.',
      booking: result.booking,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Payment verification failed.' });
  }
});

export default router;
