interface ModalProps {
  children: React.ReactNode;
  width?: number;
  onClose: () => void;
}

export function Modal({ children, width = 380, onClose }: ModalProps) {
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(18,24,26,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: "var(--radius-lg)", padding: "28px 32px", width, boxShadow: "var(--shadow-modal)" }}
      >
        {children}
      </div>
    </div>
  );
}

interface FlashMessageProps {
  message: string;
}

/** Top-right toast. Color alone signals success vs. error — pass a message starting with "Error:" or similar for the error tint, otherwise success. */
export function FlashMessage({ message }: FlashMessageProps) {
  if (!message) return null;
  const isError = /^(error|⚠)/i.test(message);
  return (
    <div
      style={{
        position: "fixed",
        top: 76,
        right: 24,
        background: isError ? "var(--error-100)" : "var(--success-100)",
        borderRadius: "var(--radius-sm)",
        padding: "10px 18px",
        fontSize: 13,
        fontWeight: 500,
        color: isError ? "var(--error-700)" : "var(--success-700)",
        zIndex: 50,
        boxShadow: "var(--shadow-card-hover)",
        fontFamily: "var(--font-body)",
      }}
    >
      {message}
    </div>
  );
}
