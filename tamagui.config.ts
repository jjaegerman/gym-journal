import { defaultConfig } from '@tamagui/config/v4'
import { createTamagui } from 'tamagui'

export const config = createTamagui(
  {
    ...defaultConfig,
    media: {
      ...defaultConfig.media,
      xs: { maxWidth: 660 },
      gtXs: { minWidth: 660 + 1 },
      sm: { maxWidth: 860 },
      gtSm: { minWidth: 860 + 1 },
      md: { maxWidth: 980 },
      gtMd: { minWidth: 980 + 1 },
      lg: { maxWidth: 1120 },
      gtLg: { minWidth: 1120 + 1 },
      short: { maxHeight: 820 },
      tall: { minHeight: 820 },
      hoverNone: { hover: 'none' },
      pointerCoarse: { pointer: 'coarse' },
    },
  }
)

export default config

export type Conf = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}
