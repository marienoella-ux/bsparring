import type { ComponentProps } from "react";

type Base = { id: string; label: string; hint?: string; error?: string; optional?: boolean };

function Wrapper({ id, label, hint, error, optional, children }: Base & { children: React.ReactNode }) {
  return (
    <div className="bs-field">
      <label className="bs-field-label" htmlFor={id}>
        {label} {optional && <span className="bs-field-opt">(facultatif)</span>}
      </label>
      {children}
      {error ? (
        <p className="bs-field-msg bs-field-error" id={`${id}-msg`}>{error}</p>
      ) : hint ? (
        <p className="bs-field-msg" id={`${id}-msg`}>{hint}</p>
      ) : null}
    </div>
  );
}

export function Field({ id, label, hint, error, optional, ...input }: Base & ComponentProps<"input">) {
  return (
    <Wrapper id={id} label={label} hint={hint} error={error} optional={optional}>
      <input
        id={id}
        name={input.name ?? id}
        className={error ? "bs-input bs-input-invalid" : "bs-input"}
        aria-invalid={error ? true : undefined}
        aria-describedby={hint || error ? `${id}-msg` : undefined}
        required={!optional}
        {...input}
      />
    </Wrapper>
  );
}

export function TextArea({ id, label, hint, error, optional, ...input }: Base & ComponentProps<"textarea">) {
  return (
    <Wrapper id={id} label={label} hint={hint} error={error} optional={optional}>
      <textarea
        id={id}
        name={input.name ?? id}
        className={error ? "bs-input bs-input-invalid" : "bs-input"}
        aria-invalid={error ? true : undefined}
        aria-describedby={hint || error ? `${id}-msg` : undefined}
        required={!optional}
        {...input}
      />
    </Wrapper>
  );
}

export function Select({ id, label, hint, error, optional, children, ...input }: Base & ComponentProps<"select">) {
  return (
    <Wrapper id={id} label={label} hint={hint} error={error} optional={optional}>
      <select
        id={id}
        name={input.name ?? id}
        className="bs-input bs-input-select"
        aria-describedby={hint || error ? `${id}-msg` : undefined}
        required={!optional}
        {...input}
      >
        {children}
      </select>
    </Wrapper>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="alert alert-danger" role="alert">{message}</p>;
}
