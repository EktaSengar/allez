/* ---------------------------------------------------------
   The few pieces every screen is made of. Kept small on purpose: a
   screen that needs a new kind of box probably has two jobs.
   --------------------------------------------------------- */

import { useEffect, useState } from 'react';
import { Animated, Image, Pressable, Text, View, StyleSheet, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { FONT, RADIUS, SIZE, SPACE, useTheme } from '../lib/theme';
import { V } from '../lib/voice';
import { imageOf, openTill } from '../lib/answers';

export const POSES = {
  hello: require('../../assets/pigeon/hello.png'),
  go: require('../../assets/pigeon/go.png'),
  walk: require('../../assets/pigeon/walk.png'),
  lost: require('../../assets/pigeon/lost.png'),
  content: require('../../assets/pigeon/content.png'),
  celebrate: require('../../assets/pigeon/celebrate.png'),
  tired: require('../../assets/pigeon/tired.png'),
  plain: require('../../assets/pigeon/plain.png')
};

export function T({ size = 'body', weight = 'regular', muted, color, style, children, ...rest }) {
  const c = useTheme();
  return (
    <Text {...rest} style={[{ fontFamily: FONT[weight], fontSize: SIZE[size] || size, lineHeight: Math.round((SIZE[size] || size) * 1.35), color: color || (muted ? c.muted : c.ink) }, style]}>
      {children}
    </Text>
  );
}

/* Native exports of the existing mark and drawn signature. */
export function Brand() {
  const dark = useColorScheme() === 'dark';
  return (
    <View accessible accessibilityLabel="Allez" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Image source={dark ? require('../../assets/brand-mark-dark.png') : require('../../assets/brand-mark.png')}
        style={{ width: 34, height: 34 }} accessibilityIgnoresInvertColors />
      <Image source={dark ? require('../../assets/wordmark-dark.png') : require('../../assets/wordmark.png')}
        style={{ width: 76, height: 36 }} resizeMode="contain" accessibilityIgnoresInvertColors />
    </View>
  );
}

/* One action gets the slate accent. */
export function Primary({ label, onPress, style, disabled }) {
  const c = useTheme();
  return (
    <Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }}
      onPress={() => { Haptics.selectionAsync().catch(() => {}); onPress && onPress(); }}
      style={({ pressed }) => [s.primary, { backgroundColor: c.accent, opacity: disabled ? 0.4 : pressed ? 0.85 : 1 }, style]}>
      <T weight="bold" color={c.onAccent}>{label}</T>
    </Pressable>
  );
}

export function Quiet({ label, onPress, style, color }) {
  const c = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={8} style={({ pressed }) => [s.quiet, { borderColor: c.edge, opacity: pressed ? 0.6 : 1 }, style]}>
      <T weight="bold" color={color || c.ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{label}</T>
    </Pressable>
  );
}

export function Chip({ label, on, onPress }) {
  const c = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: on }}
      onPress={() => { Haptics.selectionAsync().catch(() => {}); onPress(); }}
      style={[s.chip, { backgroundColor: on ? c.ink : 'transparent', borderColor: on ? c.ink : c.edge }]}>
      <T size="small" weight="bold" color={on ? c.bg : c.ink}>{label}</T>
    </Pressable>
  );
}

export function Pigeon({ pose = 'plain', size = 180, style }) {
  return <Image source={POSES[pose]} style={[{ width: size, height: size, resizeMode: 'contain' }, style]} accessibilityIgnoresInvertColors />;
}

/* A pigeon moment: the pose, its line, and at most one thing to do. */
export function PigeonMoment({ pose, line, sub, action, onAction, size = 200 }) {
  return (
    <View style={s.moment}>
      <Pigeon pose={pose} size={size} />
      <T size="title" weight="heavy" style={{ textAlign: 'center', marginTop: SPACE }}>{line}</T>
      {sub ? <T muted style={{ textAlign: 'center', marginTop: 8 }}>{sub}</T> : null}
      {action ? <Primary label={action} onPress={onAction} style={{ marginTop: SPACE * 1.5 }} /> : null}
    </View>
  );
}

/* Facts in one quiet line: minutes · open till · price · trust. */
export function facts(w, item, { minutes, at } = {}) {
  const m = minutes ?? item.minutesFromHome;
  const till = openTill(w, item, at ? new Date(at) : new Date());
  const tier = w.tierOf(item);
  return [
    m != null ? V.card.min(m) : null,
    till ? V.card.openTill(till) : null,
    item.priceLevel ? '$'.repeat(item.priceLevel) : item.price === 0 || (item.categories || []).includes('free') ? 'free' : null,
    V.tiers[tier] || null
  ].filter(Boolean).join(' · ');
}

export function Photo({ item, style, children }) {
  const c = useTheme();
  const uri = imageOf(item);
  return (
    <View style={[{ backgroundColor: c.sunk, overflow: 'hidden' }, style]}>
      {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} /> : (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontSize: 64 }}>{item.emoji || '📍'}</Text>
        </View>
      )}
      {children}
    </View>
  );
}

/* The text over a photo sits on a soft fall to dark, not a box. Five
   stops rather than three: with three, a phone screen showed the line
   where the dark began. Callers give it a tall top padding so the fall
   starts well above the title. */
export function Fade({ children, style }) {
  return (
    <LinearGradient colors={['rgba(20,18,16,0)', 'rgba(20,18,16,0.18)', 'rgba(20,18,16,0.48)', 'rgba(20,18,16,0.76)', 'rgba(20,18,16,0.9)']}
      locations={[0, 0.2, 0.45, 0.72, 1]} style={style}>
      {children}
    </LinearGradient>
  );
}

/* A way out you can see. Swipe-down and Back work too, but nobody
   should have to know that. `onPhoto` for when it sits over a picture. */
export function Close({ onPhoto, style }) {
  const c = useTheme();
  return (
    <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={12}
      accessibilityRole="button" accessibilityLabel="Close"
      style={[s.close, { backgroundColor: onPhoto ? 'rgba(20,18,16,0.55)' : c.sunk }, style]}>
      <T weight="heavy" color={onPhoto ? '#fff' : c.ink}>✕</T>
    </Pressable>
  );
}

/* A word that something was heard, then gone. Give it a fresh `key` to
   say it again. */
export function Toast({ text, onDone }) {
  const c = useTheme();
  const [a] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const run = Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(1600),
      Animated.timing(a, { toValue: 0, duration: 220, useNativeDriver: true })
    ]);
    run.start(({ finished }) => finished && onDone && onDone());
    return () => run.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- once per key
  const rise = a.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });
  return (
    <Animated.View pointerEvents="none" accessibilityLiveRegion="polite"
      style={[s.toast, { backgroundColor: c.ink, opacity: a, transform: [{ translateY: rise }] }]}>
      <T size="small" weight="bold" color={c.bg}>{text}</T>
    </Animated.View>
  );
}

export const shortDate = iso => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const s = StyleSheet.create({
  primary: { height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  quiet: { height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, borderWidth: 1.5 },
  chip: { height: 38, borderRadius: 19, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, marginRight: 8, marginBottom: 8 },
  moment: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACE * 2 },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  toast: { position: 'absolute', alignSelf: 'center', top: SPACE, height: 40, borderRadius: 20, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' }
});

export const R = RADIUS;
