"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonVariant } from "./Button";

// Bouton d'envoi désactivé pendant l'envoi (évite les doubles soumissions en 3G).
export function SubmitButton({ children, variant = "primary" }: { children: React.ReactNode; variant?: ButtonVariant }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} block disabled={pending} aria-busy={pending}>
      {children}
    </Button>
  );
}
