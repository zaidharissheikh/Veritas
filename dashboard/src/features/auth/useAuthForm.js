import { useState } from 'react';

const GENERIC_ERROR = 'Something went wrong. Please try again.';

// Small form controller for the auth pages. Field messages come from `validate`
// and are shown once a field has been blurred or the form submitted; a rejected
// `onSubmit` becomes a form-level message via `errorMessage(error)`.
export function useAuthForm({ initialValues, validate, onSubmit, errorMessage }) {
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const allErrors = validate(values);
  const errors = visibleErrors(allErrors, touched, submitted);

  function fieldProps(name) {
    return {
      name,
      value: values[name],
      error: errors[name],
      onChange: (event) => setValues((prev) => ({ ...prev, [name]: event.target.value })),
      onBlur: () => setTouched((prev) => ({ ...prev, [name]: true })),
    };
  }

  async function submitValues(nextValues) {
    setValues(nextValues);
    setFormError(null);
    setSubmitting(true);
    try {
      await onSubmit(nextValues);
    } catch (error) {
      setFormError(errorMessage?.(error) ?? error?.message ?? GENERIC_ERROR);
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    const firstInvalid = Object.keys(allErrors)[0];
    if (firstInvalid) {
      event.currentTarget.elements.namedItem(firstInvalid)?.focus();
      return;
    }
    submitValues(values);
  }

  return { values, errors, formError, submitting, fieldProps, handleSubmit, submitValues };
}

function visibleErrors(allErrors, touched, submitted) {
  const shown = {};
  for (const [name, message] of Object.entries(allErrors)) {
    if (submitted || touched[name]) shown[name] = message;
  }
  return shown;
}
