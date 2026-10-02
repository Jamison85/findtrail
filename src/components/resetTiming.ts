export const INHALE_SECONDS = 4
export const HOLD_SECONDS = 2
export const EXHALE_SECONDS = 6
export const CYCLE_SECONDS = INHALE_SECONDS + HOLD_SECONDS + EXHALE_SECONDS
export const RESET_CYCLES = 3
export const TOTAL_SECONDS = CYCLE_SECONDS * RESET_CYCLES

// Contact happens exactly as the exhale countdown ends. The feather and
// impact video share this boundary for all three breaths.
export const CONTACT_SECONDS = CYCLE_SECONDS

