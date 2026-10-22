/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    textMuted: '#666666',

    background: '#FDFFFD',
    backgroundTop: '#d1e0e2',
    backgroundBottom: '#cadfe9',
    surface: '#F0F0F3',
    surfaceSelected: '#36342D',

    textPrimary: '#1A1A1A',
    textSecondary: '#60646C',

    surfacePrimary: '#F7F3F3',
    surfaceSecondary: '#F0F3F5',
    surfaceTertiary: '#dbe5e6',

    border: '#dadada',

    error: '#EC0808',
    success: '#53C03D',
    warning: '#D3D00F',

    card: '#dde9e9de',
    buttonPrimary: '#5940CA',
  },

  dark: {
    text: '#FFFFFF',
    textMuted: '#9C9696',

    background: '#1D1C1C',
    backgroundTop: '#1D1C1C',
    backgroundBottom: '#292c2e',
    surface: '#2A2A2A',
    surfaceSelected: '#3A3A3A',

    textPrimary: '#FFFFFF',
    textSecondary: '#B0B4BA',

    surfacePrimary: '#2E3034',
    surfaceSecondary: '#31312F',
    surfaceTertiary: '#2c2a2a',

    border: '#3A3A3A',

    error: '#FF4D4D',
    success: '#4ADE80',
    warning: '#FACC15',

    card: '#2A2A2A',
    buttonPrimary: '#7C63E8',
  },
} as const;



export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const fontFamily = {
  sans: 'poppins'
}

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
