import { useState } from 'react';
import { useDataset } from './lib/useDataset.js';
import {
  completionPct,
  currentDay,
  freshness,
  fullDays,
  nameOf,
  TOTAL_DAYS,
  weekOf,
  weekRange,
} from './lib/state.js';
import Sky from './components/Sky.jsx';
import { Suns, WeekMatrix } from './components/Grid.jsx';
import {
  Markers,
  MissAlert,
  Plan,
  Reality,
  ResetLog,
  Rule,
  Targets,
} from './components/Panels.jsx';

export default function App() {
  const { state: s, error, loading, reload } = useDataset();
  const [who, setWho] = useState('a');
  const [week, setWeek] = useState(() => Math.max(1, Math.min(5, weekOf(1))));
  const [weekTouched, setWeekTouched] = useState(false);

  if (loading && !s) {
    return (
      <div className="msg">
        <h1>Loading</h1>
        <p>One second.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="msg">
        <h1>Nothing to show yet</h1>
        <p>{error}</p>
        <p>The plan gets built in the form, imported, and pushed — then this page comes alive.</p>
        <p style={{ fontSize: 12, opacity: 0.7 }}>
          (Technically: this page reads <code>/data/state.json</code>. Run{' '}
          <code>npm run import-plan</code> on a backup from the form, commit, push.)
        </p>
        <p>
          <button
            type="button"
            onClick={reload}
            style={{
              background: 'none',
              border: '1px solid var(--edge)',
              borderRadius: 20,
              color: 'var(--foam)',
              padding: '9px 16px',
              cursor: 'pointer',
              fontFamily: 'var(--body)',
              fontWeight: 700,
            }}
          >
            Try again
          </button>
        </p>
      </div>
    );
  }

  // Default the week selector to whatever week we're actually in, but stop
  // overriding it once someone has clicked around.
  const day = currentDay(s);
  const liveWeek = day >= 1 && day <= TOTAL_DAYS ? weekOf(day) : 1;
  const shownWeek = weekTouched ? week : liveWeek;
  const [from, to] = weekRange(shownWeek);
  const f = freshness(s);

  return (
    <div className="wrap">
      <nav className="topnav" aria-label="Pages">
        <a className="on" href="./" aria-current="page">Tracker</a>
        <a href="form.html">Plan &amp; reset</a>
      </nav>

      <Sky s={s} />

      <div className={`fresh ${f.state}`}>
        <i />
        <span>{f.label}</span>
        <button type="button" onClick={reload}>
          Refresh
        </button>
      </div>

      <div className="tally">
        <div className="t a">
          <span className="t-lab">{nameOf(s, 'a')}</span>
          <span className="t-val">
            {completionPct(s, 'a')}
            <small>%</small>
          </span>
        </div>
        <div className="t b">
          <span className="t-lab">{nameOf(s, 'b')}</span>
          <span className="t-val">
            {completionPct(s, 'b')}
            <small>%</small>
          </span>
        </div>
        <div className="t">
          <span className="t-lab">Full days</span>
          <span className="t-val">
            {fullDays(s)}
            <small>/{TOTAL_DAYS}</small>
          </span>
        </div>
      </div>

      <MissAlert s={s} />
      <Rule s={s} />

      <div className="grid2">
        <div className="block">
          <h2 className="h">Thirty suns</h2>
          <Suns s={s} />
        </div>

        <div className="block">
          <h2 className="h">The week</h2>
          <div className="card">
            <div className="tabs">
              {['a', 'b'].map((w) => (
                <button
                  key={w}
                  type="button"
                  data-w={w}
                  className={who === w ? 'on' : ''}
                  onClick={() => setWho(w)}
                >
                  {nameOf(s, w)}
                </button>
              ))}
            </div>
            <div className="wknav">
              {[1, 2, 3, 4, 5].map((w) => (
                <button
                  key={w}
                  type="button"
                  className={shownWeek === w ? 'on' : ''}
                  title={`Days ${weekRange(w)[0]}–${weekRange(w)[1]}`}
                  onClick={() => {
                    setWeek(w);
                    setWeekTouched(true);
                  }}
                >
                  {w === 5 ? 'LAST' : `WK ${w}`}
                </button>
              ))}
            </div>
            <WeekMatrix s={s} who={who} week={shownWeek} />
          </div>
        </div>

        <div className="block">
          <h2 className="h">The reset</h2>
          <div className="card">
            <p
              style={{
                fontSize: 10,
                letterSpacing: '.14em',
                textTransform: 'uppercase',
                fontWeight: 700,
                color: 'var(--muted)',
                margin: '0 0 4px',
              }}
            >
              {shownWeek === 5 ? 'Final stretch' : `Week ${shownWeek}`} · days {from}–{to}
            </p>
            <ResetLog s={s} week={shownWeek} />
          </div>
        </div>

        <div className="block">
          <h2 className="h">The target</h2>
          <div className="card">
            <Targets s={s} />
          </div>
        </div>

        <div className="block">
          <h2 className="h">The plan</h2>
          <div className="card">
            <Plan s={s} />
          </div>
        </div>

        <div className="block">
          <h2 className="h">Our reality</h2>
          <div className="card">
            <Reality s={s} />
          </div>
        </div>

        <div className="block">
          <h2 className="h">Three markers</h2>
          <div className="card">
            <Markers s={s} />
          </div>
        </div>

      </div>

      <p className="foot">
        <a href="form.html">Run the weekly reset →</a>
      </p>

      {/* Two corner vines that grow with the challenge: the stem follows the
          days, the flowers bloom with full days. Decoration with a pulse. */}
      <div className="vine left" aria-hidden="true">
        <VineSvg stage={vineStage(day)} blooms={vineBlooms(fullDays(s))} />
      </div>
      <div className="vine right" aria-hidden="true">
        <VineSvg stage={vineStage(day)} blooms={vineBlooms(fullDays(s))} />
      </div>
    </div>
  );
}

