export const BUILTIN_FONTS = [
  { value: 'Be Vietnam Pro', label: 'Be Vietnam Pro', group: 'Hiện đại' },
  { value: 'builtin:montserrat', label: 'Montserrat', group: 'Hiện đại' },
  { value: 'builtin:oswald', label: 'Oswald', group: 'Nổi bật' },
  { value: 'builtin:anton', label: 'Anton', group: 'Nổi bật' },
  { value: 'builtin:bangers', label: 'Bangers', group: 'Nổi bật' },
  { value: 'builtin:pacifico', label: 'Pacifico', group: 'Viết tay' },
  { value: 'builtin:lobster', label: 'Lobster', group: 'Viết tay' },
  { value: 'builtin:dancingscript', label: 'Dancing Script', group: 'Viết tay' },
  { value: 'builtin:playfairdisplay', label: 'Playfair Display', group: 'Cổ điển' },
  { value: 'builtin:lora', label: 'Lora', group: 'Cổ điển' },
  { value: 'builtin:merriweather', label: 'Merriweather', group: 'Cổ điển' },
  { value: 'builtin:patrickhand', label: 'Patrick Hand', group: 'Viết tay' },
  { value: 'builtin:comfortaa', label: 'Comfortaa', group: 'Hiện đại' },
  { value: 'builtin:chakrapetch', label: 'Chakra Petch', group: 'Hiện đại' },
  { value: 'builtin:spacemono', label: 'Space Mono', group: 'Hiện đại' },
];
export function isBuiltinFont(value) { return BUILTIN_FONTS.some(font => font.value === value); }
