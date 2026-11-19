// Fast form feedback; the backend also checks syntax and registration-domain deliverability.
const LOCAL_PART = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+$/;
const DOMAIN_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const RESERVED_TLDS = new Set(['arpa', 'invalid', 'local', 'localhost', 'onion', 'test']);

function validAddress(value) {
  const parts = value.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || local.length > 64 || !LOCAL_PART.test(local)
      || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
  if (!domain || !/^[\p{L}\p{N}\p{M}.-]+$/u.test(domain)) return false;
  let asciiDomain;
  try {
    asciiDomain = new URL(`http://${domain.normalize('NFC')}`).hostname;
  } catch {
    return false;
  }
  const labels = asciiDomain.split('.');
  const tld = labels.at(-1);
  return local.length + asciiDomain.length + 1 <= 254
    && labels.length >= 2 && labels.every((label) => DOMAIN_LABEL.test(label))
    && /[a-z]/i.test(tld) && !RESERVED_TLDS.has(tld);
}

export function validateEmail(email) {
  const value = (email ?? '').trim();
  if (!value) return 'Enter your email address.';
  if (!validAddress(value)) return 'Enter a valid email address, like name@example.com.';
  return null;
}
