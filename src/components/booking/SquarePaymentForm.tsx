import React, { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';

export interface SquarePaymentFormHandle {
  tokenize: () => Promise<string | null>;
}

interface SquarePaymentFormProps {
  onTokenized: (token: string) => void;
  onCardReady?: (ready: boolean) => void;
  applicationId: string;
  locationId: string;
}

const SquarePaymentForm = forwardRef<SquarePaymentFormHandle, SquarePaymentFormProps>(
  ({ onTokenized, onCardReady, applicationId, locationId }, ref) => {
    const [error, setError] = useState<string | null>(null);
    const cardRef = useRef<any>(null);
    const fieldValidity = useRef<Record<string, boolean>>({});

    useImperativeHandle(ref, () => ({
      tokenize: async () => {
        if (!cardRef.current) {
          setError('Card input not ready');
          return null;
        }
        setError(null);
        try {
          const result = await cardRef.current.tokenize();
          if (result.status === 'OK') {
             onTokenized(result.token);
             return result.token;
          } else {
             setError(result.errors[0].message);
             return null;
          }
        } catch (e: any) {
          console.error('Tokenization failed', e);
          setError('An error occurred during payment processing.');
          return null;
        }
      }
    }));

    useEffect(() => {
      let cancelled = false;

      const loadAndInit = async () => {
        if (!window.Square) {
          await new Promise<void>((resolve, reject) => {
            const existing = document.querySelector('script[src*="squarecdn.com"]');
            if (existing) { resolve(); return; }
            const script = document.createElement('script');
            script.src = 'https://sandbox.web.squarecdn.com/v1/square.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Square SDK failed to load'));
            document.head.appendChild(script);
          });
        }

        if (!window.Square || cancelled) return;

        try {
          const payments = window.Square.payments(applicationId, locationId);
          const card = await payments.card();
          if (cancelled) { card.destroy(); return; }
          await card.attach('#card-container');
          cardRef.current = card;
          card.addEventListener('inputEvent', (event: any) => {
            const { field, currentState } = event.detail;
            fieldValidity.current[field] = currentState.isCompletelyValid;
            const allValid = ['cardNumber', 'cvv', 'expirationDate', 'postalCode']
              .every(f => fieldValidity.current[f]);
            onCardReady?.(allValid);
          });
        } catch (e) {
          if (!cancelled) {
            console.error('Failed to initialize Square payments', e);
            setError('Payment form failed to load. Please refresh the page.');
          }
        }
      };

      loadAndInit().catch(e => {
        if (!cancelled) {
          console.error('Square SDK load error', e);
          setError('Payment form failed to load. Please refresh the page.');
        }
      });

      return () => { cancelled = true; };
    }, [applicationId, locationId, onCardReady]);

    return (
      <div className="space-y-4">
        <div id="card-container" className="min-h-[100px] border border-brown/20 rounded-lg p-4 bg-white"></div>
        {error && <p className="text-red-500 text-sm font-bold bg-white/10 p-2 rounded">{error}</p>}
      </div>
    );
  }
);

SquarePaymentForm.displayName = 'SquarePaymentForm';
export default SquarePaymentForm;

// Add Square to window type
declare global {
  interface Window {
    Square: any;
  }
}
