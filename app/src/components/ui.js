/* ---------------------------------------------------------
   The few pieces every screen is made of. Kept small on purpose: a
   screen that needs a new kind of box probably has two jobs.
   --------------------------------------------------------- */

import { Image, Pressable, Text, View, StyleSheet } from 'react-native';
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

/* The one orange thing on a screen. */
export function Primary({ label, onPress, style, disabled }) {
  const c = useTheme();
  return (
    <Pressable disabled={disabled} onPress={() => { Haptics.selectionAsync().catch(() => {}); onPress && onPress(); }}
      style={({ pressed }) => [s.primary, { backgroundColor: c.accent, opacity: disabled ? 0.4 : pressed ? 0.85 : 1 }, style]}>
      <T weight="bold" color={c.onAccent}>{label}</T>
    </Pressable>
  );
}

export function Quiet({ label, onPress, style, color }) {
  const c = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => [s.quiet, { borderColor: c.line, opacity: pressed ? 0.6 : 1 }, style]}>
      <T weight="bold" color={color || c.ink}>{label}</T>
    </Pressable>
  );
}

export function Chip({ label, on, onPress }) {
  const c = useTheme();
  return (
    <Pressable onPress={() => { Haptics.selectionAsync().catch(() => {}); onPress(); }}
      style={[s.chip, { backgroundColor: on ? c.ink : 'transparent', borderColor: on ? c.ink : c.line }]}>
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

/* The text over a photo sits on a soft fall to dark, not a box. */
export function Fade({ children, style }) {
  return (
    <LinearGradient colors={['rgba(20,18,16,0)', 'rgba(20,18,16,0.55)', 'rgba(20,18,16,0.88)']} locations={[0, 0.3, 1]} style={style}>
      {children}
    </LinearGradient>
  );
}

export const shortDate = iso => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const s = StyleSheet.create({
  primary: { height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  quiet: { height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, borderWidth: 1.5 },
  chip: { height: 38, borderRadius: 19, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, marginRight: 8, marginBottom: 8 },
  moment: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACE * 2 }
});

export const R = RADIUS;
