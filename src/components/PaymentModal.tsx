import React, { useState } from 'react';
import { BookingSummary } from '../types';
import { api } from '../api/client';
import { 
  CreditCard, 
  Smartphone, 
  Building2, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  X,
  Lock
} from 'lucide-react';

interface PaymentModalProps {
  order: BookingSummary;
  onSuccess: (bookingDetail: any) => void;
  onCancel: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ order, onSuccess, onCancel }) => {
  const [method, setMethod] = useState<'CARD' | 'UPI' | 'NETBANKING'>('CARD');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('888');
  const [cardName, setCardName] = useState('Alex Rivera');
  const [upiId, setUpiId] = useState('alex@okaxis');
  const [bank, setBank] = useState('HDFC Bank');

  const handleProcessPayment = async (shouldFailTest: boolean = false) => {
    setLoading(true);
    setErrorMessage(null);

    try {
      // Simulate real gateway processing latency (1s)
      await new Promise(r => setTimeout(r, 1000));

      const res = await api.verifyPayment({
        bookingId: order.bookingId,
        paymentMethod: method === 'CARD' ? 'TEST_CREDIT_CARD' : method === 'UPI' ? 'TEST_UPI' : 'TEST_NETBANKING',
        shouldFailTest,
        transactionRef: `TXN-DEV-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      });

      if (res.success && res.booking) {
        onSuccess(res.booking);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment verification failed. Please try again or reselect seats.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            <h3 className="font-semibold text-sm tracking-tight">Secure Sandbox Checkout</h3>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order Summary Strip */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center justify-between text-xs">
          <div>
            <span className="font-medium text-slate-500">Order:</span>{' '}
            <span className="font-bold text-slate-800 font-mono">{order.bookingReference}</span>
            <div className="text-slate-600 truncate max-w-xs">{order.eventName}</div>
          </div>
          <div className="text-right">
            <div className="text-slate-500 font-medium">Total to Pay</div>
            <div className="text-base font-bold text-slate-900 font-mono tabular-nums">
              ₹{order.totalAmount.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Payment Methods Tabs */}
        <div className="p-6">
          <div className="flex rounded-lg bg-slate-100 p-1 mb-5">
            <button
              type="button"
              onClick={() => setMethod('CARD')}
              className={`flex-1 py-2 text-xs font-medium rounded-md flex items-center justify-center gap-1.5 transition-all ${
                method === 'CARD'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setMethod('UPI')}
              className={`flex-1 py-2 text-xs font-medium rounded-md flex items-center justify-center gap-1.5 transition-all ${
                method === 'UPI'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>UPI / QR</span>
            </button>
            <button
              type="button"
              onClick={() => setMethod('NETBANKING')}
              className={`flex-1 py-2 text-xs font-medium rounded-md flex items-center justify-center gap-1.5 transition-all ${
                method === 'NETBANKING'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>NetBanking</span>
            </button>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-snug">{errorMessage}</div>
            </div>
          )}

          {/* Card Form */}
          {method === 'CARD' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Cardholder Name</label>
                <input
                  type="text"
                  value={cardName}
                  onChange={e => setCardName(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Card Number (Test)</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={e => setCardNumber(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono tracking-wider"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Expiry</label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={e => setCardExpiry(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">CVV</label>
                  <input
                    type="password"
                    value={cardCvv}
                    onChange={e => setCardCvv(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* UPI Form */}
          {method === 'UPI' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Virtual Payment Address (VPA / UPI ID)</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={e => setUpiId(e.target.value)}
                  placeholder="username@upi"
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                A sandbox payment request will be simulated for testing purposes.
              </p>
            </div>
          )}

          {/* Netbanking Form */}
          {method === 'NETBANKING' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Select Bank</label>
                <select
                  value={bank}
                  onChange={e => setBank(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="HDFC Bank">HDFC Bank</option>
                  <option value="ICICI Bank">ICICI Bank</option>
                  <option value="State Bank of India">State Bank of India</option>
                  <option value="Axis Bank">Axis Bank</option>
                  <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                </select>
              </div>
            </div>
          )}

          {/* Sandbox Indicator */}
          <div className="mt-5 p-2.5 bg-indigo-50/60 rounded-lg border border-indigo-100 flex items-center gap-2 text-xs text-indigo-900">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="text-[11px]">
              <strong>Test Gateway Mode:</strong> Real bank cards are not charged. You can test both successful authorization and payment failure scenarios.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 space-y-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleProcessPayment(false)}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying hold & processing payment...</span>
                </>
              ) : (
                <span>Pay ₹{order.totalAmount.toLocaleString()} (Simulate Success)</span>
              )}
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleProcessPayment(true)}
              className="w-full py-2 px-4 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <span>Simulate Payment Decline / Failure (Test Edge Case)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
