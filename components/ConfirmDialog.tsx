"use client";

import { Modal, ModalHeader } from "@/components/Modal";
import { Icon } from "@/components/Icon";

/** Dialog di conferma riutilizzabile (azioni distruttive). */
export function ConfirmDialog({
  title = "Confermi?",
  message,
  confirmLabel = "Conferma",
  cancelLabel = "Annulla",
  danger = false,
  onConfirm,
  onClose,
}: {
  title?: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose} size="sm">
      <ModalHeader title={title} onClose={onClose} />
      <div className="p-6">
        <div className="flex items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${danger ? "bg-red-50 text-red-600" : "brand-soft-bg brand-text"}`}>
            <Icon name={danger ? "medical" : "bell"} size={20} />
          </span>
          <p className="text-sm leading-relaxed text-foreground/80">{message}</p>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-background">{cancelLabel}</button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${danger ? "bg-red-600 hover:bg-red-700" : "brand-bg"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
