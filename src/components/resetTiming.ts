export const INHALE_SECONDS = 4
export const HOLD_SECONDS = 2
export const EXHALE_SECONDS = 6
export const CYCLE_SECONDS = INHALE_SECONDS + HOLD_SECONDS + EXHALE_SECONDS
export const RESET_CYCLES = 3
export const TOTAL_SECONDS = CYCLE_SECONDS * RESET_CYCLES

// The feather touches the water near the end of the exhale, then softly
// settles for its final 0.8 seconds before the next breath begins.
export const CONTACT_SECONDS = CYCLE_SECONDS - .8
