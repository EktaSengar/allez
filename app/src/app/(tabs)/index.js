/* ---------------------------------------------------------
   Today — a short stack you finish.

   Five to eight full-screen cards, swiped up. The first answers right
   now (or after work). The questions live in the stack, after that first
   answer. The last card ends it: "That's today." (APP.md, "Today".)
   --------------------------------------------------------- */

import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useApp, todayIso, untilIn } from '../../lib/state';
import { todayStack, zoneName } from '../../lib/answers';
import { useTheme, SPACE, RADIUS } from '../../lib/theme';
import { V } from '../../lib/voice';
import { Chip, Fade, facts, Photo, Pigeon, PigeonMoment, Primary, Quiet, T } from '../../components/ui';

export default function Today() {
  const app = useApp();
  const c = useTheme();
  const inset = useSafeAreaInsets();
  const [h, setH] = useState(0);
  const [now, setNow] = useState(() => new Date());

  useFocusEffect(useCallback(() => { setNow(new Date()); }, []));

  const cards = useMemo(() => {
    if (!app.ready) return null;
    return todayStack(app.world, { profile: app.saved.profile, outings: app.saved.outings, now });
  }, [app.ready, app.world, app.saved, now]);

  if (!cards) {
    return <View style={[st.fill, { backgroundColor: c.bg }]}><PigeonMoment pose="walk" line={V.pigeon.looking} /></View>;
  }

  const wx = app.weather && app.weather.now;
  const head = [now.toLocaleDateString('en-US', { weekday: 'long' }), app.where && app.where.area, wx ? `${wx.temp}° ${wx.label.toLowerCase()}` : null]
    .filter(Boolean).join(' · ');

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: inset.top }}>
      <View style={st.head}>
        <T size="title" weight="heavy">Allez</T>
        <T size="small" muted numberOfLines={1} style={{ flexShrink: 1, marginLeft: 12 }}>{app.offline ? V.pigeon.lost : head}</T>
      </View>
      <View style={{ flex: 1 }} onLayout={e => setH(e.nativeEvent.layout.height)}>
        {h > 0 && (
          <FlatList
            data={cards}
            keyExtractor={x => x.key}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            decelerationRate="fast"
            getItemLayout={(_, i) => ({ length: h, offset: h * i, index: i })}
            renderItem={({ item: card }) => (
              <View style={{ height: h, paddingHorizontal: SPACE, paddingBottom: SPACE }}>
                <Card card={card} app={app} />
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}

function Card({ card, app }) {
  const c = useTheme();
  switch (card.kind) {
    case 'pick': return <PickCard card={card} app={app} />;
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

function PickCard({ card, app }) {
  const c = useTheme();
  const w = app.world;
  const item = card.item;
  const [saved, setSaved] = useState(() => w.E.Store.rating(item.id) === 'want');
  const label = card.label === 'endsSoon' ? V.today.endsSoon(card.days) : V.today[card.label];
  const zone = zoneName(w, item);
  return (
    <Pressable style={{ flex: 1 }} onPress={() => router.push(`/go/${encodeURIComponent(item.id)}`)}
      onLongPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}); app.less(item); }}
      delayLongPress={500}>
      <Photo item={item} style={[st.panel, { justifyContent: 'flex-end' }]}>
        <Fade style={st.scrim}>
          <T size="small" weight="heavy" color={c.accent} style={st.label}>{label}</T>
          <T size="title" weight="heavy" color="#fff">{item.title}</T>
          {zone ? <T size="small" color="rgba(255,255,255,0.8)">{zone}</T> : null}
          {item.why ? <T numberOfLines={3} color="#fff" style={{ marginTop: 8 }}>{item.why}</T> : null}
          <T size="small" color="rgba(255,255,255,0.8)" style={{ marginTop: 8 }}>{facts(w, item, { at: card.at })}</T>
          <View style={st.row}>
            <Primary label={V.card.go} onPress={() => router.push(`/go/${encodeURIComponent(item.id)}`)} style={{ flex: 1 }} />
            <Quiet label={saved ? '♥ ' + V.card.saved : '♡ ' + V.card.save} color="#fff"
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setSaved(app.save(item)); }}
              style={{ marginLeft: 10, borderColor: 'rgba(255,255,255,0.5)' }} />
          </View>
        </Fade>
      </Photo>
    </Pressable>
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
  head: { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: SPACE, paddingTop: 8, paddingBottom: 12 },
  panel: { flex: 1, borderRadius: RADIUS, overflow: 'hidden' },
  scrim: { padding: SPACE * 1.25, paddingTop: SPACE * 5 },
  label: { textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: SPACE }
});
