import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { createCustomer, updateCustomer } from "../../api/customers";
import type { CustomerDto } from "../../api/customers";

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
  customer?: CustomerDto;
}

/** One modal for both create and edit — same pattern as
 * SupplierFormModal. */
export default function CustomerFormModal({
  isOpen,
  onClose,
  onSaved,
  customer,
}: CustomerFormModalProps) {
  const isEditMode = Boolean(customer);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setName(customer?.name ?? "");
    setPhone(customer?.phone ?? "");
    setEmail(customer?.email ?? "");
    setAddress(customer?.address ?? "");
    setNotes(customer?.notes ?? "");
  }, [isOpen, customer]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const payload = {
      name,
      phone: phone || null,
      email: email || null,
      address: address || null,
      notes: notes || null,
    };

    try {
      if (isEditMode && customer) {
        await updateCustomer(customer.id, payload);
        onSaved(`"${name}" was updated.`);
      } else {
        await createCustomer(payload);
        onSaved(`"${name}" was added.`);
      }
      onClose();
    } catch {
      setError("Could not save this customer. Please check the values and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? "Edit Customer" : "Add Customer"}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="customer-form" isLoading={isSubmitting}>
            {isEditMode ? "Save Changes" : "Add Customer"}
          </Button>
        </>
      }
    >
      <form id="customer-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">
            {error}
          </p>
        )}

        <Input
          label="Customer Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Ram Store Customer"
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="98XXXXXXXX"
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="customer@example.com"
          />
        </div>

        <Input
          label="Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Customer's address"
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink-700">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Optional notes about this customer"
            className="rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
        </div>
      </form>
    </Modal>
  );
}