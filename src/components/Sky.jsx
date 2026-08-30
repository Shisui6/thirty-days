import { currentDay, dateOfDay, fmtDay, fullDays, TOTAL_DAYS } from '../lib/state.js';

const WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen',
  'nineteen', 'twenty', 'twenty-one', 'twenty-two', 'twenty-three', 'twenty-four',
  'twenty-five', 'twenty-six', 'twenty-seven', 'twenty-eight', 'twenty-nine', 'thirty',
];

/**
 * The sun's height is the share of days you both completed — the one number
 * that needs no explanation and can't be gamed by one person doing all the work.
 */
export default function Sky({ s }) {
  const done = fullDays(s);
  const p = done / TOTAL_DAYS;
  const cy = 120 - 84 * p;
  const day = currentDay(s);

  let title;
  let sub;
  if (day < 1) {
    const away = 1 - day;
    title = 'Not started';
    sub = `Day one is ${fmtDay(dateOfDay(s, 1))} — ${away} day${away === 1 ? '' : 's'} to go.`;
  } else if (day > TOTAL_DAYS) {
    title = 'Thirty days';
    sub = `Finished ${fmtDay(dateOfDay(s, TOTAL_DAYS))}. Go collect the reward.`;
  } else {
    title = `Day ${WORDS[day] || day}`;
    sub = `${fmtDay(dateOfDay(s, day))} · ${TOTAL_DAYS - day} to go`;
  }

  return (
    <div className="hero">
      <svg viewBox="0 0 440 210" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFD9A0" />
            <stop offset="30%" stopColor="#FFAE85" />
            <stop offset="58%" stopColor="#E3806F" />
            <stop offset="80%" stopColor="#9C6685" />
            <stop offset="100%" stopColor="#4E6E80" />
          </linearGradient>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFF0C4" stopOpacity=".95" />
            <stop offset="55%" stopColor="#FFC071" stopOpacity=".45" />
            <stop offset="100%" stopColor="#FFC071" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="w1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2E6E7C" />
            <stop offset="100%" stopColor="#1B4F60" />
          </linearGradient>
          <linearGradient id="w2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#17495A" />
            <stop offset="100%" stopColor="#103744" />
          </linearGradient>
          <linearGradient id="w3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0E3341" />
            <stop offset="100%" stopColor="#0B2C39" />
          </linearGradient>
          <clipPath id="skyclip">
            <rect x="0" y="0" width="440" height="132" />
          </clipPath>
        </defs>

        <rect x="0" y="0" width="440" height="132" fill="url(#sky)" />

        <g clipPath="url(#skyclip)">
          {/* A scatter of stars in the dusk sky — still, until CSS gives them a slow twinkle. */}
          <g className="stars" fill="#FFF6E2">
            <circle className="star" cx="38" cy="22" r="1.4" style={{ animationDelay: '0s' }} />
            <circle className="star" cx="128" cy="58" r="1.1" style={{ animationDelay: '.6s' }} />
            <circle className="star" cx="188" cy="16" r="1.5" style={{ animationDelay: '1.4s' }} />
            <circle className="star" cx="238" cy="72" r="1" style={{ animationDelay: '.2s' }} />
            <circle className="star" cx="60" cy="88" r="1.2" style={{ animationDelay: '2.1s' }} />
            <circle className="star" cx="382" cy="58" r="1.4" style={{ animationDelay: '1s' }} />
            <circle className="star" cx="412" cy="18" r="1.1" style={{ animationDelay: '2.6s' }} />
            <circle className="star" cx="340" cy="92" r="1" style={{ animationDelay: '.9s' }} />
          </g>
          <circle cx="300" cy={cy} r={44 + 18 * p} fill="url(#glow)" />
          <circle cx="300" cy={cy} r="19" fill="#FFF1CE" />
          <g opacity=".55" fill="#7A5A72">
            <path d="M92 126 l0 -22 13 22 z" />
            <path d="M90 126 l-6 -13 6 0 z" />
            <path d="M78 127 h30 l-5 5 h-20 z" />
          </g>
          <g opacity=".3" fill="#FFF3DA">
            <ellipse cx="72" cy="40" rx="22" ry="6" />
            <ellipse cx="88" cy="35" rx="14" ry="5" />
            <ellipse cx="352" cy="26" rx="17" ry="5" />
          </g>
        </g>

        <g opacity={(0.28 + 0.4 * p).toFixed(2)} fill="#FFD9A0">
          <rect x="286" y="136" width="28" height="2.5" rx="1.2" />
          <rect x="292" y="145" width="16" height="2" rx="1" />
          <rect x="282" y="154" width="36" height="2" rx="1" />
          <rect x="294" y="164" width="12" height="1.8" rx=".9" />
        </g>

        <path d="M0 132 q55 -9 110 0 t110 0 t110 0 t110 0 v20 H0 z" fill="url(#w1)" />
        <path d="M0 150 q48 10 96 0 t96 0 t96 0 t96 0 t96 0 v26 H0 z" fill="url(#w2)" />
        <path d="M0 172 q60 -11 120 0 t120 0 t120 0 t120 0 v40 H0 z" fill="url(#w3)" />

        {/* Fireflies drifting low over the water — the one purely whimsical touch. */}
        <g className="fireflies" fill="#FFE7A8">
          <circle className="firefly" cx="70" cy="168" r="1.8" style={{ animationDelay: '0s' }} />
          <circle className="firefly" cx="150" cy="186" r="1.4" style={{ animationDelay: '1.8s' }} />
          <circle className="firefly" cx="250" cy="174" r="1.6" style={{ animationDelay: '3.2s' }} />
          <circle className="firefly" cx="330" cy="192" r="1.3" style={{ animationDelay: '.9s' }} />
          <circle className="firefly" cx="395" cy="176" r="1.7" style={{ animationDelay: '2.4s' }} />
        </g>
      </svg>

      <div className="hero-text">
        <p className="eyebrow">Thirty days · together</p>
        <h1 className="counter">{title}</h1>
        <p className="sub">{sub}</p>
      </div>
    </div>
  );
}
