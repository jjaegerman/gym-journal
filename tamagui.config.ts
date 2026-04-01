import { defaultConfig } from '@tamagui/config/v4'
import { createTamagui } from 'tamagui'
import { themes } from './themes'

export const config = createTamagui(
  {
    ...defaultConfig,
    themes,
    media: {
      xs: { maxWidth: 639 },
      sm: { minWidth: 640 },
      md: { minWidth: 768 },
      lg: { minWidth: 1024 },
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
