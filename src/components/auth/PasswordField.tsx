"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function PasswordField({
  label,
  value,
  onChange,
  minLength,
  hint,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minLength?: number;
  hint?: string;
  // "current-password" | "new-password" — lets browser password managers
  // tell a login field apart from a signup/reset one, so autofill and the
  // save-password prompt target the right field (web.dev sign-in/sign-up
  // form guidance, docs/37). Defaults to "current-password", the more
  // common case across this app's forms.
  autoComplete?: "current-password" | "new-password";
}) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <label className="flex flex-col gap-1" htmlFor={id}>
      <span className="text-sm">{label}</span>
      <span className="relative flex items-center">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          minLength={minLength}
          autoComplete={autoComplete ?? "current-password"}
          className="w-full rounded border border-border bg-transparent px-3 py-2 pr-10 outline-none focus:border-border-strong"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-2 flex h-6 w-6 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}
