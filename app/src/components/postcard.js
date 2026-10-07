/* The postcard itself, shared by the postcard screen and My city. */

import { Image, StyleSheet, View } from 'react-native';
import { imageOf } from '../lib/answers';
import { PALETTE } from '../lib/theme';
import { T } from './ui';

/* Always on paper, in light colours, whatever the phone's theme: a
   postcard is a thing, and it should look the same wherever it lands. */
export function Card({ o, cardRef, small }) {
  const p = PALETTE.light;
  const src = o.photo || (o.image ? imageOf({ image: o.image }) : null);
  const date = new Date(o.startedAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return (
    <View ref={cardRef} collapsable={false} style={[s.card, { backgroundColor: p.card }, small && { padding: 6 }]}>
      <View style={[s.photo, { backgroundColor: p.sunk }]}>
        {src ? <Image source={{ uri: src }} style={StyleSheet.absoluteFill} /> : <T style={{ fontSize: small ? 32 : 72, lineHeight: small ? 40 : 86 }}>{o.emoji || '📍'}</T>}
        {!small && (
          <View style={[s.stamp, { borderColor: p.accent, backgroundColor: p.card }]}>
            <T size={10} weight="heavy" color={p.accent} style={{ letterSpacing: 1 }}>ALLEZ</T>
            <T size={10} weight="bold" color={p.accent}>BAY AREA</T>
          </View>
        )}
      </View>
      {!small && (
        <View style={{ paddingTop: 12, paddingHorizontal: 4 }}>
          <T size="title" weight="heavy" color={p.ink}>{o.emoji ? o.emoji + ' ' : ''}{o.title}</T>
          <T size="small" color={p.muted}>{[o.zoneName, date, o.weather].filter(Boolean).join(' · ')}</T>
          {o.line ? <T color={p.ink} style={{ marginTop: 8, fontStyle: 'italic' }}>“{o.line}”</T> : null}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: { width: '100%', padding: 12, paddingBottom: 18, borderRadius: 6, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  photo: { width: '100%', aspectRatio: 4 / 5, borderRadius: 3, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  stamp: { position: 'absolute', top: 12, right: 12, borderWidth: 2, borderStyle: 'dashed', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center', transform: [{ rotate: '6deg' }] }
});
