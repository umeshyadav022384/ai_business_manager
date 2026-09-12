import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Button from "../ui/Button";
import { formatCurrency } from "../../lib/currency";

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    amount: number;
    payment_date: string;
    payment_method: string;
    reference_number?: string | null;
    notes?: string | null;
  }) => Promise<void>;
  currentBalance: number;
  currencyCode: string;
  title: string;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function RecordPaymentModal({
  isOpen,
  onClose,
  onSubmit,
  currentBalance,
  currencyCode,
  title,
}: RecordPaymentModalProps) {
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayIsoDate());
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setAmount("");
    setPaymentDate(todayIsoDate());
    setPaymentMethod("cash");
    setReferenceNumber("");
    setNotes("");
    setError(null);
  }, [isOpen]);

  const numericAmount = Number(amount) || 0;
  const newBalance = Math.max(0, currentBalance - numericAmount);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isSubmitting) return;
    if (!amount || numericAmount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (numericAmount > currentBalance) {
      setError(
        `Payment cannot exceed the outstanding balance of ${formatCurrency(currentBalance, currencyCode)}.`
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        amount: numericAmount,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        reference_number: referenceNumber || null,
        notes: notes || null,
      });
      onClose();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? "Could not record this payment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="record-payment-form" isLoading={isSubmitting}>
            Record Payment
          </Button>
        </>
      }
    >
      <form id="record-payment-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</p>
        )}

        <div className="rounded-lg bg-ink-50 px-3 py-2 text-sm">
          <div className="flex justify-between text-ink-500">
            <span>Current Balance</span>
            <span className="font-medium text-ink-800">
              {formatCurrency(currentBalance, currencyCode)}
            </span>
          </div>
          {numericAmount > 0 && (
            <div className="mt-1 flex justify-between text-ink-500">
              <span>New Balance</span>
              <span className="font-medium text-success-700">
                {formatCurrency(newBalance, currencyCode)}
              </span>
            </div>
          )}
        </div>

        <Input
          label="Amount"
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Payment Date"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
          />
          <Select label="Payment Method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option value="cash">Cash</option>
            <option value="bank">Bank</option>
            <option value="card">Card</option>
            <option value="digital_wallet">Digital Wallet</option>
            <option value="other">Other</option>
          </Select>
        </div>

        <Input
          label="Reference Number"
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
          placeholder="Optional"
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink-700">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="rounded-lg border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
        </div>
      </form>
    </Modal>
  );
}