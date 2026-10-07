/* Two tabs, words not icons: Today and My city. The weekend isn't a tab;
   it arrives as a card in Today from Thursday. */

import { Pressable, View } from 'react-native';
import { Tabs } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T } from '../../components/ui';
import { useTheme } from '../../lib/theme';
import { V } from '../../lib/voice';

function Bar({ state, navigation }) {
  const c = useTheme();
  const inset = useSafeAreaInsets();
  const labels = { index: V.today.tab, city: V.city.tab };
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 36, paddingTop: 10, paddingBottom: Math.max(inset.bottom, 12), backgroundColor: c.bg }}>
      {state.routes.map((r, i) => {
        const on = state.index === i;
        return (
          <Pressable key={r.key} onPress={() => navigation.navigate(r.name)} hitSlop={12} accessibilityRole="tab" accessibilityState={{ selected: on }}>
            <T weight={on ? 'heavy' : 'bold'} color={on ? c.ink : c.muted}>{labels[r.name]}</T>
            <View style={{ height: 3, borderRadius: 2, marginTop: 4, backgroundColor: on ? c.accent : 'transparent' }} />
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={props => <Bar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="city" />
    </Tabs>
  );
}
