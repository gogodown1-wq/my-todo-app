// ===== 기본 설정 =====
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const CELL = 20; // 한 칸 크기(px)
const COLS = canvas.width / CELL; // 가로 칸 수 (20)
const ROWS = canvas.height / CELL; // 세로 칸 수 (20)
// 난이도별 한 번 움직이는 간격(ms) — 숫자가 작을수록 빠름
const DIFFICULTY_SPEED = {
  easy: 200,
  normal: 150,
  hard: 100,
  extreme: 50,
};
const LEVEL_SCORE = 50; // 이 점수마다 레벨업
const LEVEL_SPEEDUP = 10; // 레벨업마다 간격을 이만큼(ms) 줄여서 빨라짐
const MIN_SPEED = 20; // 아무리 빨라져도 이보다 짧아지지 않음
const BEST_KEY = "snakeBestScore"; // LocalStorage 저장 이름

// 승은이 색상
const COLOR = {
  sea: "#0a2f5c",
  grid: "rgba(255, 255, 255, 0.05)",
  outline: "#0b3d91",
  body: "#2f7fe0",
  belly: "#f5e6b8",
  scale: "rgba(255, 255, 255, 0.25)",
  fin: "#e9eef5",
  eye: "#d62828",
  fish: "#ff8c42",
};

// ===== 화면 요소 =====
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const startScreen = document.getElementById("start-screen");
const overScreen = document.getElementById("over-screen");
const finalScoreEl = document.getElementById("final-score");
const newRecordEl = document.getElementById("new-record");
const levelEl = document.getElementById("level");
const difficultyEl = document.getElementById("difficulty");
const pauseBtn = document.getElementById("pause-btn");

// ===== 게임 상태 =====
let snake = []; // 뱀 몸 좌표 목록 (0번이 머리)
let direction = { x: 1, y: 0 }; // 현재 진행 방향
let nextDirection = { x: 1, y: 0 }; // 다음 틱에 적용할 방향
let food = { x: 0, y: 0 };
let score = 0;
let bestScore = loadBest();
let timer = null;
let playing = false; // 게임이 진행 중인지 (일시정지 중에도 true)
let paused = false; // 일시정지 중인지
let level = 1;
let baseSpeed = DIFFICULTY_SPEED.normal; // 고른 난이도의 시작 속도

// 지금 레벨에 맞는 이동 간격(ms)
function currentSpeed() {
  return Math.max(MIN_SPEED, baseSpeed - (level - 1) * LEVEL_SPEEDUP);
}

// 지금 속도로 타이머를 다시 시작
function restartTimer() {
  clearInterval(timer);
  timer = setInterval(tick, currentSpeed());
}

// ===== 최고 점수 저장/불러오기 =====
function loadBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch (e) {
    // 저장소를 쓸 수 없는 환경이면 0점으로 시작
    return 0;
  }
}

function saveBest(value) {
  try {
    localStorage.setItem(BEST_KEY, String(value));
  } catch (e) {
    // 저장 실패는 무시 (게임은 계속 진행)
  }
}

