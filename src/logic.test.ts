import { describe, expect, it } from 'vitest';
import {
  COLUMNS, ROWS, SHAPES, clearLines, collides, createBoard, createPiece, dropInterval, levelForLines,
  lineClearScore, mergePiece, rotate, shuffledBag,
} from './logic.ts';
import type { PieceType } from './logic.ts';

const fullRow = (): PieceType[] => Array<PieceType>(COLUMNS).fill('I');

describe('createBoard', () => {
  it('creates an empty ROWS x COLUMNS grid', () => {
    const board = createBoard();
    expect(board).toHaveLength(ROWS);
    expect(board.every((row) => row.length === COLUMNS && row.every((cell) => cell === null))).toBe(true);
  });

  it('does not share rows between calls', () => {
    const a = createBoard();
    a[0][0] = 'T';
    expect(createBoard()[0][0]).toBeNull();
  });
});

describe('shuffledBag', () => {
  it('contains each piece exactly once', () => {
    expect([...shuffledBag()].sort()).toEqual(['I', 'J', 'L', 'O', 'S', 'T', 'Z']);
  });

  it('is deterministic for a given random source', () => {
    expect(shuffledBag(() => 0)).toEqual(shuffledBag(() => 0));
  });
});

describe('createPiece', () => {
  it('centers the piece horizontally at the top', () => {
    expect(createPiece('I')).toMatchObject({ x: 3, y: 0 });
    expect(createPiece('O')).toMatchObject({ x: 4, y: 0 });
  });

  it('copies the shape so mutation does not leak', () => {
    const piece = createPiece('T');
    piece.matrix[0][0] = 9;
    expect(SHAPES.T[0][0]).toBe(0);
  });
});

describe('collides', () => {
  it('is false for a freshly spawned piece on an empty board', () => {
    expect(collides(createBoard(), createPiece('T'))).toBe(false);
  });

  it('detects walls and floor', () => {
    const board = createBoard();
    const piece = createPiece('O');
    expect(collides(board, piece, -piece.x - 1, 0)).toBe(true);
    expect(collides(board, piece, COLUMNS, 0)).toBe(true);
    expect(collides(board, piece, 0, ROWS)).toBe(true);
    expect(collides(board, piece, 0, ROWS - 2)).toBe(false);
  });

  it('detects settled blocks', () => {
    const board = createBoard();
    board[1][4] = 'Z';
    expect(collides(board, createPiece('O'), 0, 0)).toBe(true);
  });

  it('allows cells above the board', () => {
    expect(collides(createBoard(), createPiece('O'), 0, -1)).toBe(false);
  });
});

describe('rotate', () => {
  it('rotates clockwise', () => {
    expect(rotate([[1, 0], [1, 1]])).toEqual([[1, 1], [1, 0]]);
    expect(rotate(SHAPES.I)).toEqual([[1], [1], [1], [1]]);
  });

  it('returns to the original after four rotations', () => {
    for (const type of Object.keys(SHAPES) as PieceType[]) {
      let m = SHAPES[type];
      for (let i = 0; i < 4; i++) m = rotate(m);
      expect(m).toEqual(SHAPES[type]);
    }
  });
});

describe('mergePiece', () => {
  it('writes piece cells into the board', () => {
    const board = createBoard();
    const piece = createPiece('T');
    piece.y = 5;
    mergePiece(board, piece);
    expect(board[5][4]).toBe('T');
    expect(board[6].slice(3, 6)).toEqual(['T', 'T', 'T']);
    expect(board[5][3]).toBeNull();
  });
});

describe('clearLines', () => {
  it('clears nothing when no row is full', () => {
    const board = createBoard();
    board[ROWS - 1][0] = 'T';
    const result = clearLines(board);
    expect(result.cleared).toBe(0);
    expect(result.board[ROWS - 1][0]).toBe('T');
  });

  it('removes full rows, shifts the rest down and keeps size', () => {
    const board = createBoard();
    board[ROWS - 1] = fullRow();
    board[ROWS - 2] = fullRow();
    board[ROWS - 3][2] = 'L';
    const result = clearLines(board);
    expect(result.cleared).toBe(2);
    expect(result.board).toHaveLength(ROWS);
    expect(result.board[ROWS - 1][2]).toBe('L');
    expect(result.board[0].every((c) => c === null)).toBe(true);
  });
});

describe('scoring', () => {
  it('scores line clears scaled by level', () => {
    expect(lineClearScore(1, 1)).toBe(100);
    expect(lineClearScore(2, 1)).toBe(300);
    expect(lineClearScore(3, 2)).toBe(1000);
    expect(lineClearScore(4, 3)).toBe(2400);
  });

  it('levels up every 10 lines', () => {
    expect(levelForLines(0)).toBe(1);
    expect(levelForLines(9)).toBe(1);
    expect(levelForLines(10)).toBe(2);
    expect(levelForLines(25)).toBe(3);
  });

  it('speeds up with level but never below 90ms', () => {
    expect(dropInterval(1)).toBe(800);
    expect(dropInterval(2)).toBe(735);
    expect(dropInterval(100)).toBe(90);
  });
});
