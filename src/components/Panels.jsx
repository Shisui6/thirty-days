import {
  AREAS,
  CADENCES,
  DAILY_CEILING,
  currentDay,
  itemsFor,
  missedTwice,
  nameOf,
  weekRange,
} from '../lib/state.js';

function has(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

/** The one non-negotiable, in front of you every time the page opens. */
export function Rule({ s }) {
  if (!has(s.pact.rule)) return null;
  return (
    <div className="rule">
      <span>The one rule</span>
      <p>{s.pact.rule}</p>
    </div>
  );
}

/**
 * The never-miss-twice rule, surfaced while it's still actionable. This is the
 * thing a weekly grid structurally cannot do.
 */
export function MissAlert({ s }) {
  const day = currentDay(s);
  if (day < 3 || day > 30) return null;
  const a = missedTwice(s, 'a');
  const b = missedTwice(s, 'b');
  if (!a.length && !b.length) return null;
  const parts = [];
  if (a.length) parts.push(`${nameOf(s, 'a')}: ${a.map((i) => i.text).join(', ')}`);
  if (b.length) parts.push(`${nameOf(s, 'b')}: ${b.map((i) => i.text).join(', ')}`);
  return (
    <div className="alert">
      <span>Missed twice running</span>
      <p>
        {parts.join(' · ')}. Today it happens, or it comes off the daily list at the reset — those
        are the only two honest options.
      </p>
    </div>
  );
}

export function Targets({ s }) {
  const blocks = ['a', 'b'].filter((w) => Object.values(s.goals[w] || {}).some(has));
  if (!blocks.length) {
    return (
      <p className="none">No targets yet. They come from the form.</p>
    );
  }
  return blocks.map((w) => {
    const g = s.goals[w];
    const rows = [
      ['The target', g.one],
      ['Done looks like', g.done],
      ['Watch out for', [g.derail, g.counter].filter(has).join(' → ')],
      ['Personal prize', g.reward],
    ].filter(([, v]) => has(v));
    return (
      <div className={`sec ${w}`} key={w}>
        <h4>{nameOf(s, w)}</h4>
        <dl>
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  });
}

export function Plan({ s }) {
  if (!s.items.length) {
    return <p className="none">No plan yet. It gets built in the form.</p>;
  }
  const da = itemsFor(s, 'a', 'daily').length;
  const db = itemsFor(s, 'b', 'daily').length;
  const live = s.items.filter((i) => i.cadence !== 'later').length;

  return (
    <>
      <div className={`load${da > DAILY_CEILING || db > DAILY_CEILING ? ' over' : ''}`}>
        <div>
          <b>{da}</b>
          <span>{nameOf(s, 'a')} daily</span>
        </div>
        <div>
          <b>{db}</b>
          <span>{nameOf(s, 'b')} daily</span>
        </div>
        <div>
          <b>{live}</b>
          <span>items live</span>
        </div>
      </div>

      {(da > DAILY_CEILING || db > DAILY_CEILING) && (
        <p className="none" style={{ color: 'var(--coral)', fontStyle: 'normal' }}>
          Over the ceiling of {DAILY_CEILING}. Above that you negotiate with yourself every evening,
          and the negotiation is what kills it.
        </p>
      )}

      {CADENCES.map(([key, label]) => {
        const ls = s.items.filter((i) => i.cadence === key);
        if (!ls.length) return null;
        return (
          <div className="sec" key={key}>
            <h4>{label}</h4>
            {ls.map((it) => (
              <div className="row" key={it.id}>
                <b>{it.owner === 'both' ? 'shared' : nameOf(s, it.owner)}</b>
                <div>
                  {it.text}
                  <em>
                    {[
                      AREAS[it.area],
                      it.time || null,
                      it.cadence === 'daily' && it.flex === false ? 'never skips' : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </em>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}

export function Reality({ s }) {
  const R = (k) => s.reality[k] || {};
  const blocks = [
    {
      cls: 'a',
      title: `${nameOf(s, 'a')}’s week`,
      rows: [
        ['Shape', R('a').shape],
        ['Energy dies', R('a').dip],
        ['Immovable', R('a2').fixed],
        ['Best hour', R('a2').best],
        ['Changing soon', R('a2').change],
      ],
    },
    {
      cls: 'b',
      title: `${nameOf(s, 'b')}’s week`,
      rows: [
        ['Shape', R('b').shape],
        ['Energy dies', R('b').dip],
        ['Immovable', R('b2').fixed],
        ['Best hour', R('b2').best],
        ['Changing soon', R('b2').change],
      ],
    },
    {
      cls: 'u',
      title: 'Together',
      rows: [
        ['Usually together on', R('us').pattern],
        ['Door to door', R('us').travel],
        ['Day 30 reward', R('us2').reward],
        ['Booked by', R('us2').rewardWhen],
      ],
    },
  ];
  const any = blocks.some((b) => b.rows.some(([, v]) => has(v)));
  if (!any) return <p className="none">Not filled in yet.</p>;

  return blocks.map((b) => {
    const rows = b.rows.filter(([, v]) => has(v));
    if (!rows.length) return null;
    return (
      <div className={`sec ${b.cls}`} key={b.title}>
        <h4>{b.title}</h4>
        <dl>
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  });
}

const RESET_LABELS = [
  ['missed', 'What we kept missing'],
  ['moved', 'What actually got done'],
  ['together', 'Seeing each other'],
  ['asks', 'What we each asked for'],
];

export function ResetLog({ s, week }) {
  const r = s.resets[week] || {};
  const rows = RESET_LABELS.filter(([k]) => has(r[k]));
  const [from, to] = weekRange(week);
  if (!rows.length) {
    return (
      <p className="none">
        No reset logged for days {from}–{to} yet. That happens in the form, at the weekly sit-down.
      </p>
    );
  }
  return (
    <dl style={{ margin: 0 }}>
      {rows.map(([k, label]) => (
        <div key={k}>
          <dt
            style={{
              fontSize: 9.5,
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              fontWeight: 700,
              color: 'var(--dim)',
              marginTop: 9,
            }}
          >
            {label}
          </dt>
          <dd style={{ margin: '1px 0 0', fontSize: 13.5 }}>{r[k]}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Markers({ s }) {
  const day = currentDay(s);
  const rw = s.reality.us2 || {};
  const stones = [
    [10, 'A small celebration', 'Days four to nine is where these die. Getting past it is the milestone.'],
    [20, 'Something neither of you has done', 'Not a favourite. Something you have to look up first.'],
    [
      30,
      'The reward',
      has(rw.reward)
        ? `${rw.reward}${has(rw.rewardWhen) ? ` — booked by ${rw.rewardWhen}` : ''}`
        : 'Not named yet.',
    ],
  ];
  return stones.map(([d, t, sub]) => (
    <div className="row" key={d}>
      <b style={{ color: day >= d ? 'var(--sun)' : undefined }}>Day {d}</b>
      <div>
        {t}
        <em>{sub}</em>
      </div>
    </div>
  ));
}
