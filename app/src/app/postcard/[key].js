/* ---------------------------------------------------------
   The postcard. Strava's growth was the artifact; most people's first
   sight of Allez will be one of these, in a Story or a group chat. So it
   is made to look good small: the photo, the place, the day, their line,
   and a stamp.
   --------------------------------------------------------- */

import { useRef } from 'react';
import { ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

import { useApp, cityStats } from '../../lib/state';
import { useTheme, SPACE } from '../../lib/theme';
import { V } from '../../lib/voice';
import { Pigeon, Primary, Quiet, T } from '../../components/ui';
import { Card } from '../../components/postcard';

export default function Postcard() {
  const { key, fresh } = useLocalSearchParams();
  const app = useApp();
  const c = useTheme();
  const inset = useSafeAreaInsets();
  const ref = useRef(null);
  const o = app.saved && app.saved.outings.find(x => x.key === key);
  if (!o) return <View style={{ flex: 1, backgroundColor: c.bg }} />;

  const n = cityStats(app.saved.outings).counts[o.itemId] || 1;
  const cheer = n >= 3 ? V.pigeon.regular(n) : V.pigeon.celebrate;

  const share = async () => {
    try {
      const uri = await captureRef(ref, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: o.title });
    } catch {}
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: SPACE, paddingTop: inset.top + SPACE, paddingBottom: inset.bottom + SPACE * 2, alignItems: 'center' }}>
      {fresh ? (
        <View style={{ alignItems: 'center', marginBottom: SPACE }}>
          <Pigeon pose="celebrate" size={130} />
          <T size="title" weight="heavy" style={{ textAlign: 'center' }}>{cheer}</T>
        </View>
      ) : null}

      <Card o={o} cardRef={ref} />

      <Primary label={V.city.share} onPress={share} style={{ alignSelf: 'stretch', marginTop: SPACE * 1.5 }} />
      <Quiet label="Done" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={{ alignSelf: 'stretch', marginTop: 10, borderWidth: 0 }} />
    </ScrollView>
  );
}
