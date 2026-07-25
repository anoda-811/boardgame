export type Side = "sente" | "gote";

export type PieceType =
  | "king"
  | "rook"
  | "bishop"
  | "gold"
  | "silver"
  | "knight"
  | "lance"
  | "pawn"
  | "dragon"
  | "horse"
  | "promotedSilver"
  | "promotedKnight"
  | "promotedLance"
  | "tokin";

export type Piece = {
  type: PieceType;
  side: Side;
};

export type Square = Piece | null;

/** row 0 = gote back rank, row 8 = sente back rank (sente at bottom) */
export type Board = Square[][];

export type Hand = Record<UnpromotedType, number>;

export type UnpromotedType =
  | "rook"
  | "bishop"
  | "gold"
  | "silver"
  | "knight"
  | "lance"
  | "pawn";

export type Coord = { r: number; c: number };

export type Move =
  | {
      kind: "move";
      from: Coord;
      to: Coord;
      promote: boolean;
    }
  | {
      kind: "drop";
      piece: UnpromotedType;
      to: Coord;
    };

export const PIECE_LABEL: Record<PieceType, string> = {
  king: "王",
  rook: "飛",
  bishop: "角",
  gold: "金",
  silver: "銀",
  knight: "桂",
  lance: "香",
  pawn: "歩",
  dragon: "龍",
  horse: "馬",
  promotedSilver: "成銀",
  promotedKnight: "成桂",
  promotedLance: "成香",
  tokin: "と",
};

export const HAND_ORDER: UnpromotedType[] = [
  "rook",
  "bishop",
  "gold",
  "silver",
  "knight",
  "lance",
  "pawn",
];

export const MATERIAL: Record<PieceType, number> = {
  king: 10000,
  rook: 1000,
  dragon: 1200,
  bishop: 800,
  horse: 1000,
  gold: 600,
  silver: 500,
  promotedSilver: 600,
  knight: 400,
  promotedKnight: 600,
  lance: 300,
  promotedLance: 600,
  pawn: 100,
  tokin: 600,
};

export function emptyHand(): Hand {
  return {
    rook: 0,
    bishop: 0,
    gold: 0,
    silver: 0,
    knight: 0,
    lance: 0,
    pawn: 0,
  };
}

export function opposite(side: Side): Side {
  return side === "sente" ? "gote" : "sente";
}

export function isPromoted(type: PieceType): boolean {
  return (
    type === "dragon" ||
    type === "horse" ||
    type === "promotedSilver" ||
    type === "promotedKnight" ||
    type === "promotedLance" ||
    type === "tokin"
  );
}

export function canPromote(type: PieceType): boolean {
  return (
    type === "rook" ||
    type === "bishop" ||
    type === "silver" ||
    type === "knight" ||
    type === "lance" ||
    type === "pawn"
  );
}

export function promote(type: PieceType): PieceType {
  switch (type) {
    case "rook":
      return "dragon";
    case "bishop":
      return "horse";
    case "silver":
      return "promotedSilver";
    case "knight":
      return "promotedKnight";
    case "lance":
      return "promotedLance";
    case "pawn":
      return "tokin";
    default:
      return type;
  }
}

export function demote(type: PieceType): UnpromotedType | "king" {
  switch (type) {
    case "dragon":
    case "rook":
      return "rook";
    case "horse":
    case "bishop":
      return "bishop";
    case "gold":
      return "gold";
    case "promotedSilver":
    case "silver":
      return "silver";
    case "promotedKnight":
    case "knight":
      return "knight";
    case "promotedLance":
    case "lance":
      return "lance";
    case "tokin":
    case "pawn":
      return "pawn";
    case "king":
      return "king";
  }
}

export function inBounds(r: number, c: number) {
  return r >= 0 && r < 9 && c >= 0 && c < 9;
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

export function cloneHand(hand: Hand): Hand {
  return { ...hand };
}
