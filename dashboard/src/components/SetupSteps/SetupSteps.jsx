import './SetupSteps.css';

const STEPS = [
  {
    title: 'Install the extension',
    text: 'Open chrome://extensions, turn on Developer mode and choose "Load unpacked" → the extension folder.',
  },
  {
    title: 'Open an article or a YouTube video',
    text: 'Any news story or watch page will do.',
  },
  {
    title: 'Click Veritas',
    text: 'The popup scores the page, and the result lands here on your dashboard.',
  },
];

/** Numbered "how to get started" list used by first-run empty states. */
export function SetupSteps() {
  return (
    <ol className="setup-steps" aria-label="How to get started">
      {STEPS.map((step, index) => (
        <li key={step.title} className="setup-steps__item">
          <span className="setup-steps__num tabular" aria-hidden="true">
            {index + 1}
          </span>
          <span className="setup-steps__body">
            <span className="setup-steps__title">{step.title}</span>
            <span className="setup-steps__text">{step.text}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
