export const INHALE_SECONDS = 4
export const HOLD_SECONDS = 2
export const EXHALE_SECONDS = 6
export const CYCLE_SECONDS = INHALE_SECONDS + HOLD_SECONDS + EXHALE_SECONDS
export const RESET_CYCLES = 3
export const TOTAL_SECONDS = CYCLE_SECONDS * RESET_CYCLES

// The feather lands once. Breathing continues at a comfortable pace.
export const CONTACT_SECONDS = CYCLE_SECONDS

