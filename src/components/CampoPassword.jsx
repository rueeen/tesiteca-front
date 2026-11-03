import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
export default function CampoPassword({
  label = "Contraseña",
  value,
  onChange,
  error,
  autoComplete = "new-password",
  ...props
}) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  return (
    <div className="password-field">
      <label htmlFor={id}>{label}</label>
      <div className="password-input">
        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          required
          {...props}
        />
        <button
          type="button"
          className="icon-button"
          aria-label={`${visible ? "Ocultar" : "Mostrar"} ${label.toLowerCase()}`}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </button>
      </div>
      {error && (
        <span id={`${id}-error`} className="field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
