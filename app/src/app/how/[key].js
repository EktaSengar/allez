/* ---------------------------------------------------------
   How was it? — one tap, then (if they like) a line and a photo, and
   Allez makes the postcard. "Didn't go" counts as much as the others:
   a tap on directions is not an outing. (APP.md, "After".)
   --------------------------------------------------------- */

import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

import { useApp } from '../../lib/state';
import { useTheme, SPACE, RADIUS, FONT, SIZE } from '../../lib/theme';
import { V } from '../../lib/voice';
import { PigeonMoment, Primary, Quiet, T } from '../../components/ui';

export default function How() {
  const { key, v } = useLocalSearchParams();
  const app = useApp();
  const c = useTheme();
  const inset = useSafeAreaInsets();
  const outing = app.saved && app.saved.outings.find(o => o.key === key);
  const [verdict, setVerdict] = useState(v || null);
  const [anyway, setAnyway] = useState(null);
  const [line, setLine] = useState('');
  const [photo, setPhoto] = useState(null);

  if (!outing) return <View style={{ flex: 1, backgroundColor: c.bg }} />;

  const pick = val => {
    setVerdict(val);
    if (val === 'skipped') { app.verdict(key, 'skipped'); }
  };

  if (verdict === 'skipped') {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center' }}>
        <PigeonMoment pose="content" line={V.how.skippedThanks} action="Back to today" onAction={() => router.back()} />
      </View>
    );
  }

  const addPhoto = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [4, 5] });
    if (!r.canceled && r.assets && r.assets[0]) setPhoto(r.assets[0].uri);
  };

  const make = () => {
    app.verdict(key, verdict, anyway);
    app.postcard(key, { line: line.trim(), photo });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.replace(`/postcard/${key}?fresh=1`);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: SPACE * 1.25, paddingTop: inset.top + SPACE * 2, paddingBottom: inset.bottom + SPACE * 2 }}
        keyboardShouldPersistTaps="handled">
        <T size="title" weight="heavy">{V.how.title(outing.title)}</T>

        <View style={{ marginTop: SPACE * 1.25, gap: 10 }}>
          {[['loved', V.how.loved], ['good', V.how.good], ['meh', V.how.meh], ['skipped', V.how.skipped]].map(([k, label]) => (
            verdict === k
              ? <Primary key={k} label={label} onPress={() => pick(k)} />
              : <Quiet key={k} label={label} onPress={() => pick(k)} />
          ))}
        </View>

        {verdict ? (
          <>
            <T weight="bold" style={{ marginTop: SPACE * 2 }}>{V.how.anyway}</T>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              {[[true, V.how.yes], [false, V.how.no]].map(([k, label]) => (
                <Quiet key={label} label={label} onPress={() => setAnyway(k)} style={{ flex: 1, borderColor: anyway === k ? c.ink : c.line }} />
              ))}
            </View>

            <T weight="bold" style={{ marginTop: SPACE * 2 }}>{V.how.line}</T>
            <TextInput value={line} onChangeText={setLine} placeholder={V.how.linePlaceholder} placeholderTextColor={c.muted}
              maxLength={90} style={{ marginTop: 8, padding: 14, borderRadius: 14, backgroundColor: c.sunk, color: c.ink, fontFamily: FONT.regular, fontSize: SIZE.body }} />

            <Quiet label={photo ? 'Change the photo' : V.how.photo} onPress={addPhoto} style={{ marginTop: SPACE }} />
            {photo ? <Image source={{ uri: photo }} style={{ width: '100%', aspectRatio: 4 / 5, borderRadius: RADIUS, marginTop: 10 }} /> : null}

            <Primary label={V.how.make} onPress={make} style={{ marginTop: SPACE * 1.5 }} />
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