// ===== 게임 시작 =====
function startGame() {
  // 가운데쯤에서 오른쪽을 보는 3칸짜리 뱀
  snake = [
    { x: 6, y: 10 },
    { x: 5, y: 10 },
    { x: 4, y: 10 },
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  level = 1;
  baseSpeed = DIFFICULTY_SPEED[difficultyEl.value] || DIFFICULTY_SPEED.normal;
  updateScore();
  placeFood();

  startScreen.classList.add("hidden");
  overScreen.classList.add("hidden");

  playing = true;
  paused = false;
  // 게임 중에는 난이도를 못 바꾸고, 일시정지 버튼은 쓸 수 있게 함
  difficultyEl.disabled = true;
  pauseBtn.disabled = false;
  pauseBtn.textContent = "일시정지";

  restartTimer();
  draw();
}

// ===== 일시정지 / 재개 =====
function togglePause() {
  if (!playing) return;
  paused = !paused;

  if (paused) {
    clearInterval(timer);
    pauseBtn.textContent = "계속하기";
  } else {
    restartTimer();
    pauseBtn.textContent = "일시정지";
  }
  draw();
}

// ===== 한 칸 움직이기 =====
function tick() {
  direction = nextDirection;
  const head = snake[0];
  const newHead = { x: head.x + direction.x, y: head.y + direction.y };
  const willEat = newHead.x === food.x && newHead.y === food.y;

  // 벽에 부딪혔는지 검사
  const hitWall =
    newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS;

  // 자기 몸에 부딪혔는지 검사
  // (먹이를 안 먹으면 꼬리가 빠지므로 꼬리 칸은 제외)
  const body = willEat ? snake : snake.slice(0, -1);
  const hitSelf = body.some((part) => part.x === newHead.x && part.y === newHead.y);

  if (hitWall || hitSelf) {
    gameOver();
    return;
  }

  snake.unshift(newHead);

  if (willEat) {
    // 먹이를 먹으면 꼬리를 그대로 둬서 한 칸 길어짐
    score += 10;

    // 50점마다 레벨업 → 속도를 올려서 타이머를 다시 시작
    const newLevel = Math.floor(score / LEVEL_SCORE) + 1;
    if (newLevel !== level) {
      level = newLevel;
      restartTimer();
    }

    updateScore();
    placeFood();
  } else {
    snake.pop();
  }

  draw();
}

// ===== 먹이 배치: 뱀과 겹치지 않는 빈 칸 중 랜덤 =====
function placeFood() {
  const empty = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!snake.some((part) => part.x === x && part.y === y)) {
        empty.push({ x, y });
      }
    }
  }
  // 빈 칸이 없으면(판을 꽉 채움) 먹이를 화면 밖에 둠
  food = empty.length
    ? empty[Math.floor(Math.random() * empty.length)]
    : { x: -1, y: -1 };
}

// ===== 게임 오버 =====
function gameOver() {
  clearInterval(timer);
  playing = false;
  paused = false;
  // 게임이 끝나면 난이도를 다시 고를 수 있고, 일시정지 버튼은 잠금
  difficultyEl.disabled = false;
  pauseBtn.disabled = true;
  pauseBtn.textContent = "일시정지";

  const isRecord = score > bestScore;
  if (isRecord) {
    bestScore = score;
    saveBest(bestScore);
  }
  updateScore();

  finalScoreEl.textContent = score;
  newRecordEl.classList.toggle("hidden", !isRecord);
  overScreen.classList.remove("hidden");
}

// ===== 점수 표시 갱신 =====
function updateScore() {
  scoreEl.textContent = score;
  bestEl.textContent = bestScore;
  levelEl.textContent = level;
}

// ===== 방향키 입력 =====
const KEY_DIRECTIONS = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

// 방향 바꾸기 (키보드·스와이프·화면 버튼이 모두 이 함수를 씀)
function changeDirection(dir) {
  // 게임 중이 아니거나 일시정지 중이면 방향을 바꾸지 않음
  if (!playing || paused) return;
  // 정반대 방향(바로 뒤로)은 무시
  if (dir.x === -direction.x && dir.y === -direction.y) return;
  nextDirection = dir;
}

document.addEventListener("keydown", (event) => {
  const dir = KEY_DIRECTIONS[event.key];
  if (!dir) return;

  // 방향키로 페이지가 스크롤되지 않게 막음
  event.preventDefault();
  changeDirection(dir);
});

// ===== 터치 조종 1: 게임 화면 스와이프 =====
const board = document.querySelector(".board");
const SWIPE_MIN = 20; // 이만큼(px) 이상 움직여야 스와이프로 인정
let touchStart = null;

board.addEventListener("touchstart", (event) => {
  const t = event.touches[0];
  touchStart = { x: t.clientX, y: t.clientY };
}, { passive: true });

