/* ---------------------------------------------------------
   The look, in one place. APP.md, "Minimal, on a phone":

   warm paper, ink, the pigeon's feather grey for anything secondary,
   and the beanie's orange as the only accent — on one action per
   screen. One rounded typeface in three sizes and two weights.
   --------------------------------------------------------- */

import { useColorScheme } from 'react-native';

export const PALETTE = {
  light: {
    bg: '#FBF8F3',
    card: '#FFFFFF',
    sunk: '#F2EDE5',
    ink: '#1F1D1A',
    muted: '#8A8580',
    line: '#E8E2D8',
    accent: '#F28C28',
    onAccent: '#FFFFFF',
    scrim: 'rgba(20,18,16,0.55)'
  },
  dark: {
    bg: '#191715',
    card: '#24211E',
    sunk: '#2C2925',
    ink: '#F4EFE8',
    muted: '#A59E95',
    line: '#36322D',
    accent: '#F59A3E',
    onAccent: '#1F1D1A',
    scrim: 'rgba(0,0,0,0.6)'
  }
};

export function useTheme() {
  return useColorScheme() === 'dark' ? PALETTE.dark : PALETTE.light;
}

export const FONT = {
  regular: 'Nunito_400Regular',
  bold: 'Nunito_700Bold',
  heavy: 'Nunito_800ExtraBold'
};

/* Three sizes. Everything else is spacing. */
export const SIZE = { small: 14, body: 17, title: 26 };

export const SPACE = 16;
export const RADIUS = 22;