function vineStage(day) {
  return Math.max(0.14, Math.min(1, day / TOTAL_DAYS));
}
function vineBlooms(full) {
  return Math.min(7, Math.floor(full / 4));
}

const VINE_LEAVES = [
  { t: 0.08, x: 34, y: 300, r: -70 },
  { t: 0.16, x: 40, y: 262, r: 60 },
  { t: 0.24, x: 48, y: 228, r: -58 },
  { t: 0.32, x: 58, y: 196, r: 52 },
  { t: 0.4, x: 70, y: 168, r: -48 },
  { t: 0.48, x: 85, y: 146, r: 44 },
  { t: 0.56, x: 102, y: 128, r: -40 },
  { t: 0.64, x: 122, y: 112, r: 38 },
  { t: 0.72, x: 142, y: 97, r: -32 },
  { t: 0.8, x: 160, y: 84, r: 30 },
  { t: 0.88, x: 175, y: 72, r: -24 },
  { t: 0.95, x: 188, y: 62, r: 20 },
];

const VINE_FLOWERS = [
  { x: 48, y: 222 },
  { x: 70, y: 162 },
  { x: 102, y: 122 },
  { x: 142, y: 91 },
  { x: 175, y: 66 },
  { x: 195, y: 52 },
  { x: 58, y: 190 },
];

function VineSvg({ stage, blooms }) {
  return (
    <svg viewBox="0 0 300 340" xmlns="http://www.w3.org/2000/svg">
      {/* The base bush: always fully grown, so the corner is never empty.
          The vine climbing out of it is the part that tracks the challenge. */}
      <g transform="translate(30,340)">
        <g fill="none" stroke="#1E5B66" strokeWidth="3" strokeLinecap="round">
          <path d="M-14 0 C -18 -22, -26 -38, -38 -52" />
          <path d="M8 0 C 12 -26, 20 -42, 34 -56" />
          <path d="M-4 0 C -5 -30, -3 -48, 0 -62" />
        </g>
        <g fill="#14424F" stroke="rgba(158,214,209,.28)" strokeWidth="1">
          <path transform="rotate(-64) translate(0,-8)" d="M0 0 Q14 -20 0 -46 Q-14 -20 0 0" />
          <path transform="rotate(-36) translate(0,-8)" d="M0 0 Q15 -22 0 -52 Q-15 -22 0 0" />
          <path transform="rotate(-10) translate(0,-8)" d="M0 0 Q16 -24 0 -58 Q-16 -24 0 0" />
          <path transform="rotate(16) translate(0,-8)" d="M0 0 Q15 -22 0 -52 Q-15 -22 0 0" />
          <path transform="rotate(44) translate(0,-8)" d="M0 0 Q14 -20 0 -46 Q-14 -20 0 0" />
        </g>
        <path
          transform="rotate(30) translate(0,-10)"
          d="M0 0 Q12 -17 0 -38 Q-12 -17 0 0"
          fill="rgba(255,192,113,.3)"
        />
        <circle className="gberry" cx="-24" cy="-40" r="2.6" fill="#FFC071" />
        <circle className="gberry" cx="22" cy="-44" r="2.2" fill="#FFC071" />
      </g>

      <path
        d="M30 340 C 40 260, 60 190, 105 140 S 175 80, 195 58"
        fill="none"
        stroke="#1E5B66"
        strokeWidth="4"
        strokeLinecap="round"
        pathLength="1"
        style={{
          strokeDasharray: 1,
          strokeDashoffset: 1 - stage,
          transition: 'stroke-dashoffset 1.2s ease',
        }}
      />
      {VINE_LEAVES.map((l) => (
        <g
          key={l.t}
          transform={`translate(${l.x},${l.y}) rotate(${l.r}) scale(${0.9 + 0.5 * l.t})`}
          style={{ opacity: stage >= l.t ? 1 : 0, transition: 'opacity 0.8s ease' }}
        >
          <path
            d="M0 0 Q11 -16 0 -34 Q-11 -16 0 0"
            fill="#14424F"
            stroke="rgba(158,214,209,.28)"
            strokeWidth="1"
          />
        </g>
      ))}
      {VINE_FLOWERS.slice(0, blooms).map((f) => (
        <g key={`${f.x}-${f.y}`} transform={`translate(${f.x},${f.y})`}>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse
              key={a}
              transform={`rotate(${a})`}
              cx="0"
              cy="-6"
              rx="3.2"
              ry="6"
              fill="#FFC071"
              opacity=".85"
            />
          ))}
          <circle className="gberry" r="3" fill="#FFF1CE" />
        </g>
      ))}
    </svg>
  );
}
