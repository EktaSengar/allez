/* ---------------------------------------------------------
   The look, in one place. APP.md, "Minimal, on a phone":

   warm paper, ink, the pigeon's feather grey for anything secondary,
   slate (the logo's blue, a step darker so text on it reads) as the
   only accent, on one action per screen. The beanie orange (`cap`) is
   for the logo and small moments of the pigeon, never a button.
   Nunito and the same product palette as the website.

   `line` divides; `edge` outlines something you can press, and is
   darker, because a quiet button nobody can find is not quiet but gone.
   --------------------------------------------------------- */

import { useColorScheme } from 'react-native';

export const PALETTE = {
  "light": {
    "bg": "#FDFAF5",
    "card": "#FFFDFA",
    "sunk": "#F7F1E8",
    "ink": "#2C3E50",
    "muted": "#6B5C53",
    "line": "#ECE2D5",
    "edge": "#D3C9BA",
    "accent": "#4E6A8E",
    "cap": "#E67E22",
    "onAccent": "#FFFFFF",
    "scrim": "rgba(20,18,16,0.55)"
  },
  "dark": {
    "bg": "#17120F",
    "card": "#201A15",
    "sunk": "#1D1713",
    "ink": "#F4ECE1",
    "muted": "#B3A596",
    "line": "#322820",
    "edge": "#625A50",
    "accent": "#9FB2CC",
    "cap": "#E67E22",
    "onAccent": "#17120F",
    "scrim": "rgba(0,0,0,0.6)"
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

/* Functional type, plus a welcome headline and quiet photo credits. */
export const SIZE = { caption: 11, small: 14, body: 17, title: 26, headline: 32 };

export const SPACE = 16;
export const RADIUS = 22;
