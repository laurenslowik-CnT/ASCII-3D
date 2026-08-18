// src/lib/raycaster/textures.ts
// Procedural wall textures as flat Uint8Array (greyscale 0-255, row-major).

export const TEX_SIZE = 64;

function makeTexture(fill: (r: number, c: number) => number): Uint8Array {
  const data = new Uint8Array(TEX_SIZE * TEX_SIZE);
  for (let r = 0; r < TEX_SIZE; r++) {
    for (let c = 0; c < TEX_SIZE; c++) {
      data[r * TEX_SIZE + c] = Math.max(
        0,
        Math.min(255, Math.round(fill(r, c))),
      );
    }
  }
  return data;
}

// Brick: horizontal courses with alternating vertical joints
export const BRICK_TEXTURE: Uint8Array = makeTexture((r, c) => {
  const BRICK_H = 8;
  const BRICK_W = 16;
  const MORTAR = 1;
  const rowInBrick = r % BRICK_H;
  const brickRow = Math.floor(r / BRICK_H);
  const offset = brickRow % 2 === 0 ? 0 : BRICK_W / 2;
  const colInBrick = (c + offset) % BRICK_W;
  if (rowInBrick < MORTAR || colInBrick < MORTAR) {
    return 28; // mortar: near-black
  }
  // brick face: medium brightness with subtle variation
  return 145 + ((r * 7 + c * 13 + brickRow * 3) % 55);
});

// Glass curtain wall: windows separated by spandrel panels and mullions
export const WINDOW_TEXTURE: Uint8Array = makeTexture((r, c) => {
  const FLOOR_H = 16; // rows per floor (tiles 4× in 64px)
  const WIN_W = 32; // cols per window bay (tiles 2× in 64px)
  const MARGIN_V = 3; // spandrel top/bottom
  const MARGIN_H = 4; // mullion left/right
  const FRAME = 1; // inner frame thickness
  const floorRow = r % FLOOR_H;
  const winCol = c % WIN_W;
  const inV = floorRow >= MARGIN_V && floorRow < FLOOR_H - MARGIN_V;
  const inH = winCol >= MARGIN_H && winCol < WIN_W - MARGIN_H;
  if (!inV || !inH) {
    return 35; // spandrel / mullion
  }
  const atFrameV = floorRow === MARGIN_V || floorRow === FLOOR_H - MARGIN_V - 1;
  const atFrameH = winCol === MARGIN_H || winCol === WIN_W - MARGIN_H - 1;
  if (atFrameV || atFrameH) {
    return 65 + FRAME * 0; // window frame
  }
  // glass: bright with slight shimmer
  return 195 + ((r * 3 + c * 7) % 45);
});

export function sampleTexture(data: Uint8Array, u: number, v: number): number {
  const col = Math.floor((((u % 1) + 1) % 1) * TEX_SIZE);
  const row = Math.floor((((v % 1) + 1) % 1) * TEX_SIZE);
  return data[row * TEX_SIZE + col] ?? 128;
}

// Tall buildings (>20 m) get glass; shorter ones get brick
// Pavement: concrete slabs with joint lines
export const FLOOR_TEXTURE: Uint8Array = makeTexture((r, c) => {
  const SLAB = 24;
  const JOINT = 1;
  if (r % SLAB < JOINT || c % SLAB < JOINT) {
    return 55; // joint: slightly lighter crack
  }
  return 22 + ((r * 5 + c * 3) % 12); // concrete: dark with subtle variation
});

export function selectTexture(heightM: number): Uint8Array {
  return heightM > 20 ? WINDOW_TEXTURE : BRICK_TEXTURE;
}
