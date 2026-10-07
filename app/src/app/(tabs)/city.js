/* ---------------------------------------------------------
   My city — the record of a life here. Postcards, the count of
   neighbourhoods, regulars, and for someone here until a date, the
   countdown. Private, and on the phone. (APP.md, "Your city".)
   --------------------------------------------------------- */

import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp, cityStats } from '../../lib/state';
import { useTheme, SPACE, RADIUS } from '../../lib/theme';
import { V } from '../../lib/voice';
import { PigeonMoment, T } from '../../components/ui';
import { Card } from '../../components/postcard';

export default function City() {
  const app = useApp();
  const c = useTheme();
  const inset = useSafeAreaInsets();
  const [now] = useState(() => Date.now());
  if (!app.saved) return <View style={{ flex: 1, backgroundColor: c.bg }} />;

  const p = app.saved.profile;
  const cards = app.saved.outings.filter(o => o.postcard);
  const st = cityStats(app.saved.outings);
  let countdown = null;
  if (p.horizon === 'until' && p.until && p.since) {
    const total = Math.max(1, Math.round((Date.parse(p.until) - Date.parse(p.since)) / 86400000));
    const day = Math.min(total, Math.max(1, Math.round((now - Date.parse(p.since)) / 86400000) + 1));
    countdown = V.city.countdown(day, total);
  }

  const header = (
    <View style={{ paddingHorizontal: SPACE, paddingBottom: SPACE }}>
      <T size="title" weight="heavy">{V.city.title}</T>
      <T muted>{[countdown, V.city.stats(st.outings, st.zones)].filter(Boolean).join(' · ')}</T>

      {st.regulars.length ? (
        <View style={{ marginTop: SPACE, padding: SPACE, borderRadius: RADIUS, backgroundColor: c.sunk }}>
          <T size="small" weight="heavy" color={c.accent} style={{ textTransform: 'uppercase', letterSpacing: 1 }}>{V.city.regulars}</T>
          {st.regulars.map(r => <T key={r.id} weight="bold" style={{ marginTop: 4 }}>{r.title} · {r.n}×</T>)}
        </View>
      ) : null}

      <Pressable onPress={() => router.push('/me')} style={{ marginTop: SPACE }}>
        <T weight="bold" color={c.accent}>{V.city.knows} →</T>
      </Pressable>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: inset.top + 8 }}>
      <FlatList
        data={cards}
        keyExtractor={o => o.key}
        numColumns={2}
        ListHeaderComponent={header}
        columnWrapperStyle={{ paddingHorizontal: SPACE - 6 }}
        ListEmptyComponent={<View style={{ marginTop: SPACE * 2 }}><PigeonMoment pose="walk" size={150} line={V.city.empty} /></View>}
        renderItem={({ item: o }) => (
          <Pressable style={{ width: '50%', padding: 6 }} onPress={() => router.push(`/postcard/${o.key}`)}>
            <Card o={o} small />
            <T size="small" weight="bold" numberOfLines={1} style={{ marginTop: 6 }}>{o.title}</T>
          </Pressable>
        )}
      />
    </View>
  );
}