board.addEventListener("touchmove", (event) => {
  if (!touchStart || !playing) return;
  // 게임 중에는 스와이프할 때 화면이 같이 스크롤되지 않게 막음
  event.preventDefault();

  const t = event.touches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return;

  // 더 많이 움직인 쪽(가로/세로)으로 방향을 정함
  if (Math.abs(dx) > Math.abs(dy)) {
    changeDirection(dx > 0 ? KEY_DIRECTIONS.ArrowRight : KEY_DIRECTIONS.ArrowLeft);
  } else {
    changeDirection(dy > 0 ? KEY_DIRECTIONS.ArrowDown : KEY_DIRECTIONS.ArrowUp);
  }
  // 손을 떼지 않고 이어서 다른 방향으로 쓸 수 있게 기준점을 옮김
  touchStart = { x: t.clientX, y: t.clientY };
}, { passive: false });

board.addEventListener("touchend", () => {
  touchStart = null;
});

// ===== 터치 조종 2: 화면 방향 버튼 =====
document.querySelectorAll(".pad-btn").forEach((btn) => {
  // pointerdown은 손가락이 닿자마자 반응해서 click보다 빠름
  btn.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    changeDirection(KEY_DIRECTIONS[btn.dataset.key]);
  });
});

document.getElementById("start-btn").addEventListener("click", startGame);
document.getElementById("restart-btn").addEventListener("click", startGame);
pauseBtn.addEventListener("click", togglePause);

// ===== 그리기 =====
function draw() {
  drawBackground();
  drawFood();
  drawBody();
  drawTailFin();
  drawHead();
  if (paused) drawPaused();
}

// 일시정지 중일 때 화면을 어둡게 덮고 안내 글자 표시
function drawPaused() {
  ctx.fillStyle = "rgba(6, 22, 50, 0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "800 32px 'Malgun Gothic', sans-serif";
  ctx.fillText("일시정지", canvas.width / 2, canvas.height / 2);
}

// 칸 좌표 → 칸 가운데 픽셀 좌표
function center(part) {
  return { x: part.x * CELL + CELL / 2, y: part.y * CELL + CELL / 2 };
}

// 바다 배경 + 옅은 격자선
function drawBackground() {
  ctx.fillStyle = COLOR.sea;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = COLOR.grid;
  ctx.lineWidth = 1;
  for (let i = 1; i < COLS; i++) {
    ctx.beginPath();
    ctx.moveTo(i * CELL + 0.5, 0);
    ctx.lineTo(i * CELL + 0.5, canvas.height);
    ctx.stroke();
  }
  for (let i = 1; i < ROWS; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * CELL + 0.5);
    ctx.lineTo(canvas.width, i * CELL + 0.5);
    ctx.stroke();
  }
}

