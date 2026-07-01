import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const WORLD = { width: 1207, height: 820 };
const TOTAL_TIME = 420;
const TARGET_FRUITS = 30;
const CHARACTER_SCALE = 1.6;
const JUMP_DISTANCE = 82;
const FALL_TIME_SCALE = 0.45;
const HANGING_COUNTDOWN_MIN = 6;
const HANGING_COUNTDOWN_MAX = 10;
const ROW_RAIN_COUNTDOWN = 4;
const ROW_RAIN_COOLDOWN = 4.5;
const BASKET_COLS = 3;
const BASKET_ROWS = 6;
const BASKET_SIZE = BASKET_COLS * BASKET_ROWS;
const COMBO_RAIN_COOLDOWN_MS = 3000;

const PHASE_CONFIG = {
  1: { trees: 3, fruitsPerTree: 1, dropInterval: 10, fallMin: 6, fallMax: 7 },
  2: { trees: 4, fruitsPerTree: 1, dropInterval: 10, fallMin: 6, fallMax: 10 },
  3: { trees: 4, fruitsPerTree: 2, dropInterval: 10, fallMin: 5, fallMax: 9 },
  4: { trees: 5, fruitsPerTree: 2, dropInterval: 8, fallMin: 4, fallMax: 8 },
  5: { trees: 5, fruitsPerTree: 3, dropInterval: 8, fallMin: 4, fallMax: 7 },
  6: { trees: 6, fruitsPerTree: 3, dropInterval: 6, fallMin: 3, fallMax: 6 },
  7: { trees: 6, fruitsPerTree: 4, dropInterval: 6, fallMin: 3, fallMax: 5 },
};

const ASSETS = {
  background: '/background/ChatGPT%20Image%20Jul%201,%202026,%2009_56_02%20PM.png',
  tree: '/item/cay.png',
  rauLang: '/item/Screenshot_2026-07-01_220320-removebg-preview.png',
  fruits: [
    { id: 'xoai', src: '/item/xoai.png', label: 'Xoai' },
    { id: 'oi', src: '/item/oi.png', label: 'Oi' },
    { id: 'man', src: '/item/man.png', label: 'Man' },
  ],
  character: {
    run: '/characters/run.png',
    catch: '/characters/catching.png',
    right: '/characters/lan_anh_walk_right.png',
    down: '/characters/lan_anh_walk_down.png',
    up: '/characters/lan_anh_walk_up.png',
  },
};

const LAN_ANH_SPRITES = {
  run: { cols: 2, rows: 2, frameWidth: 150, frameHeight: 150 },
  right: { cols: 4, rows: 1, frameWidth: 184, frameHeight: 132 },
  down: { cols: 4, rows: 1, frameWidth: 184, frameHeight: 130 },
  up: { cols: 4, rows: 1, frameWidth: 184, frameHeight: 132 },
  catch: { cols: 1, rows: 1, frameWidth: 250, frameHeight: 250 },
};

const TREE_LAYOUT = [
  { x: 96, y: 254, scale: 0.64, fruit: 'oi' },
  { x: 266, y: 178, scale: 0.7, fruit: 'xoai' },
  { x: 455, y: 276, scale: 0.68, fruit: 'man' },
  { x: 640, y: 130, scale: 0.74, fruit: 'xoai' },
  { x: 780, y: 284, scale: 0.68, fruit: 'oi' },
  { x: 955, y: 132, scale: 0.74, fruit: 'man' },
  { x: 1094, y: 256, scale: 0.66, fruit: 'xoai' },
  { x: 292, y: 432, scale: 0.66, fruit: 'oi' },
  { x: 620, y: 430, scale: 0.66, fruit: 'man' },
  { x: 928, y: 438, scale: 0.68, fruit: 'xoai' },
  { x: 138, y: 597, scale: 0.64, fruit: 'man' },
  { x: 462, y: 620, scale: 0.65, fruit: 'xoai' },
  { x: 770, y: 620, scale: 0.68, fruit: 'oi' },
  { x: 1104, y: 610, scale: 0.64, fruit: 'man' },
];

const RAU_LANG_ROWS = [
  { x: 104, y: 258, width: 1000, height: 68 },
  { x: 104, y: 421, width: 1000, height: 68 },
  { x: 104, y: 586, width: 1000, height: 68 },
];

const FRUIT_ANCHORS = [
  [-72, -124],
  [-34, -158],
  [18, -144],
  [60, -108],
  [-5, -86],
];

const TREE_ROWS = [
  [0, 1, 2, 3, 4, 5, 6],
  [7, 8, 9],
  [10, 11, 12, 13],
];

const KEY_DIRECTIONS = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pointInRect(point, rect) {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
}

