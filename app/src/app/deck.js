/* ---------------------------------------------------------
   The deck — the one place a swipe earns its keep, because here it
   decides something.

   mode=two   agreeing with one other person. Swipe, send the deck by
              link, and when their reply comes back the weekend is
              planned from what you both said yes to.
   mode=solo  saving for yourself: right keeps it for some weekend.
   --------------------------------------------------------- */

import { useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, PanResponder, Share, TextInput, View, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useApp } from '../lib/state';
import { deckFor, weekendPlan, zoneName } from '../lib/answers';
import { deckLink, matches, newDeckId, parseReply } from '../lib/match';
import { useTheme, SPACE, RADIUS, FONT, SIZE } from '../lib/theme';
import { V } from '../lib/voice';
import { Fade, facts, Photo, PigeonMoment, Primary, Quiet, T } from '../components/ui';

const W = Dimensions.get('window').width;

export default function Deck() {
  const { mode = 'two' } = useLocalSearchParams();
  const app = useApp();
  const c = useTheme();
  const inset = useSafeAreaInsets();
  const w = app.world;

  const items = useMemo(() => {
    if (!w) return [];
    return deckFor(w, weekendPlan(w, { company: app.saved.profile.company }));
  }, [w]); // eslint-disable-line react-hooks/exhaustive-deps -- the deck is fixed once dealt
  const [k, setK] = useState(0);
  const bits = useRef([]);
  const [sent, setSent] = useState(null);
  const [reply, setReply] = useState('');

  if (!w) return <View style={{ flex: 1, backgroundColor: c.bg }} />;

  const decide = yes => {
    const item = items[k];
    bits.current[k] = yes ? '1' : '0';
    if (mode === 'solo' && yes) app.save(item);
    Haptics.selectionAsync().catch(() => {});
    setK(k + 1);
  };

  const send = async () => {
    const id = sent ? sent.id : newDeckId();
    const deck = { id, ids: items.map(i => i.id), mine: bits.current.join(''), at: Date.now() };
    app.saveDeck(id, deck);
    setSent(deck);
    try { await Share.share({ message: V.deck.sendText(deckLink(id, items)) }); } catch {}
  };

  const check = () => {
    const r = parseReply(reply);
    const deck = r && app.saved.decks[r.id];
    if (!deck) return;
    const result = matches(deck, r.r);
    app.saveDeck(deck.id, Object.assign({}, deck, { theirs: r.r, result }));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.replace(`/weekend?match=${deck.id}`);
  };

  const done = k >= items.length;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: inset.top + SPACE, paddingBottom: inset.bottom + SPACE }}>
      <View style={{ paddingHorizontal: SPACE }}>
        <T size="title" weight="heavy">{V.deck.title}</T>
        <T muted>{done ? '' : `${V.deck.sub}  ${k + 1}/${items.length}`}</T>
      </View>

      {!done ? (
        <>
          <View style={{ flex: 1, padding: SPACE }}>
            {items[k + 1] ? <SwipeCard key={items[k + 1].id} item={items[k + 1]} w={w} behind /> : null}
            <SwipeCard key={items[k].id} item={items[k]} w={w} onDecide={decide} />
          </View>
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: SPACE }}>
            <Quiet label={'✕  ' + V.deck.no} onPress={() => decide(false)} style={{ flex: 1 }} />
            <Primary label={'♥  ' + V.deck.yes} onPress={() => decide(true)} style={{ flex: 1 }} />
          </View>
        </>
      ) : mode === 'solo' ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <PigeonMoment pose="content" line={V.deck.saveAlone} action="Back to the weekend" onAction={() => router.back()} />
        </View>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', padding: SPACE }}>
          <PigeonMoment pose="hello" size={150} line={sent ? V.deck.waiting : V.deck.yourHalf} />
          <Primary label={V.deck.send} onPress={send} style={{ marginTop: SPACE * 1.5 }} />
          {sent ? (
            <>
              <TextInput value={reply} onChangeText={setReply} placeholder={V.deck.pasteHint} placeholderTextColor={c.muted}
                autoCapitalize="none" autoCorrect={false}
                style={{ marginTop: SPACE * 1.5, padding: 14, borderRadius: 14, backgroundColor: c.sunk, color: c.ink, fontFamily: FONT.regular, fontSize: SIZE.small }} />
              <Quiet label={V.deck.check} onPress={check} style={{ marginTop: 10 }} />
            </>
          ) : null}
        </View>
      )}
    </View>
  );
}

function SwipeCard({ item, w, onDecide, behind }) {
  const c = useTheme();
  const [pos] = useState(() => new Animated.ValueXY());
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => !behind && Math.abs(g.dx) > 8,
    onPanResponderMove: Animated.event([null, { dx: pos.x, dy: pos.y }], { useNativeDriver: false }),
    onPanResponderRelease: (_, g) => {
      if (Math.abs(g.dx) > W * 0.28) {
        const yes = g.dx > 0;
        Animated.timing(pos, { toValue: { x: (yes ? 1 : -1) * W * 1.4, y: g.dy }, duration: 180, useNativeDriver: false })
          .start(() => onDecide(yes));
      } else {
        Animated.spring(pos, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 6 }).start();
      }
    }
  }), [behind, onDecide, pos]);
  const rotate = pos.x.interpolate({ inputRange: [-W, 0, W], outputRange: ['-10deg', '0deg', '10deg'] });
  const yesO = pos.x.interpolate({ inputRange: [0, W * 0.25], outputRange: [0, 1], extrapolate: 'clamp' });
  const noO = pos.x.interpolate({ inputRange: [-W * 0.25, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <Animated.View {...(behind ? {} : pan.panHandlers)}
      style={[StyleSheet.absoluteFill, { margin: SPACE }, behind ? { transform: [{ scale: 0.96 }], opacity: 0.6 } : { transform: [{ translateX: pos.x }, { translateY: pos.y }, { rotate }] }]}>
      <Photo item={item} style={{ flex: 1, borderRadius: RADIUS, justifyContent: 'flex-end' }}>
        <Fade style={{ padding: SPACE * 1.25, paddingTop: SPACE * 5 }}>
          <T size="title" weight="heavy" color="#fff">{item.title}</T>
          <T size="small" color="rgba(255,255,255,0.85)">{[zoneName(w, item), facts(w, item)].filter(Boolean).join(' · ')}</T>
          {item.why ? <T numberOfLines={3} color="#fff" style={{ marginTop: 8 }}>{item.why}</T> : null}
        </Fade>
        {!behind && (
          <>
            <Animated.View style={[st.badge, { left: 20, borderColor: c.accent, opacity: yesO }]}><T weight="heavy" color={c.accent}>{V.deck.yes}</T></Animated.View>
            <Animated.View style={[st.badge, { right: 20, borderColor: '#fff', opacity: noO }]}><T weight="heavy" color="#fff">{V.deck.no}</T></Animated.View>
          </>
        )}
      </Photo>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  badge: { position: 'absolute', top: 24, borderWidth: 3, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: 'rgba(0,0,0,0.25)' }
});
