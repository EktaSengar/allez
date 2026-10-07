/* ---------------------------------------------------------
   Out — what any card becomes when you tap Go.

   Directions, the good-to-know, when it closes, and one thing within a
   ten-minute walk for afterwards. Arriving shows a quiet "I'm here";
   nothing is tracked in the background. Tapping Go is what starts the
   outing, so "how was it?" can be asked once it's over.
   --------------------------------------------------------- */

import { useMemo, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp } from '../../lib/state';
import { afterThis, directionsUrl, zoneName } from '../../lib/answers';
import { useTheme, SPACE, RADIUS } from '../../lib/theme';
import { V } from '../../lib/voice';
import { facts, Photo, Pigeon, Primary, Quiet, shortDate, T } from '../../components/ui';

export default function Go() {
  const { id } = useLocalSearchParams();
  const app = useApp();
  const c = useTheme();
  const inset = useSafeAreaInsets();
  const w = app.world;
  const item = w && w.byId.get(String(id));
  const [outing, setOuting] = useState(null);
  const after = useMemo(() => (w && item ? afterThis(w, item) : null), [w, item]);

  if (!item) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  const zone = zoneName(w, item);
  const isIOS = Platform.OS === 'ios';

  const start = () => {
    const o = outing || app.go(item, zone);
    setOuting(o);
    return o;
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingBottom: inset.bottom + SPACE * 2 }}>
      <Photo item={item} style={{ height: 300 }}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={12} accessibilityLabel="Close"
          style={{ position: 'absolute', top: inset.top + 8, left: SPACE, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,18,16,0.55)' }}>
          <T weight="heavy" color="#fff">✕</T>
        </Pressable>
      </Photo>
      <View style={{ padding: SPACE * 1.25 }}>
        <T size="title" weight="heavy">{item.title}</T>
        {zone ? <T muted>{zone}</T> : null}
        <T size="small" muted style={{ marginTop: 6 }}>
          {facts(w, item)}{item.lastVerified ? ' · ' + V.card.checked(shortDate(item.lastVerified)) : ''}
        </T>

        {item.why ? (
          <View style={{ marginTop: SPACE * 1.25 }}>
            <T size="small" weight="heavy" color={c.accent} style={{ textTransform: 'uppercase', letterSpacing: 1 }}>{V.go.know}</T>
            <T style={{ marginTop: 4 }}>{item.why}</T>
            {item.hoursNote ? <T muted size="small" style={{ marginTop: 6 }}>{item.hoursNote}</T> : null}
          </View>
        ) : null}

        <Primary label={outing ? V.go.directions : V.card.go} style={{ marginTop: SPACE * 1.5 }}
          onPress={() => { start(); Linking.openURL(directionsUrl(w, item, isIOS)).catch(() => {}); }} />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          {item.booking ? <Quiet label={V.go.book} style={{ flex: 1 }} onPress={() => Linking.openURL(item.booking).catch(() => {})} /> : null}
          {outing && !outing.here
            ? <Quiet label={V.go.here} style={{ flex: 1 }} onPress={() => { app.here(outing.key); setOuting(Object.assign({}, outing, { here: true })); }} />
            : null}
        </View>

        {outing ? (
          <View style={{ alignItems: 'center', marginTop: SPACE * 1.5 }}>
            <Pigeon pose="go" size={120} />
            <T muted style={{ marginTop: 6, textAlign: 'center' }}>{outing.here ? V.go.hereDone : V.pigeon.go}</T>
          </View>
        ) : null}

        <View style={{ marginTop: SPACE * 2, padding: SPACE, borderRadius: RADIUS, backgroundColor: c.sunk }}>
          <T size="small" weight="heavy" color={c.accent} style={{ textTransform: 'uppercase', letterSpacing: 1 }}>{V.go.after}</T>
          {after ? (
            <>
              <T weight="bold" style={{ marginTop: 4 }} onPress={() => router.push(`/go/${encodeURIComponent(after.item.id)}`)}>
                {after.item.emoji ? after.item.emoji + ' ' : ''}{after.item.title}
              </T>
              <T size="small" muted>{facts(w, after.item, { minutes: after.minutes })}</T>
            </>
          ) : <T muted style={{ marginTop: 4 }}>{V.go.afterNone}</T>}
        </View>
      </View>
    </ScrollView>
  );
}
