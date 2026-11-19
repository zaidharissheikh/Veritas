// Mock authentication API backed by localStorage ('veritas.users'). Used only when
// VITE_USE_MOCK=true; it mirrors http/authHttp.js: same functions, return shapes and error codes
// (EMAIL_TAKEN, INVALID_INPUT, INVALID_CREDENTIALS).
import { apiError as authError } from '../apiError.js';
import { DEMO_ACCOUNT } from '../demoAccount.js';
import { validateRegisterForm } from '../../lib/validators.js';
import { delay } from './delay.js';

const USERS_KEY = 'veritas.users';
const TOKEN_TTL_SECONDS = 30 * 60;
const MOCK_SIGNING_SECRET = 'veritas-mock-secret'; // demo only: a real server signs tokens
const encoder = new TextEncoder();

const DEMO_USER_ID = 'usr_demo';

const normalizeEmail = (email) => String(email ?? '').trim().toLowerCase();

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function randomHex(byteCount) {
  return toHex(crypto.getRandomValues(new Uint8Array(byteCount)));
}

async function sha256Hex(text) {
  return toHex(await crypto.subtle.digest('SHA-256', encoder.encode(text)));
}

// Salted SHA-256 so the mock store never holds a plain password (SRS: passwords stored hashed).
function hashPassword(password, salt) {
  return sha256Hex(`${salt}:${password}`);
}

function base64UrlEncode(text) {
  let binary = '';
  for (const byte of encoder.encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// JWT-shaped token (header.payload.signature). exp is in seconds since epoch, per the JWT spec.
async function createToken(user) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64UrlEncode(
    JSON.stringify({ sub: user.id, email: user.email, iat: issuedAt, exp: issuedAt + TOKEN_TTL_SECONDS }),
  );
  const signature = base64UrlEncode(await sha256Hex(`${header}.${payload}.${MOCK_SIGNING_SECRET}`));
  return `${header}.${payload}.${signature}`;
}

function readUsers() {
  try {
    const stored = JSON.parse(localStorage.getItem(USERS_KEY) ?? '[]');
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function findUser(users, email) {
  const target = normalizeEmail(email);
  return users.find((record) => normalizeEmail(record.email) === target) ?? null;
}

function toPublicUser({ id, email, createdAt }) {
  return { id, email, createdAt };
}

async function buildUserRecord({ id, email, password, createdAt = new Date().toISOString() }) {
  const salt = randomHex(16);
  return { id, email: normalizeEmail(email), createdAt, salt, passwordHash: await hashPassword(password, salt) };
}

// Adds the record unless the email is already registered. Read + write happen synchronously
// after hashing, so two concurrent calls cannot both insert the same email.
function insertUser(record) {
  const users = readUsers();
  if (findUser(users, record.email)) return false;
  writeUsers([...users, record]);
  return true;
}

async function ensureDemoUser() {
  if (findUser(readUsers(), DEMO_ACCOUNT.email)) return;
  insertUser(await buildUserRecord({ id: DEMO_USER_ID, ...DEMO_ACCOUNT }));
}

export async function register({ email, password } = {}) {
  await delay();
  const errors = validateRegisterForm({ email, password });
  const firstError = Object.values(errors)[0];
  if (firstError) throw authError('INVALID_INPUT', firstError);

  await ensureDemoUser();
  const takenMessage = 'An account with this email already exists. Try signing in instead.';
  if (findUser(readUsers(), email)) throw authError('EMAIL_TAKEN', takenMessage);

  const record = await buildUserRecord({ id: `usr_${randomHex(8)}`, email, password });
  if (!insertUser(record)) throw authError('EMAIL_TAKEN', takenMessage);
  return toPublicUser(record);
}

export async function login({ email, password } = {}) {
  await delay();
  await ensureDemoUser();
  const record = findUser(readUsers(), email);
  const matches = record !== null && (await hashPassword(String(password ?? ''), record.salt)) === record.passwordHash;
  if (!matches) throw authError('INVALID_CREDENTIALS', 'That email and password don’t match. Check them and try again.');

  const user = toPublicUser(record);
  return { user, token: await createToken(user) };
}
