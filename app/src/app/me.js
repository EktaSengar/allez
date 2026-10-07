/* ---------------------------------------------------------
   What Allez knows about you — the agent, made visible. Every line is
   something they can change, and it's everything: there's nothing kept
   anywhere else. (APP.md, "The agent they define".)
   --------------------------------------------------------- */

import { Alert, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp, todayIso, untilIn } from '../lib/state';
import { useTheme, SPACE } from '../lib/theme';
import { V } from '../lib/voice';
import { Chip, Pigeon, Quiet, T } from '../components/ui';

function Section({ title, children }) {
  return (
    <View style={{ marginTop: SPACE * 1.5 }}>
      <T weight="heavy">{title}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>{children}</View>
    </View>
  );
}

export default function Me() {
  const app = useApp();
  const c = useTheme();
  const inset = useSafeAreaInsets();
  if (!app.saved || !app.world) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  const p = app.saved.profile;
  const E = app.world.E;
  const loved = app.saved.outings.filter(o => o.verdict === "loved").length;
  const wants = E.Store.wants().length;
  const company = (p.company || []).map(k => (V.weekend.company.find(x => x[0] === k) || [k, k])[1].toLowerCase()).join(', ');
  const novelty = p.novelty ?? { live: 1.5, moved: 1, until: 2 }[p.horizon] ?? 1;
  const level = novelty < 1 ? 0 : novelty < 1.75 ? 1 : 2;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: SPACE, paddingTop: inset.top + SPACE, paddingBottom: inset.bottom + SPACE * 2 }}>
      <Pressable onPress={() => router.back()} hitSlop={12}><T muted weight="bold">← {V.city.tab}</T></Pressable>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: SPACE }}>
        <View style={{ flex: 1 }}>
          <T size="title" weight="heavy">{V.me.title}</T>
          <T muted style={{ marginTop: 4 }}>{V.me.sub}</T>
        </View>
        <Pigeon pose="plain" size={84} />
      </View>

      <Section title={p.horizon === 'until' && p.until ? V.me.here.until(new Date(p.until + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })) : p.horizon ? V.me.here[p.horizon] : V.ask.howLong}>
        <Chip label={V.ask.live} on={p.horizon === 'live'} onPress={() => app.setProfile({ horizon: 'live' })} />
        <Chip label={V.ask.moved} on={p.horizon === 'moved'} onPress={() => app.setProfile({ horizon: 'moved' })} />
        {V.ask.untilOpts.map(([label, days]) => (
          <Chip key={label} label={label} on={false} onPress={() => app.setProfile({ horizon: 'until', since: p.since || todayIso(), until: untilIn(days) })} />
        ))}
      </Section>

      <Section title={V.me.hours[p.hours || 'unset']}>
        {V.ask.hoursOpts.map(([k, label]) => <Chip key={k} label={label} on={p.hours === k} onPress={() => app.setProfile({ hours: k })} />)}
      </Section>

      <Section title={V.me.company(company)}>
        {V.weekend.company.map(([k, label]) => (
          <Chip key={k} label={label} on={(p.company || []).includes(k)}
            onPress={() => app.setCompany((p.company || []).includes(k) ? p.company.filter(x => x !== k) : (p.company || []).concat(k))} />
        ))}
      </Section>

      <Section title={V.me.noveltyTitle}>
        {V.me.novelty.map((label, i) => <Chip key={label} label={label} on={level === i} onPress={() => app.setProfile({ novelty: [0.5, 1.25, 2.25][i] })} />)}
      </Section>

      <T muted style={{ marginTop: SPACE * 1.5 }}>{V.me.loved(loved)}{wants ? ` ${wants} saved for later.` : ''}</T>

      <Quiet label={V.me.reset} style={{ marginTop: SPACE * 2 }}
        onPress={() => Alert.alert(V.me.resetConfirm, '', [{ text: 'Cancel', style: 'cancel' }, { text: V.me.reset, style: 'destructive', onPress: () => { app.reset(); router.replace('/'); } }])} />
    </ScrollView>
  );
}
