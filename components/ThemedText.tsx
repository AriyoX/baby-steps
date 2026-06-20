import { Text, type TextProps, StyleSheet } from 'react-native';

import { brandColors, brandFonts } from '@/constants/Brand';
import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color, fontFamily: brandFonts.body },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: brandFonts.semibold,
  },
  title: {
    fontSize: 32,
    fontFamily: brandFonts.heading,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
    fontFamily: brandFonts.heading,
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: brandColors.victoriaBlue,
  },
});
