/* ---------------------------------------------------------
   Today — a short stack you finish.

   A finite set of photo-led ideas on warm paper. Questions still follow
   the first answer; the last card still ends the day.
   --------------------------------------------------------- */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useApp, todayIso, untilIn } from '../../lib/state';
import { todayStack, zoneName } from '../../lib/answers';
import { useTheme, SPACE, RADIUS } from '../../lib/theme';
import { V } from '../../lib/voice';
import { Brand, Chip, facts, Photo, Pigeon, PigeonMoment, Primary, Quiet, T, Toast } from '../../components/ui';

/* Called by the press handler, so a re-render never changes the choice. */
function chooseSurprise(picks, previous) {
  const fresh = picks.filter(card => card.item.id !== previous);
  const choices = fresh.length ? fresh : picks;
  return choices[Math.floor(Math.random() * choices.length)];
}

export default function Today() {
  const app = useApp();
  const c = useTheme();
  const inset = useSafeAreaInsets();
  const [now, setNow] = useState(() => new Date());
  const [note, setNote] = useState(null);
  const lastSurprise = useRef(null);

  useFocusEffect(useCallback(() => { setNow(new Date()); }, []));

  const cards = useMemo(() => {
    if (!app.ready) return null;
    return todayStack(app.world, { profile: app.saved.profile, outings: app.saved.outings, now });
  }, [app.ready, app.world, app.saved, now]);

  /* Reaching the last card is finishing Today (counted once a day). */
  const onSeen = useRef(null);
  useEffect(() => {
    onSeen.current = ({ viewableItems }) => {
      if (cards && viewableItems.some(v => v.index === cards.length - 1)) app.count('stackFinished', { daily: true });
    };
  });
  const [seen] = useState(() => ({
    config: { itemVisiblePercentThreshold: 60 },
    handler: info => onSeen.current && onSeen.current(info)
  }));

  if (!cards) {
    return <View style={[st.fill, { backgroundColor: c.bg }]}><PigeonMoment pose="walk" line={V.pigeon.looking} /></View>;
  }

  const wx = app.weather && app.weather.now;
  const day = now.toLocaleDateString('en-US', { timeZone: app.world.E.City.weather.tz, weekday: 'long' });
  const picks = cards.filter(card => card.kind === 'pick');
  const head = [app.world.E.City.name, app.where && app.where.area, wx ? `${wx.temp}° ${wx.label.toLowerCase()}` : null]
    .filter(Boolean).join(' · ');
  function handleSurprise() {
    const chosen = chooseSurprise(picks, lastSurprise.current);
    if (chosen) {
      lastSurprise.current = chosen.item.id;
      router.push(`/go/${encodeURIComponent(chosen.item.id)}`);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: inset.top }}>
      <View style={[st.head, { borderBottomColor: c.line }]}>
        <Brand />
        <Pressable onPress={() => router.push('/me')} accessibilityRole="button" accessibilityLabel={V.me.title}
          hitSlop={8} style={[st.location, { borderColor: c.line }]}>
          <T size="small" weight="bold" numberOfLines={1}>{V.today.preferences} ↗</T>
        </Pressable>
      </View>
      <View style={{ flex: 1 }}>
          <FlatList
            data={cards}
            keyExtractor={x => x.key}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: SPACE, paddingBottom: SPACE * 2, maxWidth: 620, width: '100%', alignSelf: 'center' }}
            ListHeaderComponent={
              <View style={st.welcome}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.cap }} />
                  <T size="small" muted>{app.offline ? V.pigeon.lost : head}</T>
                </View>
                <T size="headline" weight="heavy" accessibilityRole="header" style={{ marginTop: 12, letterSpacing: -1 }}>{V.today.heading(day)}</T>
                <T muted style={{ marginTop: 5 }}>{picks.length ? V.today.introduction(picks.length) : V.today.noPicks}</T>
                {picks.length ? <Quiet label={V.today.surprise} onPress={handleSurprise} style={{ alignSelf: 'flex-start', marginTop: 16 }} /> : null}
              </View>
            }
            viewabilityConfig={seen.config}
            onViewableItemsChanged={seen.handler}
            renderItem={({ item: card }) => (
              <View style={{ marginBottom: SPACE * 1.5 }}>
                <Card card={card} app={app} onLess={() => setNote({ text: V.today.fewer, n: Date.now() })} />
              </View>
            )}
          />
        {note ? <Toast key={note.n} text={note.text} onDone={() => setNote(null)} /> : null}
      </View>
    </View>
  );
}

