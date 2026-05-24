import { useEffect, useState } from "react";

interface HoneypotFieldProps {
  onBotDetected?: () => void;
  fieldName?: string;
}

/**
 * HoneypotField component
 * A hidden field that bots will fill but humans won't see
 * If this field has a value on submit, it's likely a bot
 */
const HoneypotField = ({ onBotDetected, fieldName = "website_url" }: HoneypotFieldProps) => {
  const [value, setValue] = useState("");

  useEffect(() => {
    // If the field gets a value, it's likely a bot
    if (value) {
      onBotDetected?.();
    }
  }, [value, onBotDetected]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: "-9999px",
        top: "-9999px",
        height: 0,
        width: 0,
        overflow: "hidden",
        opacity: 0,
        pointerEvents: "none"
      }}
    >
      {/* Multiple honeypot fields with different attractive names */}
      <label htmlFor={fieldName}>
        Website URL (leave blank)
        <input
          type="text"
          id={fieldName}
          name={fieldName}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </label>
      <label htmlFor="phone_number">
        Phone Number (leave blank)
        <input
          type="tel"
          id="phone_number"
          name="phone_number"
          tabIndex={-1}
          autoComplete="off"
        />
      </label>
      <label htmlFor="confirm_email">
        Confirm Email (leave blank)
        <input
          type="email"
          id="confirm_email"
          name="confirm_email"
          tabIndex={-1}
          autoComplete="off"
        />
      </label>
    </div>
  );
};

export default HoneypotField;

/**
 * Hook to check if honeypot was triggered
 */
export const useHoneypotCheck = (formRef: React.RefObject<HTMLFormElement>) => {
  const checkHoneypot = (): boolean => {
    if (!formRef.current) return false;
    
    const honeypotFields = ['website_url', 'phone_number', 'confirm_email'];
    const formData = new FormData(formRef.current);
    
    for (const field of honeypotFields) {
      const value = formData.get(field);
      if (value && typeof value === 'string' && value.trim()) {
        return true; // Bot detected
      }
    }
    
    return false;
  };

  return { checkHoneypot };
};
