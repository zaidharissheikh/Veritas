import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { passwordChecks, validateEmail, validatePassword, validateRegisterForm, validateResetForm } from '../src/lib/validators.js';

const emails = JSON.parse(readFileSync(new URL('../../shared/email-validation-cases.json', import.meta.url), 'utf8'));

test('registration rejects whitespace anywhere in a password', () => {
  for (const whitespace of [' ', '\t', '\n', '\r', '\u00a0', '\u2003', '\u202f', '\u3000']) {
    for (const password of [`${whitespace}Passw0rd!`, `Pass${whitespace}w0rd!`, `Passw0rd!${whitespace}`]) {
      assert.equal(validatePassword(password), 'Passwords cannot contain spaces or other whitespace.');
      assert.ok(validateRegisterForm({ email: 'user@example.com', password }).password);
      assert.equal(passwordChecks(password).find(({ label }) => label.startsWith('No spaces')).ok, false);
    }
  }
});

test('email validation accepts realistic valid formats and rejects malformed addresses', () => {
  for (const email of emails.valid) assert.equal(validateEmail(email), null, email);
  for (const email of emails.invalid) assert.ok(validateEmail(email), email);
  for (const email of ['a'.repeat(65) + '@example.com', 'a@' + 'b'.repeat(64) + '.com',
    'a'.repeat(64) + '@' + ['b'.repeat(63), 'b'.repeat(63), 'b'.repeat(63), 'com'].join('.')]) {
    assert.ok(validateEmail(email), 'Overlong address must fail');
  }
});

test('password reset requires a valid password and matching confirmation', () => {
  assert.deepEqual(validateResetForm({ password: 'NewPassw0rd!', confirmPassword: 'NewPassw0rd!' }), {});
  assert.ok(validateResetForm({ password: 'NewPassw0rd!', confirmPassword: 'Different1' }).confirmPassword);
  assert.ok(validateResetForm({ password: 'NewPassw0rd!', confirmPassword: '' }).confirmPassword);
  assert.ok(validateResetForm({ password: 'New Pass1', confirmPassword: 'New Pass1' }).password);
  assert.ok(validatePassword('a1'.repeat(40)));
});

test('registration accepts valid passwords and reports all checklist rules as met', () => {
  for (const password of ['Passw0rd!', 'hello123', 'L0ng!@#$%^&*()_+-=Password']) {
    assert.equal(validatePassword(password), null);
    assert.deepEqual(validateRegisterForm({ email: 'user@example.com', password }), {});
    assert.ok(passwordChecks(password).every(({ ok }) => ok));
  }
});

test('the no-whitespace rule is unmet until a password is entered', () => {
  assert.equal(passwordChecks('').find(({ label }) => label.startsWith('No spaces')).ok, false);
});