function Card({ card, app, onLess }) {
  const c = useTheme();
  switch (card.kind) {
    case 'pick': return <PickCard card={card} app={app} onLess={onLess} />;
    case 'how': return <HowCard outing={card.outing} />;
    case 'askHorizon': return <AskHorizon app={app} />;
    case 'askHours': return <AskHours app={app} />;
    case 'weekend':
      return (
        <View style={[st.panel, { backgroundColor: c.sunk }]}>
          <PigeonMoment pose="walk" line={V.today.weekendReady} sub={V.today.weekendSub}
            action={V.today.weekendGo} onAction={() => router.push('/weekend')} />
        </View>
      );
    case 'pigeon':
      return <View style={[st.panel, { backgroundColor: c.sunk }]}><PigeonMoment pose={card.pose} line={V.pigeon[card.line]} /></View>;
    case 'end':
      return (
        <View style={[st.panel, { backgroundColor: c.sunk }]}>
          <PigeonMoment pose="content" line={V.pigeon.end} sub={card.tomorrow ? V.today.tomorrow(card.tomorrow.title) : null} />
        </View>
      );
    default: return null;
  }
}

function PickCard({ card, app, onLess }) {
  const c = useTheme();
  const w = app.world;
  const item = card.item;
  const saved = w.E.Store.rating(item.id) === 'want';
  const [expanded, setExpanded] = useState(false);
  const label = card.label === 'endsSoon' ? V.today.endsSoon(card.days) : V.today[card.label];
  const zone = zoneName(w, item);
  return (
    <View style={[st.pick, { backgroundColor: c.card, borderColor: c.line }]}>
      <Pressable onPress={() => router.push(`/go/${encodeURIComponent(item.id)}`)} accessibilityRole="button" accessibilityLabel={item.title}>
        <Photo item={item} style={{ height: 220 }}>
          {item.imageKind === 'context' ? <View style={{ position: 'absolute', bottom: 12, left: 12, backgroundColor: c.bg, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5 }}>
            <T size="caption" weight="bold">{V.today.contextPhoto}</T>
          </View> : null}
        </Photo>
      </Pressable>
      <View style={{ padding: SPACE * 1.25 }}>
        <T size="small" weight="bold" color={c.accent} style={st.label}>{label}</T>
        <T size="title" weight="heavy" accessibilityRole="header">{item.title}</T>
        {zone ? <T size="small" muted style={{ marginTop: 3 }}>{zone}</T> : null}
        {item.why ? <T numberOfLines={expanded ? undefined : 3} style={{ marginTop: 10 }}>{item.why}</T> : null}
        {item.why ? <Pressable onPress={() => setExpanded(!expanded)} accessibilityRole="button" accessibilityState={{ expanded }} hitSlop={8} style={{ alignSelf: 'flex-start', marginTop: 8 }}>
          <T size="small" weight="bold" color={c.accent}>{expanded ? V.today.collapse : V.today.more}</T>
        </Pressable> : null}
        <T size="small" muted style={{ marginTop: 12 }}>{facts(w, item, { at: card.at })}</T>
        <View style={[st.row, { gap: 10, flexWrap: 'wrap' }]}>
          <Primary label={V.card.go} onPress={() => router.push(`/go/${encodeURIComponent(item.id)}`)} style={{ flexGrow: 1 }} />
          <Quiet label={saved ? '♥ ' + V.card.saved : '♡ ' + V.card.save}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); app.save(item); }} />
        </View>
        <View style={[st.row, { justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }]}>
          {item.imageCredit ? <T size="caption" muted style={{ flexShrink: 1 }}>{V.today.credit}{item.imageCredit}</T> : null}
          <Pressable onPress={() => { app.less(item); onLess(); }} accessibilityRole="button" hitSlop={8}>
            <T size="small" muted>{V.today.less}</T>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function HowCard({ outing }) {
  const c = useTheme();
  return (
    <View style={[st.panel, { backgroundColor: c.sunk, justifyContent: 'center', padding: SPACE * 1.5 }]}>
      <T size="title" weight="heavy">{V.how.title(outing.title)}</T>
      <T muted style={{ marginTop: 6 }}>{V.notify.howBody}</T>
      <View style={{ marginTop: SPACE * 1.5 }}>
        <Primary label={V.how.loved} onPress={() => router.push(`/how/${outing.key}?v=loved`)} />
        <View style={[st.row, { gap: 10 }]}>
          <Quiet label={V.how.good} onPress={() => router.push(`/how/${outing.key}?v=good`)} style={{ flex: 1 }} />
          <Quiet label={V.how.meh} onPress={() => router.push(`/how/${outing.key}?v=meh`)} style={{ flex: 1 }} />
        </View>
        <Quiet label={V.how.skipped} onPress={() => router.push(`/how/${outing.key}?v=skipped`)} style={{ marginTop: 10, borderWidth: 0 }} />
      </View>
    </View>
  );
}

