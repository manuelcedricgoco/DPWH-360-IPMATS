import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icon from '../ui/Icon.jsx';

/**
 * Password field with ONE show/hide button (the browser's own reveal button is
 * hidden in index.css). Accepts the same props as <input>, including value and
 * onChange; it starts empty and is never pre-filled here.
 *
 * - The DOM input is deliberately uncontrolled: React mirrors a controlled
 *   input's value into the HTML value attribute, which would leave the typed
 *   password readable in the page markup. The parent's `value` is still applied
 *   (e.g. clearing the form) by writing the DOM property only.
 * - While revealed, the field is type="text". Browsers keep a history of text-field
 *   entries and may offer it in other fields later, so the field switches back to
 *   type="password" as soon as its form is submitted, and spellcheck/autocorrect
 *   are off so the visible password is never sent to a spelling service.
 */
export default function PasswordInput({ className = 'input', value, ...props }) {
  const [visible, setVisible] = useState(false);
  const inputRef = useRef(null);

  // Apply the parent's value to the DOM property (never the attribute).
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (el && value !== undefined && el.value !== value) el.value = value ?? '';
  }, [value]);

  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return undefined;
    const hideOnSubmit = () => {
      if (inputRef.current) inputRef.current.type = 'password'; // before the browser reads the form
      setVisible(false);
    };
    form.addEventListener('submit', hideOnSubmit, true);
    return () => form.removeEventListener('submit', hideOnSubmit, true);
  }, []);

  return (
    <div className="relative">
      <input
        {...props}
        ref={inputRef}
        type={visible ? 'text' : 'password'}
        spellCheck={false}
        autoCapitalize="none"
        autoCorrect="off"
        className={`${className} pr-11`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        disabled={props.disabled}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-ink-3 transition-colors hover:text-navy-700 focus-visible:text-navy-700"
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        aria-controls={props.id}
      >
        <Icon name={visible ? 'eyeOff' : 'eye'} className="h-[18px] w-[18px]" />
      </button>
    </div>
  );
}
