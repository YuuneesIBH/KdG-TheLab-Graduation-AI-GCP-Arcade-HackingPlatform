const ARCADE_ACTION_KEYS = new Set([
  'enter',
  ' ',
  'spacebar',
  'control',
  'shift',
  'alt',
  'z',
  'x',
  'c',
  'v',
  'b',
  'n',
  'm',
  'a',
  's',
  'd',
  'f',
  'g',
  'h',
  'j',
  'k',
  'l',
  'q',
  'w',
  'e',
  'r',
  't',
  'y',
  '1',
  '2',
  '5',
  '6',
])

const ARCADE_ACTION_CODES = new Set([
  'Enter',
  'NumpadEnter',
  'Space',
  'ControlLeft',
  'ControlRight',
  'ShiftLeft',
  'ShiftRight',
  'AltLeft',
  'AltRight',
  'KeyZ',
  'KeyX',
  'KeyC',
  'KeyV',
  'KeyB',
  'KeyN',
  'KeyM',
  'KeyA',
  'KeyS',
  'KeyD',
  'KeyF',
  'KeyG',
  'KeyH',
  'KeyJ',
  'KeyK',
  'KeyL',
  'KeyQ',
  'KeyW',
  'KeyE',
  'KeyR',
  'KeyT',
  'KeyY',
  'Digit1',
  'Digit2',
  'Digit5',
  'Digit6',
])

const HACKER_ACTION_KEYS = new Set([
  'enter',
  ' ',
  'spacebar',
  'control',
  'shift',
  'alt',
  'z',
  'x',
  'c',
  'v',
  'b',
  'n',
  'm',
])

const HACKER_ACTION_CODES = new Set([
  'Enter',
  'NumpadEnter',
  'Space',
  'ControlLeft',
  'ControlRight',
  'ShiftLeft',
  'ShiftRight',
  'AltLeft',
  'AltRight',
  'KeyZ',
  'KeyX',
  'KeyC',
  'KeyV',
  'KeyB',
  'KeyN',
  'KeyM',
])

const ARCADE_CONFIRM_GAMEPAD_BUTTONS = [0, 1, 2, 3, 8, 9]
const HACKER_ACTION_GAMEPAD_BUTTONS = [0, 2, 3, 9]
const HACKER_BACK_GAMEPAD_BUTTONS = [1, 6, 8]
const HACKER_PREV_VIEW_GAMEPAD_BUTTONS = [4]
const HACKER_NEXT_VIEW_GAMEPAD_BUTTONS = [5]

function normalizeKey(key: string | undefined) {
  return key?.toLowerCase() ?? ''
}

function isAnyGamepadButtonPressed(gamepad: Gamepad | null | undefined, indices: number[]) {
  if (!gamepad) return false
  return indices.some((index) => Boolean(gamepad.buttons[index]?.pressed))
}

export function isArcadeActionInput(event: Pick<KeyboardEvent, 'key' | 'code'>) {
  return ARCADE_ACTION_KEYS.has(normalizeKey(event.key)) || ARCADE_ACTION_CODES.has(event.code)
}

export function isHackerMenuActionInput(event: Pick<KeyboardEvent, 'key' | 'code'>) {
  return HACKER_ACTION_KEYS.has(normalizeKey(event.key)) || HACKER_ACTION_CODES.has(event.code)
}

export function isArcadeConfirmButtonPressed(gamepad: Gamepad | null | undefined) {
  return isAnyGamepadButtonPressed(gamepad, ARCADE_CONFIRM_GAMEPAD_BUTTONS)
}

export function isHackerMenuActionButtonPressed(gamepad: Gamepad | null | undefined) {
  return isAnyGamepadButtonPressed(gamepad, HACKER_ACTION_GAMEPAD_BUTTONS)
}

export function isHackerMenuBackButtonPressed(gamepad: Gamepad | null | undefined) {
  return isAnyGamepadButtonPressed(gamepad, HACKER_BACK_GAMEPAD_BUTTONS)
}

export function isHackerMenuPrevViewButtonPressed(gamepad: Gamepad | null | undefined) {
  return isAnyGamepadButtonPressed(gamepad, HACKER_PREV_VIEW_GAMEPAD_BUTTONS)
}

export function isHackerMenuNextViewButtonPressed(gamepad: Gamepad | null | undefined) {
  return isAnyGamepadButtonPressed(gamepad, HACKER_NEXT_VIEW_GAMEPAD_BUTTONS)
}
