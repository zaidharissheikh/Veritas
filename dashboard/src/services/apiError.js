// Every service failure, mock or HTTP, is an Error carrying a machine-readable `.code`.
// lib/errors.js turns the code into the sentence people see.

export function apiError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}
