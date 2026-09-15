/* ---------------------------------------------------------
   air.js — what the air is doing, for the cities where that is a fact
   about the day rather than a curiosity.

   Open-Meteo again, keyless, same provider as the forecast. Loaded only
   by the cities whose pack declares `City.air`; Paris does not, and pays
   nothing for this file existing.

   **This does not hide anything, and that is the whole design.**

   The obvious build is a gate: air above some number, drop every outdoor
   suggestion. It is also wrong, and wrong in a way that would only be
   obvious to somebody who lives there. Delhi has six to eight weeks a
   year when the air is bad and it does not stop — people still have
   Sundays, children still have birthdays, and a guide that empties
   itself out is not being careful, it is being useless. Nobody is
   choosing between Lodhi Garden and clean air. They are choosing between
   Lodhi Garden and the sofa.

   So what this does instead:

     says the number      honestly, in the words people use, at the top of
                          the page. A number that is quietly shaping the
                          ranking without being visible is the worst of
                          both.

     tilts the ranking    indoor things rise, outdoor things fall. They
                          fall a long way on a severe day and they never
                          fall off, exactly as `weatherFit` treats rain.

     finds the good hour  the genuinely useful part. Air here is far worse
                          at nine in the evening than at seven in the
                          morning, and a local plans around that. The
                          hourly forecast knows it, so this says it.

   The ranking half lives in the pack, because how hard to push an
   outdoor place down is a judgement about a city and not arithmetic.
   --------------------------------------------------------- */

const Air = (() => {

  let LAT = null, LON = null, TZ = 'UTC';

  const url = () => 'https://air-quality-api.open-meteo.com/v1/air-quality'
    + `?latitude=${LAT}&longitude=${LON}`
    + '&current=pm2_5,pm10,us_aqi'
    + '&hourly=us_aqi'
    + `&timezone=${encodeURIComponent(TZ)}&forecast_days=2`;

  /* US AQI bands, which are the ones the numbers people quote come from.
     The labels are deliberately plain: "very unhealthy" is what the
     scale says, and dressing it up helps nobody. */
  const BANDS = [
    [50,  'clean',    'Good'],
    [100, 'moderate', 'Moderate'],
    [150, 'poor',     'Unhealthy for sensitive groups'],
    [200, 'bad',      'Unhealthy'],
    [300, 'severe',   'Very unhealthy'],
    [Infinity, 'hazardous', 'Hazardous']
  ];

  const band = aqi => BANDS.find(([max]) => aqi <= max) || BANDS[BANDS.length - 1];
  const mode = aqi => band(aqi)[1];
  const label = aqi => band(aqi)[2];

  /* What to say about it. Written for somebody who lives there and has
     already seen the number on their phone — so no lectures, and no
     pretending the day is cancelled. */
  const ADVICE = {
    clean:     'Air is clean today. Rare and worth spending outdoors.',
    moderate:  'Air is middling — fine for most things, and worth not running a marathon in.',
    poor:      'Air is poor. Outdoor plans still work; keep them shorter than you would otherwise.',
    bad:       'Air is bad today. Indoor things are ranked first below, but the outdoor ones are still there — pick the shorter ones.',
    severe:    'Air is very bad. Everything outdoors below is still worth doing on a better day; if today is the day you have, go early and keep it brief.',
    hazardous: 'Air is hazardous. Indoors is genuinely the better call today, though the outdoor list is left standing because sometimes there is no choice.'
  };

  /* ---------- the good hour ----------

     The most useful thing this file does. Air here is not a constant:
     it settles overnight and lifts through the morning, so seven is
     routinely half of ten. Somebody who lives there plans around that
     and a guide that only reports "now" is throwing the plan away. */
  function bestWindow(hourly, from = new Date()) {
    if (!hourly || !hourly.time || !hourly.us_aqi) return null;
    const now = from.getTime();
    const ahead = hourly.time
      .map((t, i) => ({ t, at: new Date(t).getTime(), aqi: hourly.us_aqi[i] }))
      .filter(h => h.at > now && h.at < now + 36 * 3600 * 1000 && h.aqi != null);
    if (!ahead.length) return null;

    const best = ahead.reduce((a, b) => (b.aqi < a.aqi ? b : a));
    const worst = ahead.reduce((a, b) => (b.aqi > a.aqi ? b : a));
    /* Only worth mentioning if the day actually has a shape. A flat
       forecast with a four-point spread is not advice. */
    if (worst.aqi - best.aqi < 25) return null;
    return best;
  }

  const hour = iso => {
    const d = new Date(iso);
    const h = d.getHours();
    const suffix = h >= 12 ? 'pm' : 'am';
    return `${h % 12 === 0 ? 12 : h % 12}${suffix}`;
  };

  async function load() {
    const res = await fetch(url(), { cache: 'no-store' });
    if (!res.ok) throw new Error('air ' + res.status);
    const d = await res.json();

    const aqi = Math.round(d.current?.us_aqi ?? 0);
    const best = bestWindow(d.hourly);

    return {
      aqi,
      pm25: d.current?.pm2_5 ?? null,
      mode: mode(aqi),
      label: label(aqi),
      advice: ADVICE[mode(aqi)],
      best,
      /* One line for the header, assembled rather than invented: every
         part of it is a number this file was handed. */
      line: best && best.aqi < aqi - 25
        ? `Air ${aqi} — ${label(aqi).toLowerCase()}. Better around ${hour(best.t)}, at about ${best.aqi}.`
        : `Air ${aqi} — ${label(aqi).toLowerCase()}.`
    };
  }

  function setHome(lat, lon, tz) {
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      LAT = Math.round(lat * 100) / 100;
      LON = Math.round(lon * 100) / 100;
    }
    if (tz) TZ = tz;
  }

  return { load, setHome, mode, label, ADVICE, bestWindow };
})();
