export const required = (label = 'This field') => (value) =>
  value === undefined || value === null || String(value).trim() === '' ? `${label} is required` : '';

export const minLength = (n, label = 'This field') => (value) =>
  value && value.length < n ? `${label} must be at least ${n} characters` : '';

export const maxLength = (n, label = 'This field') => (value) =>
  value && value.length > n ? `${label} must be under ${n} characters` : '';

export const isEmail = (value) =>
  value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Enter a valid email address' : '';

export const isPhone = (value) =>
  value && !/^[6-9]\d{9}$/.test(String(value).replace(/\D/g, '').slice(-10)) ? 'Enter a valid 10-digit phone number' : '';

export const isOtp = (len = 6) => (value) =>
  value && !new RegExp(`^\\d{${len}}$`).test(value) ? `Enter the ${len}-digit OTP` : '';

export const passwordStrength = (value = '') => {
  let score = 0;
  if (value.length >= 8) score++;
  if (/[A-Z]/.test(value)) score++;
  if (/[a-z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
  return { score, label: labels[score] };
};

export const isStrongPassword = (value) => {
  if (!value) return 'Password is required';
  if (value.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(value)) return 'Include at least one uppercase letter';
  if (!/[a-z]/.test(value)) return 'Include at least one lowercase letter';
  if (!/\d/.test(value)) return 'Include at least one number';
  if (!/[^A-Za-z0-9]/.test(value)) return 'Include at least one special character';
  return '';
};

export const matches = (otherValue, label = 'Fields') => (value) =>
  value !== otherValue ? `${label} do not match` : '';

/** Validate a values object against a schema of { field: [validatorFns] }. Returns { field: error }. */
export function validateForm(values, schema) {
  const errors = {};
  for (const field of Object.keys(schema)) {
    for (const validator of schema[field]) {
      const err = validator(values[field], values);
      if (err) {
        errors[field] = err;
        break;
      }
    }
  }
  return errors;
}

export function isValidUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

/** Rejects javascript: and other unsafe URL schemes (XSS guard for user-supplied links). */
export function sanitizeUrl(value) {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (/^javascript:/i.test(trimmed) || /^data:/i.test(trimmed)) return '';
  return trimmed;
}

export function validateFile(file, { maxSizeMb = 5, allowedTypes = ['image/png', 'image/jpeg', 'application/pdf'] } = {}) {
  if (!file) return 'File is required';
  if (!allowedTypes.includes(file.type)) return 'Unsupported file type';
  if (file.size > maxSizeMb * 1024 * 1024) return `File must be under ${maxSizeMb}MB`;
  return '';
}
