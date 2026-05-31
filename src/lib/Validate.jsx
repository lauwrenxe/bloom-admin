// ── BLOOM GAD Validation Utility ─────────────────────────────────
// Shared across all admin panel pages

export function validate(value, rules) {
  for (const rule of rules) {
    const v = (value ?? "").toString().trim();

    if (rule === 'required' || rule?.rule === 'required') {
      if (!v) return typeof rule === 'string' ? 'This field is required.' : rule.msg;
    }

    const r = rule?.rule || rule;
    const msg = rule?.msg || 'Invalid value.';

    if (!v && r !== 'required') continue; // skip other rules if empty (optional field)

    if (r === 'noNumbers') {
      if (/\d/.test(v)) return msg;
    }
    if (r === 'noSpecialChars') {
      if (/[^a-zA-Z\s.\-'ñÑáéíóúÁÉÍÓÚ]/.test(v)) return msg;
    }
    if (r === 'alphaNumeric') {
      if (/[^a-zA-Z0-9\-_]/.test(v)) return msg;
    }
    if (r === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return msg;
    }
    if (r === 'integer') {
      if (!Number.isInteger(Number(v))) return msg;
    }
    if (r?.startsWith('minLength:')) {
      const min = parseInt(r.split(':')[1]);
      if (v.length < min) return msg;
    }
    if (r?.startsWith('maxLength:')) {
      const max = parseInt(r.split(':')[1]);
      if (v.length > max) return msg;
    }
    if (r?.startsWith('min:')) {
      const min = parseFloat(r.split(':')[1]);
      if (Number(v) < min) return msg;
    }
    if (r?.startsWith('max:')) {
      const max = parseFloat(r.split(':')[1]);
      if (Number(v) > max) return msg;
    }
    if (r === 'notFuture') {
      if (new Date(v) > new Date()) return msg;
    }
    if (r === 'notPast') {
      const today = new Date(); today.setHours(0,0,0,0);
      if (new Date(v) < today) return msg;
    }
    if (r?.startsWith('maxTags:')) {
      const max = parseInt(r.split(':')[1]);
      const tags = v.split(',').map(t => t.trim()).filter(Boolean);
      if (tags.length > max) return msg;
    }
  }
  return null; // no error
}

// Validate multiple fields at once — returns { field: errorMsg } or {}
export function validateAll(form, rules) {
  const errors = {};
  for (const [field, fieldRules] of Object.entries(rules)) {
    const err = validate(form[field], fieldRules);
    if (err) errors[field] = err;
  }
  return errors;
}

// Block non-letter characters in name inputs
export function nameKeyFilter(e) {
  // Allow: letters, spaces, hyphens, periods, apostrophes, Filipino chars
  if (!/[a-zA-ZñÑáéíóúÁÉÍÓÚ\s.\-']/.test(e.key) && !['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Home','End'].includes(e.key)) {
    e.preventDefault();
  }
}

// Block non-numeric characters in number inputs
export function numberOnlyFilter(e) {
  if (!/[0-9]/.test(e.key) && !['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Home','End'].includes(e.key)) {
    e.preventDefault();
  }
}

// Inline error display component (returns JSX style object + message)
export function fieldError(msg) {
  if (!msg) return null;
  return { border: '1.5px solid #fca5a5' };
}

export const ERROR_STYLE = { fontSize: 11, color: '#dc2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 };
export const INPUT_ERROR_STYLE = (hasError) => hasError ? { border: '1.5px solid #fca5a5', background: '#fff5f5' } : {};

// ── Aliases for ModulesPage compatibility ─────────────────────────

// React component version of FieldError (uppercase = JSX component)
import React from "react";

export function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <div style={ERROR_STYLE}>
      ⚠ {msg}
    </div>
  );
}

// V object — maps ModulesPage validator calls to your existing validate()
export const V = {
  title: (val, label = "Title") => {
    if (!val?.trim()) return `${label} is required.`;
    if (val.trim().length < 3) return `${label} must be at least 3 characters.`;
    if (val.trim().length > 200) return `${label} must be under 200 characters.`;
    return null;
  },
  name: (val, label = "Name") => {
    if (!val?.trim()) return null;
    if (/\d/.test(val)) return `${label} must not contain numbers.`;
    if (val.trim().length > 100) return `${label} must be under 100 characters.`;
    return null;
  },
  percent: (val, label = "Score") => {
    const n = Number(val);
    if (isNaN(n) || n < 0 || n > 100) return `${label} must be between 0 and 100.`;
    return null;
  },
  positiveInt: (val, label = "Value", min = 1, max = 9999) => {
    const n = Number(val);
    if (!Number.isInteger(n) || n < min || n > max)
      return `${label} must be a whole number between ${min} and ${max}.`;
    return null;
  },
  date: (val) => {
    if (!val) return null;
    if (isNaN(Date.parse(val))) return "Not a valid date.";
    return null;
  },
  tags: (val) => {
    if (!val) return null;
    const tags = val.split(",").map(t => t.trim()).filter(Boolean);
    if (tags.length > 10) return "Maximum 10 tags allowed.";
    if (tags.some(t => t.length > 30)) return "Each tag must be 30 characters or less.";
    return null;
  },
  all: (checks) => {
    const errors = {};
    let hasError = false;
    for (const [key, msg] of Object.entries(checks)) {
      if (msg) { errors[key] = msg; hasError = true; }
    }
    return hasError ? errors : null;
  },
};