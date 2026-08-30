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
        <p>Fetching the dataset.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="msg">
        <h1>No dataset</h1>
        <p>{error}</p>
        <p>
          The view expects a file at <code>/data/state.json</code>. Build the plan in the setup app,
          convert its backup with <code>npm run import-plan</code>, and commit the result.
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
          <h2 className="h">Your reality</h2>
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
    </div>
  );
}