function isBlocked(point) {
  return RAU_LANG_ROWS.some((row) => pointInRect(point, row));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function makeInitialState() {
  return {
    timeRemaining: TOTAL_TIME,
    currentPhase: 1,
    dropTimer: 9.4,
    collected: 0,
    isRunning: true,
    success: false,
    gameOver: false,
    nextFruitId: 1,
    hangingFruits: [],
    fallingFruits: [],
    collectEffects: [],
    treePulses: TREE_LAYOUT.map(() => 0),
    rowRain: {
      rowIndex: 0,
      status: 'countdown',
      countdown: ROW_RAIN_COUNTDOWN,
      cooldown: 0,
      pulse: 0,
    },
    catchPulse: 0,
    uiSecond: TOTAL_TIME,
    lanAnh: {
      x: 215,
      y: 710,
      direction: 'right',
      lastVector: { x: 1, y: 0 },
      moving: false,
      sprinting: false,
      isJumping: false,
      canJump: true,
      jumpElapsed: 0,
      jumpDuration: 0.28,
      jumpStart: { x: 215, y: 710 },
      jumpTarget: { x: 215, y: 710 },
    },
  };
}

function makeFruitDrop(state, treeIndex, config, quick = false, sourceX = null, sourceY = null) {
  const tree = TREE_LAYOUT[treeIndex];
  const fruitSize = 66 * tree.scale;
  const spread = 74 * tree.scale;
  const x = sourceX ?? tree.x + randomBetween(-spread, spread);
  const startY = sourceY ?? tree.y - 165 * tree.scale;
  const endY = tree.y + 132 * tree.scale;
  const fallTime = quick
    ? 0.75
    : Math.max(1, randomBetween(config.fallMin, config.fallMax) * FALL_TIME_SCALE);

  state.fallingFruits.push({
    id: state.nextFruitId,
    treeIndex,
    type: tree.fruit,
    x,
    startY,
    y: startY,
    endY,
    elapsed: 0,
    fallTime,
    size: fruitSize,
  });
  state.nextFruitId += 1;
}

function makeRainFruitDrop(state, treeIndex, anchorIndex, delay = 0) {
  const tree = TREE_LAYOUT[treeIndex];
  const anchor = FRUIT_ANCHORS[anchorIndex];
  const fruitSize = 70 * tree.scale;
  const startX = tree.x + anchor[0] * tree.scale + randomBetween(-10, 10);
  const startY = tree.y + anchor[1] * tree.scale;
  const endY = tree.y + 156 * tree.scale;

  state.fallingFruits.push({
    id: state.nextFruitId,
    treeIndex,
    type: tree.fruit,
    x: startX,
    startY,
    y: startY,
    endY,
    elapsed: -delay,
    fallTime: randomBetween(1.15, 1.9),
    size: fruitSize,
    rain: true,
  });
  state.nextFruitId += 1;
}

function spawnHangingFruit(state, treeIndex, config, quick = false) {
  const tree = TREE_LAYOUT[treeIndex];
  const activeAnchors = new Set(
    state.hangingFruits
      .filter((fruit) => fruit.treeIndex === treeIndex)
      .map((fruit) => fruit.anchorIndex),
  );
  const availableAnchors = FRUIT_ANCHORS
    .map((anchor, anchorIndex) => ({ anchor, anchorIndex }))
    .filter((item) => !activeAnchors.has(item.anchorIndex));
  const selected = availableAnchors.length > 0
    ? availableAnchors[Math.floor(Math.random() * availableAnchors.length)]
    : (() => {
      const anchorIndex = Math.floor(Math.random() * FRUIT_ANCHORS.length);
      return { anchor: FRUIT_ANCHORS[anchorIndex], anchorIndex };
    })();
  const countdown = quick ? 3.2 : randomBetween(HANGING_COUNTDOWN_MIN, HANGING_COUNTDOWN_MAX);

  state.hangingFruits.push({
    id: state.nextFruitId,
    treeIndex,
    type: tree.fruit,
    anchorIndex: selected.anchorIndex,
    offsetX: selected.anchor[0] * tree.scale,
    offsetY: selected.anchor[1] * tree.scale,
    countdown,
    totalCountdown: countdown,
    quick,
  });
  state.nextFruitId += 1;
}

function triggerDrop(state) {
  const config = PHASE_CONFIG[state.currentPhase];
  const activeTrees = shuffle(TREE_LAYOUT.map((_, index) => index)).slice(0, config.trees);

  for (const treeIndex of activeTrees) {
    for (let fruit = 0; fruit < config.fruitsPerTree; fruit += 1) {
      spawnHangingFruit(state, treeIndex, config);
    }
  }
}

function drawSprite(ctx, image, config, frame, x, y, width, height, flip = false) {
  const sourceX = (frame % config.cols) * config.frameWidth;
  const sourceY = Math.floor(frame / config.cols) * config.frameHeight;

  ctx.save();
  if (flip) {
    ctx.translate(x + width, y);
    ctx.scale(-1, 1);
    x = 0;
    y = 0;
  }

  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    config.frameWidth,
    config.frameHeight,
    x,
    y,
    width,
    height,
  );
  ctx.restore();
}

