/* A reply to a deck, arriving as a link: allez://match?id=…&r=…
   Matching happens here, on the phone, then the weekend is planned
   from what you both said yes to. */

import { useEffect } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../lib/state';
import { matches } from '../lib/match';
import { useTheme } from '../lib/theme';
import { V } from '../lib/voice';
import { PigeonMoment } from '../components/ui';

export default function Match() {
  const { id, r } = useLocalSearchParams();
  const app = useApp();
  const c = useTheme();
  const deck = app.saved && id && app.saved.decks[id];

  useEffect(() => {
    if (!deck || !r || !/^[01]+$/.test(r)) return;
    app.saveDeck(deck.id, Object.assign({}, deck, { theirs: r, result: matches(deck, r) }));
    router.replace(`/weekend?match=${deck.id}`);
  }, [deck, r]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center' }}>
      {app.saved && !deck
        ? <PigeonMoment pose="lost" line={V.pigeon.lost} action={V.today.tab} onAction={() => router.replace('/')} />
        : <PigeonMoment pose="walk" line={V.pigeon.looking} />}
    </View>
  );
}
