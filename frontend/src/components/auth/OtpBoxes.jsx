import { useEffect, useRef } from "react";

// 6 separate digit boxes with auto-advance, backspace navigation, and paste support.
export default function OtpBoxes({ value, onChange }) {
  const refs = useRef([]);
  const digits = value.split("");

  const setAt = (i, d) => {
    const arr = value.split("");
    arr[i] = d;
    onChange(arr.join("").slice(0, 6));
  };

  const onKeyDown = (i) => (e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[i]) setAt(i, "");
      else if (i > 0) { refs.current[i - 1]?.focus(); setAt(i - 1, ""); }
    } else if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    else if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
  };

  const onInput = (i) => (e) => {
    const d = e.target.value.replace(/\D/g, "").slice(-1);
    if (!d) return;
    setAt(i, d);
    if (i < 5) refs.current[i + 1]?.focus();
  };

  const onPaste = (e) => {
    e.preventDefault();
    const txt = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6);
    if (txt) { onChange(txt); refs.current[Math.min(txt.length, 5)]?.focus(); }
  };

  useEffect(() => { refs.current[0]?.focus(); }, []);

  return (
    <div className="otp-row" onPaste={onPaste}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <input
          key={i} ref={(el) => (refs.current[i] = el)}
          className={`otp-box ${digits[i] ? "filled" : ""}`}
          inputMode="numeric" maxLength={1} value={digits[i] || ""}
          onChange={onInput(i)} onKeyDown={onKeyDown(i)} aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}