const OrchardCanvas = forwardRef(function OrchardCanvas({ command, resetKey, onStatsChange, onHarvest }, ref) {
  const canvasRef = useRef(null);
  const keysRef = useRef(new Set());
  const stateRef = useRef(makeInitialState());
  const assetsRef = useRef(null);

  const fruitMeta = useMemo(() => Object.fromEntries(ASSETS.fruits.map((fruit) => [fruit.id, fruit])), []);

  useEffect(() => {
    stateRef.current = makeInitialState();
    onStatsChange?.(summarizeState(stateRef.current));
  }, [resetKey]);

  useEffect(() => {
    let active = true;

    Promise.all([
      loadImage(ASSETS.background),
      loadImage(ASSETS.tree),
      loadImage(ASSETS.rauLang),
      loadImage(ASSETS.character.run),
      loadImage(ASSETS.character.catch),
      loadImage(ASSETS.character.right),
      loadImage(ASSETS.character.down),
      loadImage(ASSETS.character.up),
      ...ASSETS.fruits.map((fruit) => loadImage(fruit.src)),
    ]).then(([background, tree, rauLang, run, catchImage, right, down, up, ...fruits]) => {
      if (!active) return;
      assetsRef.current = {
        background,
        tree,
        rauLang,
        character: { run, catch: catchImage, right, down, up },
        fruits: Object.fromEntries(ASSETS.fruits.map((fruit, index) => [fruit.id, fruits[index]])),
      };
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (
        KEY_DIRECTIONS[event.code] ||
        event.code === 'Space' ||
        event.code === 'KeyQ' ||
        event.code === 'ShiftLeft' ||
        event.code === 'ShiftRight'
      ) {
        event.preventDefault();
      }
      keysRef.current.add(event.code);
    };
    const onKeyUp = (event) => {
      keysRef.current.delete(event.code);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    if (!command) return;
    const codeByCommand = {
      left: 'ArrowLeft',
      right: 'ArrowRight',
      up: 'ArrowUp',
      down: 'ArrowDown',
      jump: 'Space',
      shake: 'KeyQ',
    };
    const code = codeByCommand[command.name];
    if (!code) return;
    keysRef.current.add(code);
    const timer = window.setTimeout(() => keysRef.current.delete(code), command.name === 'jump' || command.name === 'shake' ? 120 : 150);
    return () => window.clearTimeout(timer);
  }, [command]);

  useEffect(() => {
    let animationId = 0;
    let previous = performance.now();

    const update = (now) => {
      const delta = Math.min((now - previous) / 1000, 0.04);
      previous = now;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const assets = assetsRef.current;
      if (!canvas || !ctx || !assets) {
        animationId = requestAnimationFrame(update);
        return;
      }

      const state = stateRef.current;
      updateGame(state, keysRef.current, delta, fruitMeta, onHarvest, onStatsChange);
      paint(ctx, assets, state, now / 1000);
      animationId = requestAnimationFrame(update);
    };

    animationId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationId);
  }, [fruitMeta, onHarvest, onStatsChange]);

  useImperativeHandle(ref, () => ({
    triggerNearestRowRain: () => {
      const state = stateRef.current;
      if (!state.isRunning) return false;
      const rowIndex = nearestRowIndex(state);
      triggerRowRain(state, rowIndex);
      state.rowRain.pulse = 1;
      return true;
    },
  }), []);

  return <canvas ref={canvasRef} width={WORLD.width} height={WORLD.height} className="orchard-canvas" />;
});

function summarizeState(state) {
  return {
    harvested: state.collected,
    target: TARGET_FRUITS,
    remaining: Math.max(0, TARGET_FRUITS - state.collected),
    phase: state.currentPhase,
    timeRemaining: Math.max(0, Math.ceil(state.timeRemaining)),
    success: state.success,
    gameOver: state.gameOver,
  };
}

function updateGame(state, pressed, delta, fruitMeta, onHarvest, onStatsChange) {
  if (!state.isRunning) return;

  state.timeRemaining -= delta;
  if (state.timeRemaining <= 0) {
    state.timeRemaining = 0;
    state.isRunning = false;
    state.gameOver = true;
    onStatsChange?.(summarizeState(state));
    return;
  }

  const nextPhase = clamp(Math.floor((TOTAL_TIME - state.timeRemaining) / 60) + 1, 1, 7);
  if (nextPhase !== state.currentPhase) {
    state.currentPhase = nextPhase;
    state.dropTimer = 0;
  }

  state.dropTimer += delta;
  if (state.dropTimer >= PHASE_CONFIG[state.currentPhase].dropInterval) {
    state.dropTimer = 0;
    triggerDrop(state);
  }

  updatePlayer(state, pressed, delta);
  updateRowRain(state, delta);
  updateHangingFruits(state, delta);
  updateFruits(state, delta, fruitMeta, onHarvest, onStatsChange);
  updateCollectEffects(state, delta);

  for (let index = 0; index < state.treePulses.length; index += 1) {
    state.treePulses[index] = Math.max(0, state.treePulses[index] - delta);
  }
  state.catchPulse = Math.max(0, state.catchPulse - delta);
  state.rowRain.pulse = Math.max(0, state.rowRain.pulse - delta);

  const uiSecond = Math.ceil(state.timeRemaining);
  if (uiSecond !== state.uiSecond) {
    state.uiSecond = uiSecond;
    onStatsChange?.(summarizeState(state));
  }
}

function updateRowRain(state, delta) {
  const rain = state.rowRain;

  if (rain.status === 'countdown') {
    rain.countdown -= delta;
    if (rain.countdown <= 0) {
      triggerRowRain(state, rain.rowIndex);
      rain.status = 'cooldown';
      rain.cooldown = ROW_RAIN_COOLDOWN;
      rain.pulse = 1;
    }
    return;
  }

  rain.cooldown -= delta;
  if (rain.cooldown <= 0) {
    rain.rowIndex = (rain.rowIndex + 1) % TREE_ROWS.length;
    rain.status = 'countdown';
    rain.countdown = ROW_RAIN_COUNTDOWN;
  }
}

function triggerRowRain(state, rowIndex) {
  const treeIndexes = TREE_ROWS[rowIndex];

  for (const treeIndex of treeIndexes) {
    state.treePulses[treeIndex] = 0.55;
    for (const anchorIndex of FRUIT_ANCHORS.keys()) {
      makeRainFruitDrop(state, treeIndex, anchorIndex, randomBetween(0, 0.6));
    }
  }
}

function nearestRowIndex(state) {
  const lanAnhY = state.lanAnh.y;
  let bestIndex = 0;
  let bestDistance = Infinity;

  TREE_ROWS.forEach((treeIndexes, rowIndex) => {
    const avgY = treeIndexes.reduce((sum, index) => sum + TREE_LAYOUT[index].y, 0) / treeIndexes.length;
    const rowDistance = Math.abs(avgY - lanAnhY);
    if (rowDistance < bestDistance) {
      bestDistance = rowDistance;
      bestIndex = rowIndex;
    }
  });

  return bestIndex;
}

function updatePlayer(state, pressed, delta) {
  const lanAnh = state.lanAnh;

  if (pressed.has('Space') && lanAnh.canJump && !lanAnh.isJumping) {
    startJump(lanAnh);
    pressed.delete('Space');
  }

  if (pressed.has('KeyQ')) {
    shakeNearestTree(state);
    pressed.delete('KeyQ');
  }

  if (lanAnh.isJumping) {
    lanAnh.jumpElapsed += delta;
    const progress = clamp(lanAnh.jumpElapsed / lanAnh.jumpDuration, 0, 1);
    const eased = 1 - Math.pow(1 - progress, 2);
    lanAnh.x = lanAnh.jumpStart.x + (lanAnh.jumpTarget.x - lanAnh.jumpStart.x) * eased;
    lanAnh.y = lanAnh.jumpStart.y + (lanAnh.jumpTarget.y - lanAnh.jumpStart.y) * eased;

    if (progress >= 1) {
      lanAnh.isJumping = false;
      window.setTimeout(() => {
        lanAnh.canJump = true;
      }, 350);
    }
    return;
  }

  const directionCodes = Array.from(pressed).map((code) => KEY_DIRECTIONS[code]).filter(Boolean);
  let dx = 0;
  let dy = 0;
  for (const direction of directionCodes) {
    if (direction === 'up') dy -= 1;
    if (direction === 'down') dy += 1;
    if (direction === 'left') dx -= 1;
    if (direction === 'right') dx += 1;
    lanAnh.direction = direction;
  }

  const length = Math.hypot(dx, dy) || 1;
  if (dx !== 0 || dy !== 0) {
    lanAnh.lastVector = { x: dx / length, y: dy / length };
  }

  const sprinting = pressed.has('ShiftLeft') || pressed.has('ShiftRight');
  const speed = sprinting ? 330 : 140;
  lanAnh.moving = dx !== 0 || dy !== 0;
  lanAnh.sprinting = sprinting && lanAnh.moving;

  const nextX = clamp(lanAnh.x + (dx / length) * speed * delta, 68, WORLD.width - 68);
  const nextY = clamp(lanAnh.y + (dy / length) * speed * delta, 112, WORLD.height - 68);
  moveWithRauLangCollision(lanAnh, nextX, nextY);
}

function updateHangingFruits(state, delta) {
  const config = PHASE_CONFIG[state.currentPhase];
  const stillHanging = [];

  for (const fruit of state.hangingFruits) {
    fruit.countdown -= delta;

    if (fruit.countdown <= 0) {
      const tree = TREE_LAYOUT[fruit.treeIndex];
      makeFruitDrop(state, fruit.treeIndex, config, fruit.quick, tree.x + fruit.offsetX, tree.y + fruit.offsetY);
    } else {
      stillHanging.push(fruit);
    }
  }

  state.hangingFruits = stillHanging;
}

function updateCollectEffects(state, delta) {
  state.collectEffects = state.collectEffects
    .map((effect) => ({
      ...effect,
      life: effect.life - delta,
      y: effect.y - 28 * delta,
    }))
    .filter((effect) => effect.life > 0);
}

function moveWithRauLangCollision(lanAnh, nextX, nextY) {
  const current = { x: lanAnh.x, y: lanAnh.y };
  const horizontal = { x: nextX, y: current.y };
  const vertical = { x: lanAnh.x, y: nextY };
  const both = { x: nextX, y: nextY };

  if (!isBlocked(horizontal)) {
    lanAnh.x = nextX;
  }
  if (!isBlocked(vertical)) {
    lanAnh.y = nextY;
  }
  if (!isBlocked(both)) {
    lanAnh.x = nextX;
    lanAnh.y = nextY;
  }
}

function startJump(lanAnh) {
  lanAnh.canJump = false;
  lanAnh.isJumping = true;
  lanAnh.jumpElapsed = 0;
  lanAnh.jumpStart = { x: lanAnh.x, y: lanAnh.y };
  lanAnh.jumpTarget = {
    x: clamp(lanAnh.x + lanAnh.lastVector.x * JUMP_DISTANCE, 68, WORLD.width - 68),
    y: clamp(lanAnh.y + lanAnh.lastVector.y * JUMP_DISTANCE, 112, WORLD.height - 68),
  };
}

function shakeNearestTree(state) {
  const nearest = nearestTree(state.lanAnh);
  if (!nearest || nearest.distance > 132) return;

  state.treePulses[nearest.index] = 0.34;
  const hangingFruits = state.hangingFruits.filter((fruit) => fruit.treeIndex === nearest.index);
  for (const fruit of hangingFruits) {
    fruit.countdown = Math.max(0.5, fruit.countdown - 2.4);
    fruit.quick = true;
  }
}

function nearestTree(lanAnh) {
  return TREE_LAYOUT.map((tree, index) => ({
    index,
    tree,
    distance: distance({ x: lanAnh.x, y: lanAnh.y }, { x: tree.x, y: tree.y + 80 * tree.scale }),
  })).sort((a, b) => a.distance - b.distance)[0];
}

function updateFruits(state, delta, fruitMeta, onHarvest, onStatsChange) {
  const remaining = [];

  for (const fruit of state.fallingFruits) {
    fruit.elapsed += delta;
    const progress = clamp(fruit.elapsed / fruit.fallTime, 0, 1);
    const eased = progress * progress;
    fruit.y = fruit.startY + (fruit.endY - fruit.startY) * eased;

    if (isFruitTouchingPlayer(state.lanAnh, fruit)) {
      state.collected = Math.min(TARGET_FRUITS, state.collected + 1);
      state.catchPulse = 0.38;
      state.collectEffects.push({
        x: state.lanAnh.x,
        y: state.lanAnh.y - 128,
        life: 0.72,
        maxLife: 0.72,
      });
      onHarvest?.(fruitMeta[fruit.type]);
      if (state.collected >= TARGET_FRUITS) {
        state.success = true;
        state.isRunning = false;
      }
      onStatsChange?.(summarizeState(state));
      continue;
    }

    if (progress < 1) {
      remaining.push(fruit);
    }
  }

  state.fallingFruits = remaining;
}

function isFruitTouchingPlayer(lanAnh, fruit) {
  const fruitRadius = fruit.size * 0.34;
  const playerRect = {
    left: lanAnh.x - 34,
    right: lanAnh.x + 34,
    top: lanAnh.y - (lanAnh.isJumping ? 148 : 126),
    bottom: lanAnh.y - 36,
  };

  const closestX = clamp(fruit.x, playerRect.left, playerRect.right);
  const closestY = clamp(fruit.y, playerRect.top, playerRect.bottom);
  return distance({ x: closestX, y: closestY }, fruit) <= fruitRadius;
}

function paint(ctx, assets, state, time) {
  ctx.clearRect(0, 0, WORLD.width, WORLD.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(assets.background, 0, 0, WORLD.width, WORLD.height);
  drawRauLang(ctx, assets);
  drawRowRainWarning(ctx, state);

  const drawQueue = TREE_LAYOUT.map((tree, index) => ({
    kind: 'tree',
    index,
    sortY: tree.y + 105 * tree.scale,
  }));

  drawQueue.push({ kind: 'lanAnh', sortY: state.lanAnh.y });
  drawQueue.sort((a, b) => a.sortY - b.sortY);

  for (const item of drawQueue) {
    if (item.kind === 'tree') {
      drawTree(ctx, assets, state, TREE_LAYOUT[item.index], item.index);
    } else {
      drawLanAnh(ctx, assets, state, time);
    }
  }

  for (const fruit of state.fallingFruits) {
    drawFallingFruit(ctx, assets, fruit, time);
  }

  for (const effect of state.collectEffects) {
    drawCollectEffect(ctx, effect);
  }

  if (state.success || state.gameOver) {
    drawResult(ctx, state);
  }
}

function drawRauLang(ctx, assets) {
  for (const row of RAU_LANG_ROWS) {
    ctx.drawImage(assets.rauLang, row.x, row.y, row.width, row.height);
  }
}

function drawRowRainWarning(ctx, state) {
  const rain = state.rowRain;
  const treeIndexes = TREE_ROWS[rain.rowIndex];
  const rowTrees = treeIndexes.map((index) => TREE_LAYOUT[index]);
  const minY = Math.min(...rowTrees.map((tree) => tree.y - 210 * tree.scale));
  const maxY = Math.max(...rowTrees.map((tree) => tree.y + 180 * tree.scale));
  const alpha = rain.status === 'countdown'
    ? 0.18 + Math.sin(performance.now() / 160) * 0.08
    : rain.pulse * 0.22;

  if (alpha <= 0) return;

  ctx.save();
  ctx.fillStyle = `rgba(255, 206, 72, ${alpha})`;
  ctx.fillRect(40, minY, WORLD.width - 80, maxY - minY);
  ctx.strokeStyle = `rgba(255, 235, 140, ${Math.min(0.8, alpha * 3)})`;
  ctx.lineWidth = 3;
  ctx.strokeRect(40, minY, WORLD.width - 80, maxY - minY);

  if (rain.status === 'countdown') {
    ctx.fillStyle = 'rgba(38, 43, 28, 0.86)';
    ctx.strokeStyle = 'rgba(255, 236, 142, 0.78)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(WORLD.width / 2 - 66, minY + 12, 132, 42, 7);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fff2a8';
    ctx.font = '900 20px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Mua qua ${Math.ceil(rain.countdown)}`, WORLD.width / 2, minY + 33);
  }

  ctx.restore();
}

function drawTree(ctx, assets, state, tree, treeIndex) {
  const pulse = state.treePulses[treeIndex];
  const scale = tree.scale * (pulse > 0 ? 1 + Math.sin(pulse * 44) * 0.018 : 1);
  const width = 451 * scale;
  const height = 554 * scale;
  const x = tree.x - width / 2;
  const y = tree.y - height * 0.76;
  ctx.drawImage(assets.tree, x, y, width, height);

  const hanging = state.hangingFruits.filter((fruit) => fruit.treeIndex === treeIndex);
  drawStaticFruits(ctx, assets, tree, hanging);
  for (const fruit of hanging) {
    drawHangingFruit(ctx, assets, tree, fruit);
  }
}

function drawStaticFruits(ctx, assets, tree, activeFruits) {
  const activeAnchors = new Set(activeFruits.map((fruit) => fruit.anchorIndex));
  const size = 44 * tree.scale;

  ctx.save();
  ctx.globalAlpha = 0.9;
  for (const [anchorIndex, anchor] of FRUIT_ANCHORS.entries()) {
    if (activeAnchors.has(anchorIndex)) continue;

    const x = tree.x + anchor[0] * tree.scale;
    const y = tree.y + anchor[1] * tree.scale;
    ctx.drawImage(assets.fruits[tree.fruit], x - size / 2, y - size / 2, size, size);
  }
  ctx.restore();
}

function drawHangingFruit(ctx, assets, tree, fruit) {
  const x = tree.x + fruit.offsetX;
  const y = tree.y + fruit.offsetY;
  const size = 72 * tree.scale;
  const label = Math.ceil(fruit.countdown);
  const blink = 0.45 + Math.sin(performance.now() / 120 + fruit.id) * 0.35;

  ctx.save();
  ctx.shadowColor = 'rgba(30, 24, 15, 0.34)';
  ctx.shadowBlur = 7;
  ctx.shadowOffsetY = 5;
  ctx.drawImage(assets.fruits[fruit.type], x - size / 2, y - size / 2, size, size);
  ctx.shadowColor = 'transparent';

  ctx.fillStyle = 'rgba(37, 45, 28, 0.84)';
  ctx.strokeStyle = 'rgba(255, 244, 178, 0.74)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x - 12, y - size / 2 - 24, 24, 20, 5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fff4a8';
  ctx.font = '800 14px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y - size / 2 - 14);

  ctx.globalAlpha = clamp(blink, 0.15, 1);
  ctx.fillStyle = '#ff2f2f';
  ctx.strokeStyle = '#fff0d5';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x + size * 0.32, y - size * 0.35, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawFallingFruit(ctx, assets, fruit, time) {
  const bob = Math.sin(time * 5 + fruit.id) * 1.5;
  ctx.save();
  ctx.shadowColor = 'rgba(30, 24, 15, 0.32)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 6;
  ctx.drawImage(assets.fruits[fruit.type], fruit.x - fruit.size / 2, fruit.y - fruit.size / 2 + bob, fruit.size, fruit.size);
  ctx.restore();
}

function drawCollectEffect(ctx, effect) {
  const progress = 1 - effect.life / effect.maxLife;
  const radius = 13 + progress * 8;
  const alpha = Math.max(0, effect.life / effect.maxLife);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(effect.x, effect.y);
  ctx.rotate(progress * Math.PI * 1.4);
  ctx.fillStyle = '#ffe66f';
  ctx.strokeStyle = '#fff8bd';
  ctx.lineWidth = 3;
  ctx.beginPath();

  for (let point = 0; point < 10; point += 1) {
    const angle = -Math.PI / 2 + point * (Math.PI / 5);
    const length = point % 2 === 0 ? radius : radius * 0.46;
    const x = Math.cos(angle) * length;
    const y = Math.sin(angle) * length;
    if (point === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawLanAnh(ctx, assets, state, time) {
  const lanAnh = state.lanAnh;
  const nearTree = nearestTree(lanAnh)?.distance < 118;
  const catching = state.catchPulse > 0 || (nearTree && !lanAnh.moving && !lanAnh.isJumping);
  const jumpLift = lanAnh.isJumping ? Math.sin(clamp(lanAnh.jumpElapsed / lanAnh.jumpDuration, 0, 1) * Math.PI) * 40 : 0;
  const frameTime = Math.floor(time * (lanAnh.sprinting ? 12 : 8));

  if (catching) {
    const size = 84 * CHARACTER_SCALE;
    drawSprite(
      ctx,
      assets.character.catch,
      LAN_ANH_SPRITES.catch,
      0,
      lanAnh.x - size / 2,
      lanAnh.y - size + 12 - jumpLift,
      size,
      size,
    );
    return;
  }

  if (lanAnh.sprinting && Math.abs(lanAnh.lastVector.x) >= Math.abs(lanAnh.lastVector.y)) {
    const size = 94 * CHARACTER_SCALE;
    drawSprite(
      ctx,
      assets.character.run,
      LAN_ANH_SPRITES.run,
      frameTime % 4,
      lanAnh.x - size / 2,
      lanAnh.y - size + 14 - jumpLift,
      size,
      size,
      lanAnh.direction === 'left',
    );
    return;
  }

  const spriteKey = lanAnh.direction === 'left' ? 'right' : lanAnh.direction;
  const config = LAN_ANH_SPRITES[spriteKey];
  const frame = lanAnh.moving || lanAnh.isJumping ? frameTime % config.cols : 0;
  const width = 96 * CHARACTER_SCALE;
  const height = (spriteKey === 'down' ? 68 : 70) * CHARACTER_SCALE;
  drawSprite(
    ctx,
    assets.character[spriteKey],
    config,
    frame,
    lanAnh.x - width / 2,
    lanAnh.y - height + 8 - jumpLift,
    width,
    height,
    lanAnh.direction === 'left',
  );
}

function drawResult(ctx, state) {
  ctx.save();
  ctx.fillStyle = 'rgba(31, 36, 28, 0.72)';
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  ctx.fillStyle = '#fff7c6';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 48px Inter, sans-serif';
  ctx.fillText(state.success ? 'Thanh cong' : 'Het gio', WORLD.width / 2, WORLD.height / 2 - 28);
  ctx.font = '700 24px Inter, sans-serif';
  ctx.fillText(`Qua da hai: ${state.collected}/${TARGET_FRUITS}`, WORLD.width / 2, WORLD.height / 2 + 26);
  ctx.restore();
}

function findBasketMatches(grid) {
  const matched = new Set();

  // Hang ngang: vi BASKET_COLS = 3 nen 1 hang day du chinh la 3 o lien tiep.
  for (let row = 0; row < BASKET_ROWS; row += 1) {
    const base = row * BASKET_COLS;
    let allSameType = true;
    for (let col = 0; col < BASKET_COLS; col += 1) {
      const cell = grid[base + col];
      if (!cell || cell.popping || cell.type !== grid[base]?.type) {
        allSameType = false;
        break;
      }
    }
    if (allSameType) {
      for (let col = 0; col < BASKET_COLS; col += 1) matched.add(base + col);
    }
  }

  // Cot doc: kiem tra 3 o lien tiep cung loai theo tung cot.
  for (let col = 0; col < BASKET_COLS; col += 1) {
    for (let row = 0; row <= BASKET_ROWS - 3; row += 1) {
      const i0 = row * BASKET_COLS + col;
      const i1 = i0 + BASKET_COLS;
      const i2 = i0 + BASKET_COLS * 2;
      const a = grid[i0];
      const b = grid[i1];
      const c = grid[i2];
      if (a && b && c && !a.popping && !b.popping && !c.popping && a.type === b.type && b.type === c.type) {
        matched.add(i0);
        matched.add(i1);
        matched.add(i2);
      }
    }
  }

  return matched;
}

function App() {
  const [stats, setStats] = useState(summarizeState(makeInitialState()));
  const [lastFruit, setLastFruit] = useState(null);
  const [basketGrid, setBasketGrid] = useState(() => Array(BASKET_SIZE).fill(null));
  const [command, setCommand] = useState(null);
  const [resetKey, setResetKey] = useState(0);
  const canvasRef = useRef(null);
  const lastComboRainRef = useRef(0);

  const handleStatsChange = useCallback((nextStats) => {
    setStats(nextStats);
  }, []);

  const handleHarvest = useCallback((fruit) => {
    setLastFruit(fruit);
    setBasketGrid((grid) => {
      const newItem = {
        id: `${fruit.id}-${Date.now()}-${Math.random()}`,
        type: fruit.id,
        label: fruit.label,
        src: fruit.src,
        popping: false,
      };

      const emptyIndexes = [];
      grid.forEach((cell, index) => {
        if (!cell) emptyIndexes.push(index);
      });

      if (emptyIndexes.length > 0) {
        const targetIndex = emptyIndexes[Math.floor(Math.random() * emptyIndexes.length)];
        const nextGrid = grid.slice();
        nextGrid[targetIndex] = newItem;
        return nextGrid;
      }

      // Ro day: day o cu nhat ra, don sang de nhuong cho qua moi.
      return [...grid.slice(1), newItem];
    });
  }, []);

  useEffect(() => {
    const matched = findBasketMatches(basketGrid);
    if (matched.size === 0) return;

    setBasketGrid((grid) =>
      grid.map((cell, index) => (matched.has(index) && cell ? { ...cell, popping: true } : cell)),
    );

    const now = Date.now();
    if (now - lastComboRainRef.current >= COMBO_RAIN_COOLDOWN_MS) {
      const fired = canvasRef.current?.triggerNearestRowRain();
      if (fired) lastComboRainRef.current = now;
    }

    const timer = window.setTimeout(() => {
      setBasketGrid((grid) => grid.map((cell, index) => (matched.has(index) ? null : cell)));
    }, 520);

    return () => window.clearTimeout(timer);
  }, [basketGrid]);

  const trigger = (name) => {
    setCommand({ name, id: Date.now() });
  };

  return (
    <main className="app-shell">
      <section className="stage" aria-label="Vuon hai qua">
        <div className="hud">
          <div>
            <span className="hud-label">Qua</span>
            <strong>{stats.harvested}/{stats.target}</strong>
          </div>
          <div>
            <span className="hud-label">Pha</span>
            <strong>{stats.phase}</strong>
          </div>
          <div>
            <span className="hud-label">Gio</span>
            <strong>{Math.floor(stats.timeRemaining / 60)}:{String(stats.timeRemaining % 60).padStart(2, '0')}</strong>
          </div>
          <div>
            <span className="hud-label">Gan nhat</span>
            <strong>{lastFruit?.label ?? '-'}</strong>
          </div>
        </div>

        <OrchardCanvas
          ref={canvasRef}
          command={command}
          resetKey={resetKey}
          onHarvest={handleHarvest}
          onStatsChange={handleStatsChange}
        />

        <aside className="basket" aria-label="Gio trai cay">
          <div className="basket-title">Gio qua</div>
          <div className="basket-bowl" aria-hidden="true" />
          <div className="basket-grid">
            {basketGrid.map((item, index) => (
              <div
                key={item ? item.id : `slot-${index}`}
                className={`basket-item ${item ? '' : 'is-empty'} ${item?.popping ? 'is-popping' : ''}`}
              >
                {item && <img src={item.src} alt={item.label} />}
              </div>
            ))}
          </div>
        </aside>

        <div className="actions">
          <button type="button" onClick={() => {
            setBasketGrid(Array(BASKET_SIZE).fill(null));
            setResetKey((value) => value + 1);
          }}>Reset</button>
        </div>

        <div className="pad" aria-label="Dieu khien">
          <button type="button" className="pad-button up" onClick={() => trigger('up')} aria-label="Len">
            ^
          </button>
          <button type="button" className="pad-button left" onClick={() => trigger('left')} aria-label="Trai">
            &lt;
          </button>
          <button type="button" className="pad-button jump" onClick={() => trigger('jump')} aria-label="Nhay">
            J
          </button>
          <button type="button" className="pad-button shake" onClick={() => trigger('shake')} aria-label="Rung cay">
            Q
          </button>
          <button type="button" className="pad-button right" onClick={() => trigger('right')} aria-label="Phai">
            &gt;
          </button>
          <button type="button" className="pad-button down" onClick={() => trigger('down')} aria-label="Xuong">
            v
          </button>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
