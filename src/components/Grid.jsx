import {
  currentDay,
  dateOfDay,
  dayComplete,
  isFlexDay,
  isTicked,
  itemsFor,
  missesInWeek,
  nameOf,
  TOTAL_DAYS,
  weekRange,
} from '../lib/state.js';

/** Six-by-five of split discs. A disc only fills fully when both of you did. */
export function Suns({ s }) {
  const today = currentDay(s);
  return (
    <>
      <div className="suns">
        {Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1).map((n) => {
          const a = dayComplete(s, n, 'a');
          const b = dayComplete(s, n, 'b');
          const cls = ['sun'];
          if (a && b) cls.push('both');
          else {
            if (a) cls.push('a');
            if (b) cls.push('b');
          }
          if (n === today) cls.push('today');
          if (n > today) cls.push('future');
          if (isFlexDay(s, n)) cls.push('flex');
          return (
            <div
              key={n}
              className={cls.join(' ')}
              title={`Day ${n} · ${dateOfDay(s, n).toLocaleDateString()}`}
            >
              <span>{n}</span>
              {s.days[n]?.together ? <i /> : null}
            </div>
          );
        })}
      </div>
      <div className="legend">
        <span>
          <i className="sw" style={{ background: 'var(--coral)' }} />
          {nameOf(s, 'a')}
        </span>
        <span>
          <i className="sw" style={{ background: 'var(--glass)' }} />
          {nameOf(s, 'b')}
        </span>
        <span>
          <i
            className="sw"
            style={{ background: 'linear-gradient(130deg,var(--coral),var(--glass))' }}
          />
          Both
        </span>
        <span>
          <i className="sw" style={{ background: 'var(--sun)', width: 5, height: 5 }} />
          Together
        </span>
        <span>
          <i className="sw" style={{ border: '1px dashed var(--muted)' }} />
          Flex
        </span>
      </div>
    </>
  );
}

/**
 * Read-only by design. The ticks come from Todoist via the daily sync, so a
 * checkbox here would be a lie about where the truth lives. The miss count on
 * the right is what you actually read at a reset.
 */
export function WeekMatrix({ s, who, week }) {
  const list = itemsFor(s, who, 'daily');
  const [from, to] = weekRange(week);
  const today = currentDay(s);

  if (!list.length) {
    return <p className="none">Nothing daily for {nameOf(s, who)} yet.</p>;
  }

  const days = [];
  for (let n = from; n <= to; n += 1) days.push(n);

  return (
    <>
      <div className="mx-head">
        <div className="mx-lab">{nameOf(s, who)}</div>
        <div className="mx-cells">
          {days.map((n) => (
            <div className="mx-d" key={n}>
              {dateOfDay(s, n).toLocaleDateString(undefined, { weekday: 'narrow' })}
              <b>{n}</b>
            </div>
          ))}
        </div>
        <div className="misses" title="Missed this week" aria-hidden="true">
          ✕
        </div>
      </div>

      {list.map((it) => {
        const missed = missesInWeek(s, week, it, who);
        return (
          <div className="mx-row" key={it.id}>
            <div className="mx-lab" title={it.text}>
              {it.text}
            </div>
            <div className="mx-cells">
              {days.map((n) => {
                const auto = isFlexDay(s, n) && it.flex !== false;
                const on = isTicked(s, n, it.id, who) || auto;
                const cls = ['mx-c'];
                if (on) cls.push('on');
                if (auto) cls.push('auto');
                if (n > today) cls.push('fut');
                return (
                  <div
                    key={n}
                    className={cls.join(' ')}
                    data-w={who}
                    title={`${it.text} · day ${n}${auto ? ' (flex day)' : ''}`}
                  >
                    ✓
                  </div>
                );
              })}
            </div>
            <div className="misses">{missed > 1 ? missed : ''}</div>
          </div>
        );
      })}

      <p className="mx-hint">
        Ticks come in from Todoist overnight. Dashed rings are the flex day. A number on the right
        means missed more than once — move that one at the reset.
      </p>
    </>
  );
}