// 먹이: 주황색 작은 승진이
function drawFood() {
  if (food.x < 0) return;
  const c = center(food);
  ctx.save();
  ctx.translate(c.x, c.y);

  // 몸통 (타원)
  ctx.fillStyle = COLOR.fish;
  ctx.beginPath();
  ctx.ellipse(-1, 0, 6, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // 꼬리 (삼각형)
  ctx.beginPath();
  ctx.moveTo(4, 0);
  ctx.lineTo(9, -5);
  ctx.lineTo(9, 5);
  ctx.closePath();
  ctx.fill();

  // 눈
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(-4, -1, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#222";
  ctx.beginPath();
  ctx.arc(-4.3, -1, 0.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// 몸 굵기: 머리 쪽은 굵고 꼬리로 갈수록 살짝 가늘어짐
function bodyWidth(index) {
  const t = snake.length > 1 ? index / (snake.length - 1) : 0;
  return CELL * (0.9 - 0.35 * t);
}

// 몸통: 이웃한 마디끼리 둥근 선으로 이어서 매끈한 몸을 만듦
function drawBody() {
  ctx.lineCap = "round";

  // 세 겹으로 칠함: 진한 테두리 → 파란 비늘 → 크림색 배
  const layers = [
    { color: COLOR.outline, scale: 1 },
    { color: COLOR.body, scale: 0.8 },
    { color: COLOR.belly, scale: 0.3 },
  ];

  layers.forEach((layer) => {
    ctx.strokeStyle = layer.color;
    for (let i = snake.length - 1; i > 0; i--) {
      const a = center(snake[i]);
      const b = center(snake[i - 1]);
      ctx.lineWidth = bodyWidth(i) * layer.scale;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  });

  // 비늘 무늬: 마디마다 작은 반달 두 개
  ctx.strokeStyle = COLOR.scale;
  ctx.lineWidth = 1.5;
  for (let i = 1; i < snake.length; i++) {
    const c = center(snake[i]);
    const r = bodyWidth(i) * 0.3;
    ctx.beginPath();
    ctx.arc(c.x - r * 0.6, c.y - r * 0.6, r * 0.5, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(c.x + r * 0.6, c.y + r * 0.6, r * 0.5, 0, Math.PI);
    ctx.stroke();
  }
}

// 꼬리 끝 지느러미 (흰색 삼각형 두 개)
function drawTailFin() {
  if (snake.length < 2) return;
  const tail = snake[snake.length - 1];
  const before = snake[snake.length - 2];
  // 꼬리가 향하는 방향 (몸 반대쪽)
  const angle = Math.atan2(tail.y - before.y, tail.x - before.x);
  const c = center(tail);

  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(angle);
  ctx.fillStyle = COLOR.fin;
  ctx.strokeStyle = COLOR.outline;
  ctx.lineWidth = 1.5;

  [-1, 1].forEach((side) => {
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(13, side * 9);
    ctx.lineTo(9, side * 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  ctx.restore();
}

// 머리: 진행 방향(오른쪽 기준으로 그린 뒤 회전)
function drawHead() {
  const c = center(snake[0]);
  ctx.save();
  ctx.translate(c.x, c.y);

  // 왼쪽을 볼 때는 뒤집어서 볏이 거꾸로 서지 않게 함
  if (direction.x === -1) {
    ctx.scale(-1, 1);
  } else {
    ctx.rotate(Math.atan2(direction.y, direction.x));
  }

  ctx.strokeStyle = COLOR.outline;
  ctx.lineWidth = 2;

  // 머리 위 볏 지느러미 (흰색 뾰족한 세 갈래)
  ctx.fillStyle = COLOR.fin;
  ctx.beginPath();
  ctx.moveTo(-6, -6);
  ctx.lineTo(-13, -15);
  ctx.lineTo(-4, -9);
  ctx.lineTo(-6, -17);
  ctx.lineTo(1, -8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 머리 (조금 큰 둥근 모양)
  ctx.fillStyle = COLOR.body;
  ctx.beginPath();
  ctx.ellipse(0, 0, 12, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 크림색 턱
  ctx.fillStyle = COLOR.belly;
  ctx.beginPath();
  ctx.ellipse(3, 5, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // 크게 벌린 입 (어두운 안쪽)
  ctx.fillStyle = "#3a0d12";
  ctx.beginPath();
  ctx.moveTo(4, 1);
  ctx.lineTo(13, -3);
  ctx.lineTo(13, 6);
  ctx.closePath();
  ctx.fill();

  // 이빨 (위아래 하얀 삼각형)
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(8, -1);
  ctx.lineTo(10, -1.8);
  ctx.lineTo(9.5, 1.5);
  ctx.closePath();
  ctx.moveTo(9, 4.5);
  ctx.lineTo(11, 5);
  ctx.lineTo(10, 2);
  ctx.closePath();
  ctx.fill();

  // 화난 눈 (빨간 눈동자 + 굵은 눈썹)
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(3, -4, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLOR.eye;
  ctx.beginPath();
  ctx.arc(4, -4, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLOR.outline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-1, -9);
  ctx.lineTo(7, -6);
  ctx.stroke();

  // 입가 수염 (노란 더듬이)
  ctx.strokeStyle = COLOR.belly;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.quadraticCurveTo(14, 10, 8, 14);
  ctx.stroke();

  ctx.restore();
}

// 처음 화면: 시작 전에도 바다 배경과 뱀이 보이도록 한 번 그려 둠
snake = [
  { x: 6, y: 10 },
  { x: 5, y: 10 },
  { x: 4, y: 10 },
];
placeFood();
updateScore();
draw();
