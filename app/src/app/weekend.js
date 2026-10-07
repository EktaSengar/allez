/* ---------------------------------------------------------
   The weekend — arrives whole, then edited.

   Plan.weekend() for whoever's coming: stops in order, the journey
   between, open when they get there. Choosing is the work Allez takes
   away, so there's no deck to get through first. A stop can be swapped
   for something else; the deck is kept for agreeing with one other
   person, or for saving things alone. (APP.md, "The weekend".)
   --------------------------------------------------------- */

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp } from '../lib/state';
import { weekendPlan, zoneName } from '../lib/answers';
import { useTheme, SPACE, RADIUS } from '../lib/theme';
import { V } from '../lib/voice';
import { Chip, facts, Photo, Pigeon, PigeonMoment, Primary, Quiet, T } from '../components/ui';

export default function Weekend() {
  const { match } = useLocalSearchParams();
  const app = useApp();
  const c = useTheme();
  const inset = useSafeAreaInsets();
  const [exclude, setExclude] = useState([]);

  const company = (app.saved && app.saved.profile.company) || [];
  const deck = match && app.saved && app.saved.decks[match];
  const agreed = deck && deck.result ? deck.result : null;

  const companyKey = company.join();
  const excludeKey = exclude.join();
  const plan = useMemo(() => {
    if (!app.ready) return null;
    if (agreed) {
      const only = new Set(agreed.both.length ? agreed.both : agreed.either);
      const p = weekendPlan(app.world, { company, exclude, only });
      if (p.days.some(d => d.stops.length)) return p;
    }
    return weekendPlan(app.world, { company, exclude });
  }, [app.ready, app.world, companyKey, excludeKey, agreed]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!plan) return <View style={{ flex: 1, backgroundColor: c.bg }}><PigeonMoment pose="walk" line={V.pigeon.looking} /></View>;

  const toggle = k => {
    const next = company.includes(k) ? company.filter(x => x !== k) : company.concat(k);
    app.setCompany(next);
  };
  const w = app.world;
  const range = [plan.sat, plan.sun].map(d => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })).join(' – ');

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: SPACE, paddingTop: inset.top + SPACE, paddingBottom: inset.bottom + SPACE * 2 }}>
      <Pressable onPress={() => router.back()} hitSlop={12}><T muted weight="bold">← {V.today.tab}</T></Pressable>
      <T size="title" weight="heavy" style={{ marginTop: SPACE }}>{V.weekend.title}</T>
      <T muted>{range}</T>

      {agreed ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: SPACE, padding: 12, borderRadius: RADIUS, backgroundColor: c.sunk }}>
          <Pigeon pose="celebrate" size={64} />
          <T weight="bold" style={{ flex: 1, marginLeft: 8 }}>{agreed.both.length ? V.pigeon.match(agreed.both.length) : V.pigeon.noMatch}</T>
        </View>
      ) : null}

      <T weight="bold" style={{ marginTop: SPACE * 1.5, marginBottom: 8 }}>{V.weekend.who}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {V.weekend.company.map(([k, label]) => <Chip key={k} label={label} on={company.includes(k)} onPress={() => toggle(k)} />)}
      </View>

      {plan.days.map(day => (
        <View key={day.date} style={{ marginTop: SPACE * 1.5 }}>
          <T size="small" weight="heavy" muted style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })}
            {day.weather ? `  ·  ${day.weather.label}, ${day.weather.tmax}°` : ''}
          </T>
          {day.stops.length ? day.stops.map((stop, k) => (
            <Stop key={stop.item.id} stop={stop} first={k === 0} w={w}
              onSwap={() => setExclude(x => x.concat(stop.item.id))} />
          )) : <T muted style={{ marginTop: 8 }}>{V.weekend.empty}</T>}
        </View>
      ))}

      <View style={{ marginTop: SPACE * 2, padding: SPACE, borderRadius: RADIUS, backgroundColor: c.sunk }}>
        <T weight="heavy">{V.weekend.match}</T>
        <T muted style={{ marginTop: 4 }}>{V.weekend.matchSub}</T>
        <Primary label={V.weekend.match} style={{ marginTop: SPACE }} onPress={() => router.push('/deck?mode=two')} />
      </View>
      <Quiet label={V.weekend.more} style={{ marginTop: 10, borderWidth: 0 }} onPress={() => router.push('/deck?mode=solo')} />
    </ScrollView>
  );
}

function Stop({ stop, w, first, onSwap }) {
  const c = useTheme();
  const i = stop.item;
  const leg = !first && stop.travel && stop.travel.minutes != null ? V.weekend.walk(stop.travel.minutes) : null;
  return (
    <View style={{ marginTop: 10 }}>
      {leg ? <T size="small" muted style={{ marginLeft: 4, marginBottom: 6 }}>↓ {leg}</T> : null}
      <Pressable onPress={() => router.push(`/go/${encodeURIComponent(i.id)}`)}
        style={({ pressed }) => [{ flexDirection: 'row', borderRadius: RADIUS, overflow: 'hidden', backgroundColor: c.card, opacity: pressed ? 0.85 : 1 }]}>
        <Photo item={i} style={{ width: 96 }} />
        <View style={{ flex: 1, padding: 12 }}>
          <T size="small" weight="heavy" color={c.accent} style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            {V.weekend.slot[stop.slot]}{stop.arriveBy ? ` · by ${stop.arriveBy}` : ''}
          </T>
          <T weight="bold" numberOfLines={2}>{i.title}</T>
          <T size="small" muted numberOfLines={1}>{[zoneName(w, i), facts(w, i, { minutes: stop.travel && stop.travel.minutes })].filter(Boolean).join(' · ')}</T>
          <Pressable onPress={onSwap} hitSlop={8} style={{ marginTop: 6 }}>
            <T size="small" weight="bold" muted>↻ {V.weekend.swap}</T>
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
}