function AskHorizon({ app }) {
  const c = useTheme();
  const [until, setUntil] = useState(false);
  const done = (horizon, days) => {
    const patch = { horizon, since: todayIso() };
    if (days) patch.until = untilIn(days);
    app.setProfile(patch);
  };
  return (
    <View style={[st.panel, { backgroundColor: c.sunk, alignItems: 'center', justifyContent: 'center', padding: SPACE * 1.5 }]}>
      <Pigeon pose="hello" size={150} />
      <T size="small" muted style={{ marginTop: 8, textAlign: 'center' }}>{V.pigeon.hello}</T>
      <T size="title" weight="heavy" style={{ marginTop: SPACE, textAlign: 'center' }}>{until ? V.ask.untilHow : V.ask.howLong}</T>
      <T muted style={{ textAlign: 'center', marginTop: 4 }}>{V.ask.howLongSub}</T>
      <View style={{ alignSelf: 'stretch', marginTop: SPACE * 1.5, gap: 10 }}>
        {until
          ? V.ask.untilOpts.map(([label, days]) => <Quiet key={label} label={label} onPress={() => done('until', days)} />)
          : <>
              <Quiet label={V.ask.live} onPress={() => done('live')} />
              <Quiet label={V.ask.moved} onPress={() => done('moved')} />
              <Quiet label={V.ask.until} onPress={() => setUntil(true)} />
            </>}
      </View>
    </View>
  );
}

function AskHours({ app }) {
  const c = useTheme();
  return (
    <View style={[st.panel, { backgroundColor: c.sunk, alignItems: 'center', justifyContent: 'center', padding: SPACE * 1.5 }]}>
      <T size="title" weight="heavy" style={{ textAlign: 'center' }}>{V.ask.hours}</T>
      <T muted style={{ textAlign: 'center', marginTop: 4 }}>{V.ask.hoursSub}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: SPACE * 1.5 }}>
        {V.ask.hoursOpts.map(([k, label]) => <Chip key={k} label={label} on={false} onPress={() => app.setProfile({ hours: k })} />)}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingHorizontal: SPACE, paddingVertical: 12, borderBottomWidth: 1 },
  location: { borderWidth: 1, borderRadius: 24, paddingHorizontal: 12, paddingVertical: 8, flexShrink: 1 },
  welcome: { paddingTop: 24, paddingBottom: 24 },
  panel: { minHeight: 360, borderRadius: RADIUS, overflow: 'hidden', paddingVertical: 24 },
  pick: { borderRadius: RADIUS, overflow: 'hidden', borderWidth: 1 },
  label: { textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: SPACE }
});
