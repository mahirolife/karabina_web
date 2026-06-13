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
      if (!window.Square) {
        setError('Square SDK not loaded');
        return;
      }

      let cancelled = false;

      const initializePayments = async () => {
        try {
          const payments = window.Square.payments(applicationId, locationId);
          const card = await payments.card();
          if (cancelled) { card.destroy(); return; }
          await card.attach('#card-container');
          cardRef.current = card;
          card.addEventListener('inputEvent', (event: any) => {
            const { field, currentState } = event.detail;
            fieldValidity.current[field] = currentState.isCompletelyValid;
            const ready = ['cardNumber', 'cvv', 'expirationDate'].every(
              f => fieldValidity.current[f] === true
            );
            onCardReady?.(ready);
          });
        } catch (e) {
          if (!cancelled) {
            console.error('Failed to initialize Square payments', e);
            setError('Failed to load card input. Please try refreshing.');
          }
        }
      };

      initializePayments();

      return () => {
        cancelled = true;
        if (cardRef.current) {
          cardRef.current.destroy();
          cardRef.current = null;
        }
      };
    }, [applicationId, locationId]);

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
