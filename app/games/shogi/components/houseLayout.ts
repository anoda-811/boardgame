/** Room sized to the seated figure: 1 unit is about 8cm. Six tatami, garden to the north. */
export const MAT_W = 10.8;
export const MAT_D = 21.6;
export const ROOM_HALF_W = (MAT_W * 3) / 2;
export const ROOM_BACK_Z = -16;
export const ROOM_FRONT_Z = ROOM_BACK_Z + MAT_D * 2;
export const WALL_T = 1.08;
export const POST = 1.32;
export const JAMB_X = 8.55;
export const ENGAWA_DEPTH = 7.4;
export const GARDEN_DROP = 1.4;

export const tatamiX = [-MAT_W, 0, MAT_W];
export const tatamiZ = [ROOM_BACK_Z + MAT_D / 2, ROOM_BACK_Z + MAT_D * 1.5];

/** Outer edge of the veranda, where the step meets the garden. */
export const ENGAWA_OUTER_Z = ROOM_BACK_Z - WALL_T - ENGAWA_DEPTH;
