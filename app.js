const canvas = document.querySelector("#scene");
const ctx = canvas.getContext("2d", { alpha: false });
const bgMusic = document.querySelector("#bgMusic");
const startGiftBtn = document.querySelector("#startGiftBtn");
const photoWallBtn = document.querySelector("#photoWallBtn");
const cakeMergeBtn = document.querySelector("#cakeMergeBtn");
const statusEl = document.querySelector("#status");

const birthdayMessage = "生日快乐";
const birthdayName = "My Love";
const sparkMultiplier = 1.15;

const storageKey = "birthday-cosmos-config-v2";
try { localStorage.removeItem(storageKey); } catch (error) {}
const isAdmin = new URLSearchParams(window.location.search).has("admin");
document.body.classList.add(isAdmin ? "admin-mode" : "viewer-mode");

const state = {
  width: 1280,
  height: 900,
  dpr: 1,
  stage: "intro",
  stageCue: "",
  tone: "cosmos",
  timelineStart: 0,
  cakeProgress: 0,
  sphereRotX: -0.12,
  sphereRotY: 0,
  dragging: false,
  dragMoved: false,
  dragX: 0,
  dragY: 0,
  selectedPhoto: -1,
  selectedZoom: 1,
};

const stars = [];
const morphParticles = [];
const fireworks = [];
const rockets = [];
let photoSources = [
  { src: "./image-web/photo-01.jpg", rotate: 0 },
  { src: "./image-web/photo-02.jpg", rotate: 0 },
  { src: "./image-web/photo-03.jpg", rotate: 0 },
  { src: "./image-web/photo-04.jpg", rotate: 0 },
  { src: "./image-web/photo-05.jpg", rotate: 0 },
  { src: "./image-web/photo-06.jpg", rotate: 0 },
  { src: "./image-web/photo-07.jpg", rotate: 0 },
  { src: "./image-web/photo-08.jpg", rotate: 0 },
  { src: "./image-web/photo-09.jpg", rotate: 0 },
];
const photoImages = [];
const photoCards = [];
const nebulaBits = [];
const shapeCanvas = document.createElement("canvas");
const shapeCtx = shapeCanvas.getContext("2d", { willReadFrequently: true });

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function playBackgroundMusic() {
  if (!bgMusic) return;
  bgMusic.volume = 0.72;
  bgMusic.muted = false;
  bgMusic.play().catch(() => {});
}

function easeOutCubic(x) {
  return 1 - Math.pow(1 - clamp(x, 0, 1), 3);
}

function fitCanvas() {
  const rect = canvas.getBoundingClientRect();
  state.dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.floor(rect.width * state.dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * state.dpr));
  state.width = rect.width;
  state.height = rect.height;
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  retargetCurrentCue();
}

function readSavedConfig() {
  return {};
}

function saveConfig() {
  // Persistence is intentionally disabled. The page will not write to browser storage.
}

function applySavedConfig() {
}

function initStars() {
  stars.length = 0;
  for (let i = 0; i < 620; i += 1) {
    stars.push({
      x: Math.random(),
      y: Math.random(),
      z: rand(0.35, 1.7),
      twinkle: rand(0, Math.PI * 2),
      hue: [190, 205, 220, 42, 310][Math.floor(Math.random() * 5)],
    });
  }
}

function initMorphParticles() {
  morphParticles.length = 0;
  const cx = state.width * 0.5;
  const cy = state.height * 0.5;
  for (let i = 0; i < 15000; i += 1) {
    morphParticles.push({
      x: cx + rand(-90, 90),
      y: cy + rand(-70, 70),
      tx: cx,
      ty: cy,
      vx: rand(-2, 2),
      vy: rand(-2, 2),
      size: rand(1, 2.7),
      color: "rgba(116, 224, 255, 0.92)",
      alpha: rand(0.45, 1),
      jitter: rand(0, Math.PI * 2),
      cakePoint: null,
    });
  }
}

function initPhotoAssets() {
  photoImages.length = 0;
  for (const photo of photoSources) {
    const image = new Image();
    image.src = photo.src;
    photoImages.push(image);
  }
}

async function loadPhotoConfig() {
  try {
    const response = await fetch("./config/photos.json", { cache: "no-store" });
    if (!response.ok) return;
    const sources = await response.json();
    if (Array.isArray(sources) && sources.length > 0) {
      photoSources = sources
        .map((photo) => {
          if (typeof photo === "string" && photo.trim()) return { src: photo, rotate: 0 };
          if (!photo || typeof photo !== "object" || typeof photo.src !== "string" || !photo.src.trim()) return null;
          return {
            src: photo.src,
            rotate: Number.isFinite(photo.rotate) ? photo.rotate : 0,
          };
        })
        .filter(Boolean);
    }
  } catch (error) {
    // Keep the built-in photo list when local file restrictions block fetch.
  }
}

function initPhotoSphere() {
  photoCards.length = 0;
  nebulaBits.length = 0;
  const cardCount = photoSources.length;
  for (let i = 0; i < cardCount; i += 1) {
    const theta = i * 2.399963 + 0.34;
    const y = 1 - (i + 0.5) * 2 / cardCount;
    const radius = Math.sqrt(1 - y * y);
    photoCards.push({
      image: photoImages[i],
      rotate: photoSources[i]?.rotate || 0,
      x: Math.cos(theta) * radius,
      y: y * 0.82,
      z: Math.sin(theta) * radius,
      spin: rand(-0.18, 0.18),
      sx: 0,
      sy: 0,
      sw: 0,
      sh: 0,
    });
  }
  for (let i = 0; i < 2800; i += 1) {
    const theta = rand(0, Math.PI * 2);
    const y = rand(-0.95, 0.95);
    const outerDust = Math.random() > 0.82;
    const radius = Math.sqrt(1 - y * y) * (outerDust ? rand(1.06, 1.42) : rand(0.72, 1.08));
    nebulaBits.push({
      x: Math.cos(theta) * radius,
      y: y * rand(0.62, 1.05),
      z: Math.sin(theta) * radius,
      size: outerDust ? rand(0.28, 0.9) : rand(0.48, 1.85),
      hue: [186, 198, 218, 235, 172][Math.floor(Math.random() * 5)],
      alpha: outerDust ? rand(0.1, 0.38) : rand(0.22, 0.9),
      drift: rand(0, Math.PI * 2),
      outerDust,
    });
  }
}

function rotatePoint3D(point) {
  const cosY = Math.cos(state.sphereRotY);
  const sinY = Math.sin(state.sphereRotY);
  const cosX = Math.cos(state.sphereRotX);
  const sinX = Math.sin(state.sphereRotX);
  const x1 = point.x * cosY - point.z * sinY;
  const z1 = point.x * sinY + point.z * cosY;
  const y1 = point.y * cosX - z1 * sinX;
  const z2 = point.y * sinX + z1 * cosX;
  return { x: x1, y: y1, z: z2 };
}

function projectSpherePoint(point, radius) {
  const rotated = rotatePoint3D(point);
  const depth = 2.6 + rotated.z;
  const perspective = 1.8 / depth;
  return {
    x: state.width * 0.5 + rotated.x * radius * perspective,
    y: state.height * 0.52 + rotated.y * radius * perspective,
    z: rotated.z,
    scale: perspective,
  };
}

function assignPhotoExplosion() {
  const cx = state.width * 0.5;
  const cy = state.height * 0.5;
  for (const particle of morphParticles) {
    const angle = rand(0, Math.PI * 2);
    const distance = rand(Math.min(state.width, state.height) * 0.1, Math.max(state.width, state.height) * 0.72);
    particle.cakePoint = null;
    particle.tx = cx + Math.cos(angle) * distance;
    particle.ty = cy + Math.sin(angle) * distance;
    particle.vx += Math.cos(angle) * rand(8, 18);
    particle.vy += Math.sin(angle) * rand(8, 18);
    particle.color = Math.random() > 0.42 ? "rgba(218,248,255,0.9)" : "rgba(38,104,255,0.8)";
    particle.stageAlpha = rand(0.28, 0.88);
    particle.size = rand(0.45, 1.7);
  }
}

function drawPhotoExplosion(t) {
  updateMorphParticles(t, 0.004);
  drawMorphParticles(0.7);
  const glow = ctx.createRadialGradient(state.width * 0.5, state.height * 0.5, 10, state.width * 0.5, state.height * 0.5, Math.min(state.width, state.height) * 0.56);
  glow.addColorStop(0, "rgba(57, 240, 255, 0.24)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, state.width, state.height);
}

function drawPhotoCard(card, index, t, radius) {
  const p = projectSpherePoint(card, radius);
  const selected = state.selectedPhoto === index;
  const rawRatio = card.image?.naturalWidth && card.image?.naturalHeight ? card.image.naturalWidth / card.image.naturalHeight : 0.72;
  const imageRatio = Math.abs(card.rotate) % 180 === 90 ? 1 / rawRatio : rawRatio;
  const selectedLong = Math.min(Math.min(state.width, state.height) * 0.42, 330);
  const baseLong = selected ? selectedLong * state.selectedZoom : 120;
  const baseW = imageRatio >= 1 ? baseLong : baseLong * imageRatio;
  const baseH = imageRatio >= 1 ? baseLong / imageRatio : baseLong;
  const depthScale = selected ? 1 : clamp(p.scale * 1.2, 0.58, 1.28);
  const w = baseW * depthScale;
  const h = baseH * depthScale;
  card.sx = p.x - w / 2;
  card.sy = p.y - h / 2;
  card.sw = w;
  card.sh = h;
  ctx.save();
  ctx.globalAlpha = selected ? 1 : clamp(0.68 + p.z * 0.18, 0.42, 0.98);
  ctx.translate(p.x, p.y);
  ctx.rotate(selected ? 0 : card.spin + Math.sin(t * 0.001 + index) * 0.04);
  ctx.shadowColor = selected ? "rgba(95, 240, 255, 0.9)" : "rgba(42, 220, 245, 0.5)";
  ctx.shadowBlur = selected ? 22 : 10;
  ctx.fillStyle = "rgba(6, 18, 34, 0.88)";
  ctx.strokeStyle = selected ? "rgba(167, 252, 255, 0.95)" : "rgba(88, 230, 255, 0.64)";
  ctx.lineWidth = selected ? 3 : 1.5;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 4);
  ctx.fill();
  ctx.stroke();
  if (card.image?.complete && card.image.naturalWidth > 0) {
    const inset = selected ? 8 : 4;
    const imageW = w - inset * 2;
    const imageH = h - inset * 2;
    ctx.save();
    ctx.rotate((card.rotate * Math.PI) / 180);
    if (Math.abs(card.rotate) % 180 === 90) {
      ctx.drawImage(card.image, -imageH / 2, -imageW / 2, imageH, imageW);
    } else {
      ctx.drawImage(card.image, -imageW / 2, -imageH / 2, imageW, imageH);
    }
    ctx.restore();
  }
  ctx.restore();
}

function drawSphereShell(radius) {
  const cx = state.width * 0.5;
  const cy = state.height * 0.52;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  const rim = ctx.createRadialGradient(cx, cy, radius * 0.18, cx, cy, radius * 1.08);
  rim.addColorStop(0, "rgba(0, 0, 0, 0)");
  rim.addColorStop(0.55, "rgba(36, 214, 255, 0.035)");
  rim.addColorStop(0.86, "rgba(68, 238, 255, 0.085)");
  rim.addColorStop(1, "rgba(190, 255, 255, 0)");
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.03, 0, Math.PI * 2);
  ctx.fill();

  const drawProjectedRing = (points, alpha, width) => {
    ctx.strokeStyle = `rgba(124, 246, 255, ${alpha})`;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let i = 0; i <= points.length; i += 1) {
      const p = projectSpherePoint(points[i % points.length], radius);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  };

  for (const y of [-0.42, 0.38]) {
    const ring = [];
    const ringRadius = Math.sqrt(1 - y * y);
    for (let i = 0; i < 96; i += 1) {
      const a = (i / 96) * Math.PI * 2;
      ring.push({ x: Math.cos(a) * ringRadius, y, z: Math.sin(a) * ringRadius });
    }
    drawProjectedRing(ring, 0.075, 0.55);
  }

  for (const offset of [Math.PI / 4, Math.PI * 3 / 4]) {
    const ring = [];
    for (let i = 0; i < 96; i += 1) {
      const a = (i / 96) * Math.PI * 2;
      ring.push({
        x: Math.cos(offset) * Math.cos(a),
        y: Math.sin(a),
        z: Math.sin(offset) * Math.cos(a),
      });
    }
    drawProjectedRing(ring, 0.055, 0.5);
  }

  ctx.restore();
}

function drawPhotoSphere(t) {
  state.sphereRotY += state.dragging ? 0 : 0.0022;
  const radius = Math.min(state.width, state.height) * 0.42;
  const cx = state.width * 0.5;
  const cy = state.height * 0.52;
  const halo = ctx.createRadialGradient(cx, cy, radius * 0.06, cx, cy, radius * 1.08);
  halo.addColorStop(0, "rgba(54, 236, 255, 0.14)");
  halo.addColorStop(0.48, "rgba(24, 83, 255, 0.045)");
  halo.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, state.width, state.height);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const bit of nebulaBits) {
    const p = projectSpherePoint({
      x: bit.x + Math.sin(t * 0.0004 + bit.drift) * 0.04,
      y: bit.y,
      z: bit.z + Math.cos(t * 0.0005 + bit.drift) * 0.04,
    }, radius);
    ctx.globalAlpha = clamp(bit.alpha * (0.48 + p.scale * 0.55), 0.08, 0.96);
    ctx.fillStyle = `hsla(${bit.hue}, 95%, 68%, 1)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, bit.size * clamp(p.scale, 0.48, 1.35), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  const ordered = photoCards.map((card, index) => ({ card, index, z: rotatePoint3D(card).z })).sort((a, b) => a.z - b.z);
  for (const item of ordered) {
    if (item.index !== state.selectedPhoto) drawPhotoCard(item.card, item.index, t, radius);
  }
  if (state.selectedPhoto >= 0) drawPhotoCard(photoCards[state.selectedPhoto], state.selectedPhoto, t, radius);
}

function drawBackground(t) {
  const w = state.width;
  const h = state.height;
  const noir = state.tone === "noir";
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, noir ? "#050505" : "#090714");
  bg.addColorStop(0.48, noir ? "#111" : "#070b18");
  bg.addColorStop(1, noir ? "#030303" : "#130a13");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w * 0.5, h * 0.5, 20, w * 0.5, h * 0.48, Math.min(w, h) * 0.68);
  glow.addColorStop(0, noir ? "rgba(255,255,255,.12)" : "rgba(26,219,232,.15)");
  glow.addColorStop(0.45, noir ? "rgba(255,255,255,.04)" : "rgba(55,122,255,.08)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  for (const star of stars) {
    const drift = Math.sin(t * 0.00016 * star.z + star.twinkle) * 18;
    const x = (star.x * w + drift + w) % w;
    const y = star.y * h;
    const a = 0.2 + Math.sin(t * 0.002 + star.twinkle) * 0.18 + star.z * 0.15;
    ctx.fillStyle = noir ? `rgba(240,240,240,${clamp(a * 0.6, 0.05, 0.6)})` : `hsla(${star.hue}, 90%, 74%, ${clamp(a, 0.08, 0.82)})`;
    ctx.fillRect(x, y, star.z * 1.2, star.z * 1.2);
  }
}

function drawIntroAura(t) {
  const cx = state.width * 0.5;
  const cy = state.height * 0.5;
  const power = 0.7 + Math.sin(t * 0.002) * 0.18;
  for (let i = 0; i < 240; i += 1) {
    const a = i * 0.34 + t * 0.00022;
    const r = 44 + (i % 60) * 2.6 + Math.sin(t * 0.001 + i) * 20;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a * 0.74) * r * 0.42;
    ctx.fillStyle = `rgba(83, 239, 247, ${0.05 + power * 0.1})`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }
}

function sampleCanvasPoints(step = 5, tint = null) {
  const points = [];
  const { width, height } = shapeCanvas;
  const data = shapeCtx.getImageData(0, 0, width, height).data;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      if (data[i + 3] > 36) {
        points.push({
          x,
          y,
          color: tint || `rgba(${data[i]},${data[i + 1]},${data[i + 2]},0.94)`,
        });
      }
    }
  }
  return points;
}

function buildTextPoints(text, fontSize, maxWidthRatio = 0.82, fontWeight = 900, sampleStep = 3, shadowBlur = 18) {
  const w = 1000;
  const h = 420;
  shapeCanvas.width = w;
  shapeCanvas.height = h;
  shapeCtx.clearRect(0, 0, w, h);
  let size = fontSize;
  shapeCtx.textAlign = "center";
  shapeCtx.textBaseline = "middle";
  do {
    shapeCtx.font = `${fontWeight} ${size}px Microsoft YaHei, PingFang SC, sans-serif`;
    size -= 4;
  } while (shapeCtx.measureText(text).width > w * maxWidthRatio && size > 34);
  shapeCtx.shadowColor = "rgba(66, 229, 255, 0.8)";
  shapeCtx.shadowBlur = shadowBlur;
  shapeCtx.fillStyle = "#8eeeff";
  shapeCtx.fillText(text, w / 2, h / 2);
  shapeCtx.shadowBlur = 0;
  return sampleCanvasPoints(text.length === 1 ? 2 : sampleStep).map((p) => ({
    dx: p.x - w / 2,
    dy: p.y - h / 2,
    color: p.color,
  }));
}

function buildCakePoints() {
  const points = [];
  const addEllipse = (cx, cy, rx, ry, count, palette) => {
    for (let i = 0; i < count; i += 1) {
      const a = rand(0, Math.PI * 2);
      const r = Math.sqrt(Math.random());
      const edge = Math.random() > 0.68;
      const rr = edge ? 0.82 + Math.random() * 0.22 : r;
      points.push({
        nx: cx + Math.cos(a) * rx * rr,
        ny: cy + Math.sin(a) * ry * rr,
        color: palette[Math.floor(Math.random() * palette.length)],
      });
    }
  };

  const addRect = (cx, cy, width, height, count, palette) => {
    for (let i = 0; i < count; i += 1) {
      const x = cx + rand(-width / 2, width / 2);
      const y = cy + rand(-height / 2, height / 2);
      const sparkle = Math.random() > 0.82;
      points.push({
        nx: x,
        ny: y,
        color: sparkle ? "rgba(255,255,255,0.98)" : palette[Math.floor(Math.random() * palette.length)],
      });
    }
  };

  const blue = ["rgba(13,42,190,0.96)", "rgba(25,87,232,0.92)", "rgba(65,210,255,0.96)", "rgba(180,248,255,0.98)", "rgba(255,255,255,0.92)"];
  const white = ["rgba(255,255,255,0.98)", "rgba(196,250,255,0.96)", "rgba(80,224,255,0.9)"];
  const edgeWhite = ["rgba(255,255,255,0.98)", "rgba(210,252,255,0.98)", "rgba(106,238,255,0.95)"];
  const shadowBlue = ["rgba(10,28,150,0.86)", "rgba(22,62,205,0.86)", "rgba(36,126,255,0.78)"];

  const pushPoint = (nx, ny, color, role = "cake") => {
    points.push({ nx, ny, color, role });
  };

  const addArc = (cx, cy, rx, ry, count, palette, start = 0, end = Math.PI * 2, role = "edge") => {
    for (let i = 0; i < count; i += 1) {
      const a = start + (end - start) * Math.random();
      pushPoint(
        cx + Math.cos(a) * rx + rand(-0.01, 0.01),
        cy + Math.sin(a) * ry + rand(-0.008, 0.008),
        palette[Math.floor(Math.random() * palette.length)],
        role,
      );
    }
  };

  const addCakeLayer = ({ cx, top, width, height, topRy, bodyCount, topCount, bottomCount, palette }) => {
    const bottom = top + height;
    const rx = width / 2;
    for (let i = 0; i < bodyCount; i += 1) {
      const y = rand(top, bottom);
      const t = (y - top) / height;
      const sideCurve = Math.sin(t * Math.PI) * topRy * 0.28;
      const localRx = rx * (0.92 + Math.sin(t * Math.PI) * 0.06);
      const x = cx + rand(-localRx, localRx);
      const edgeBoost = Math.abs(x - cx) / localRx;
      const sparkle = Math.random() > 0.82 || edgeBoost > 0.92;
      const color = sparkle ? edgeWhite[Math.floor(Math.random() * edgeWhite.length)] : palette[Math.floor(Math.random() * palette.length)];
      pushPoint(x, y + sideCurve * 0.18, color, edgeBoost > 0.9 ? "edge" : "cake");
    }

    addEllipse(cx, top, rx * 0.98, topRy, topCount, palette);
    addArc(cx, top, rx, topRy, Math.floor(topCount * 0.42), edgeWhite, Math.PI * 0.05, Math.PI * 0.95, "edge");
    addArc(cx, top, rx, topRy, Math.floor(topCount * 0.24), shadowBlue, Math.PI * 1.05, Math.PI * 1.95, "cake");
    addArc(cx, bottom, rx * 0.96, topRy * 0.72, bottomCount, edgeWhite, Math.PI * 0.04, Math.PI * 0.96, "edge");
    addArc(cx, bottom, rx * 0.98, topRy * 0.78, Math.floor(bottomCount * 0.45), shadowBlue, Math.PI * 1.05, Math.PI * 1.95, "cake");

    for (let i = 0; i < 160; i += 1) {
      const side = Math.random() > 0.5 ? -1 : 1;
      const y = rand(top + topRy * 0.25, bottom - topRy * 0.1);
      pushPoint(cx + side * rx * rand(0.9, 1.03), y, edgeWhite[Math.floor(Math.random() * edgeWhite.length)], "edge");
    }
  };

  addCakeLayer({ cx: 0, top: 0.13, width: 1.03, height: 0.38, topRy: 0.12, bodyCount: 1850, topCount: 1280, bottomCount: 900, palette: blue });
  addCakeLayer({ cx: 0, top: -0.18, width: 0.74, height: 0.32, topRy: 0.105, bodyCount: 1500, topCount: 1080, bottomCount: 760, palette: white });
  addCakeLayer({ cx: 0, top: -0.46, width: 0.48, height: 0.27, topRy: 0.085, bodyCount: 1050, topCount: 820, bottomCount: 560, palette: blue });

  addRect(0, -0.43, 0.38, 0.035, 260, edgeWhite);
  addRect(0, -0.15, 0.64, 0.04, 320, blue);
  addRect(0, 0.16, 0.92, 0.045, 400, edgeWhite);

  return points;
}

function drawStar(targetCtx, x, y, outer, inner) {
  targetCtx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? outer : inner;
    targetCtx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  targetCtx.closePath();
}

function drawSpinningStar3D(t, x, y, size) {
  const phase = t * 0.0032;
  const turn = Math.cos(phase);
  const side = Math.sin(phase);
  const faceScale = 0.26 + Math.abs(turn) * 0.74;
  const depth = size * 0.22 * side;

  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = "rgba(255, 211, 86, 0.86)";
  ctx.shadowBlur = 14;

  ctx.save();
  ctx.translate(depth, size * 0.06);
  ctx.scale(faceScale, 1);
  drawStar(ctx, 0, 0, size, size * 0.48);
  ctx.fillStyle = side >= 0 ? "#c78a23" : "#f2b941";
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(-depth * 0.35, 0);
  ctx.scale(faceScale, 1);
  drawStar(ctx, 0, 0, size, size * 0.48);
  ctx.fillStyle = "#ffd65a";
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(1, size * 0.08);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.82)";
  ctx.stroke();
  drawStar(ctx, -size * 0.12, -size * 0.16, size * 0.3, size * 0.14);
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

function getCakeLayout(progress) {
  const eased = easeOutCubic(progress);
  const zoom = Math.min(state.width, state.height) * (0.08 + eased * 0.4);
  return {
    eased,
    zoom,
    cx: state.width * 0.5,
    cy: state.height * (0.58 + (1 - eased) * 0.015),
  };
}

function drawCakeEntities(t, progress) {
  const { zoom, cx, cy } = getCakeLayout(progress);
  const header = `${birthdayMessage} ${birthdayName}`.trim();
  let titleSize = clamp(zoom * 0.16, 18, 68);
  const titleY = cy - zoom * 0.98;
  const titleWidth = Math.min(state.width * 0.72, zoom * 1.38);

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${titleSize}px Microsoft YaHei, PingFang SC, sans-serif`;
  const measured = ctx.measureText(header).width;
  if (measured > titleWidth) {
    titleSize *= titleWidth / measured;
    ctx.font = `600 ${titleSize}px Microsoft YaHei, PingFang SC, sans-serif`;
  }
  ctx.shadowColor = "rgba(31, 238, 246, 0.8)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "rgba(124, 246, 255, 0.96)";
  ctx.fillText(header, cx, titleY);
  ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(1, titleSize * 0.035);
  ctx.strokeStyle = "rgba(16, 114, 132, 0.52)";
  ctx.strokeText(header, cx, titleY + titleSize * 0.04);
  ctx.restore();

  const starSize = clamp(zoom * 0.065, 12, 28);
  drawSpinningStar3D(t, cx - zoom * 0.01, cy - zoom * 0.62, starSize);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.translate(cx, cy + zoom * 0.22);
  ctx.rotate(Math.sin(t * 0.0008) * 0.04);
  ctx.strokeStyle = "rgba(178, 252, 255, 0.42)";
  ctx.lineWidth = clamp(zoom * 0.006, 1, 2.5);
  ctx.beginPath();
  ctx.ellipse(0, 0, zoom * 0.58, zoom * 0.105, 0, Math.PI * 0.06, Math.PI * 0.94);
  ctx.stroke();
  ctx.strokeStyle = "rgba(60, 212, 255, 0.18)";
  ctx.beginPath();
  ctx.ellipse(0, 0, zoom * 0.6, zoom * 0.112, 0, Math.PI * 1.05, Math.PI * 1.92);
  ctx.stroke();
  ctx.restore();
}

function assignTextShape(text, fontSize, scatter = true) {
  const isCountdown = text.length === 1;
  const isGreeting = text === "生日快乐";
  const points = buildTextPoints(text, fontSize, 0.82, isGreeting ? 500 : 900, isGreeting ? 2 : 3, isGreeting ? 2 : 18);
  const scale = Math.min(state.width / 1000, state.height / 520);
  const cx = state.width * 0.5;
  const cy = state.height * 0.48;
  state.stageCue = `text:${text}`;
  for (let i = 0; i < morphParticles.length; i += 1) {
    const particle = morphParticles[i];
    const point = points[i % points.length];
    particle.cakePoint = null;
    particle.tx = cx + point.dx * scale + rand(-1.5, 1.5);
    particle.ty = cy + point.dy * scale + rand(-1.5, 1.5);
    particle.role = isCountdown ? "countdown" : "text";
    particle.stageAlpha = isCountdown ? rand(0.72, 1) : isGreeting ? rand(0.82, 1) : rand(0.62, 0.94);
    particle.color = isCountdown ? "rgba(132, 235, 255, 0.92)" : point.color;
    particle.size = isCountdown ? rand(0.72, 1.58) : isGreeting ? rand(0.46, 1.08) : rand(0.85, 2.05);
    if (scatter) {
      const a = rand(0, Math.PI * 2);
      particle.vx += Math.cos(a) * rand(3, 10);
      particle.vy += Math.sin(a) * rand(3, 10);
    }
  }
}

function assignScatter() {
  state.stageCue = "scatter";
  for (const particle of morphParticles) {
    particle.cakePoint = null;
    particle.tx = rand(0, state.width);
    particle.ty = rand(0, state.height);
    particle.vx += rand(-10, 10);
    particle.vy += rand(-10, 10);
    particle.color = Math.random() > 0.55 ? "rgba(220,250,255,0.72)" : "rgba(112,222,255,0.64)";
    particle.stageAlpha = rand(0.35, 0.72);
    particle.size = rand(0.6, 1.8);
  }
}

function assignCakeShape() {
  const cakePoints = buildCakePoints();
  state.stageCue = "cake";
  state.cakeProgress = 0;
  for (let i = 0; i < morphParticles.length; i += 1) {
    const particle = morphParticles[i];
    particle.cakePoint = cakePoints[i % cakePoints.length];
    particle.color = particle.cakePoint.color;
    particle.role = particle.cakePoint.role || "cake";
    particle.stageAlpha = 1;
    particle.size = particle.role === "edge" ? rand(0.62, 1.35) : rand(0.72, 1.95);
    particle.vx += rand(-8, 8);
    particle.vy += rand(-8, 8);
  }
}

function retargetCurrentCue() {
  if (!morphParticles.length) return;
  if (state.stageCue.startsWith("text:")) {
    const text = state.stageCue.slice(5);
    assignTextShape(text, text.length === 1 ? 280 : text === "生日快乐" ? 132 : 155, false);
  }
}

function updateCakeTargets(progress, t = performance.now()) {
  const { zoom, cx, cy } = getCakeLayout(progress);
  const breathe = 1 + Math.sin(t * 0.0014) * 0.018;
  const floatY = Math.sin(t * 0.0011) * zoom * 0.01;
  const roll = Math.sin(t * 0.00062) * 0.018;
  const pitch = Math.sin(t * 0.00048) * 0.014;
  const cos = Math.cos(roll);
  const sin = Math.sin(roll);
  for (const particle of morphParticles) {
    if (!particle.cakePoint) continue;
    const baseX = particle.cakePoint.nx * zoom * breathe;
    const baseY = particle.cakePoint.ny * zoom * (1 - pitch);
    particle.tx = cx + baseX * cos - baseY * sin;
    particle.ty = cy + baseX * sin + baseY * cos + floatY;
    particle.stageAlpha = particle.cakePoint.role === "edge" ? 1 : 0.92 + Math.sin(t * 0.0022 + particle.jitter) * 0.08;
  }
}

function updateMorphParticles(t, attract = 0.019) {
  for (const p of morphParticles) {
    const wobble = Math.sin(t * 0.004 + p.jitter) * 0.55;
    p.vx = (p.vx + (p.tx - p.x) * attract + wobble * 0.015) * 0.84;
    p.vy = (p.vy + (p.ty - p.y) * attract) * 0.84;
    p.x += p.vx;
    p.y += p.vy;
  }
}

function drawMorphParticles(alpha = 1) {
  ctx.save();
  ctx.globalCompositeOperation = state.stage === "countdown" ? "source-over" : "lighter";
  for (const p of morphParticles) {
    const flicker = state.stageCue === "cake" ? 0.74 + Math.sin(performance.now() * 0.006 + p.jitter) * 0.22 + (Math.random() > 0.985 ? 0.55 : 0) : 1;
    const stageAlpha = p.stageAlpha ?? 1;
    ctx.globalAlpha = clamp(p.alpha * stageAlpha * alpha * flicker, 0, state.stage === "countdown" ? 0.9 : 1);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function launchGift() {
  if (state.stage !== "intro") return;
  playBackgroundMusic();
  document.body.classList.add("gift-started");
  document.body.classList.remove("gift-ready", "photo-sphere-active", "cake-ready-active");
  state.stage = "countdown";
  state.timelineStart = performance.now();
  state.stageCue = "";
  state.selectedPhoto = -1;
  state.selectedZoom = 1;
  statusEl.textContent = "5 秒慢速粒子倒计时开始";
  assignTextShape("5", 280, true);
}

function restartGift() {
  fireworks.length = 0;
  rockets.length = 0;
  document.body.classList.remove("gift-ready", "photo-sphere-active", "cake-ready-active");
  state.stage = "intro";
  state.stageCue = "";
  startGiftBtn.style.display = "";
  statusEl.textContent = "点击开启礼物，进入生日星河";
}

function updateTimeline(t) {
  if (state.stage === "intro") {
    drawIntroAura(t);
    return;
  }

  const elapsed = (t - state.timelineStart) / 1000;
  if (state.stage === "photoExplode") {
    drawPhotoExplosion(t);
    if (elapsed > 1.15) {
      state.stage = "photoSphere";
      document.body.classList.add("gift-ready", "photo-sphere-active");
      statusEl.textContent = "拖动旋转照片星球，点击照片放大";
    }
    return;
  }

  if (state.stage === "photoSphere") {
    drawPhotoSphere(t);
    return;
  }

  if (elapsed < 7.05) {
    state.stage = "countdown";
    const digit = String(Math.max(1, 5 - Math.floor(elapsed / 1.4)));
    if (state.stageCue !== `text:${digit}`) {
      statusEl.textContent = `${digit}...`;
      assignTextShape(digit, 280, true);
    }
    updateMorphParticles(t, 0.021);
    drawMorphParticles(1);
    return;
  }

  if (elapsed < 9.15) {
    state.stage = "birthdayText";
    if (state.stageCue !== "text:生日快乐") {
      statusEl.textContent = "生日快乐";
      assignTextShape("生日快乐", 132, true);
    }
    updateMorphParticles(t, 0.019);
    drawMorphParticles(1);
    return;
  }

  if (elapsed < 12.85) {
    state.stage = "fireworks";
    if (state.stageCue !== "scatter") {
      statusEl.textContent = "烟花升空";
      assignScatter();
      for (let i = 0; i < 4; i += 1) spawnRocket(t + i * 90);
    }
    if (Math.random() < 0.055 * sparkMultiplier) spawnRocket(t);
    updateMorphParticles(t, 0.004);
    drawMorphParticles(0.38);
    updateFireworks(t);
    return;
  }

  state.stage = "cake";
  if (state.stageCue !== "cake") {
    statusEl.textContent = "蛋糕正在靠近";
    assignCakeShape();
  }
  const progress = clamp((elapsed - 12.85) / 5.2, 0, 1);
  state.cakeProgress = progress;
  updateCakeTargets(progress, t);
  updateMorphParticles(t, 0.034 + progress * 0.03);
  drawMorphParticles(1);
  drawCakeEntities(t, progress);
  if (progress >= 0.985) {
    document.body.classList.add("gift-ready");
    document.body.classList.add("cake-ready-active");
    statusEl.textContent = "生日蛋糕已抵达";
  }
}

function scatterToPhotoWall() {
  if (state.stage !== "cake") return;
  document.body.classList.remove("cake-ready-active", "gift-ready");
  state.stage = "photoExplode";
  state.stageCue = "";
  state.timelineStart = performance.now();
  state.selectedPhoto = -1;
  state.selectedZoom = 1;
  statusEl.textContent = "蛋糕散开为照片墙";
  assignPhotoExplosion();
}

function spawnRocket(t) {
  rockets.push({
    x: rand(state.width * 0.12, state.width * 0.88),
    y: state.height + rand(20, 80),
    targetY: rand(state.height * 0.16, state.height * 0.58),
    vy: rand(-8.8, -13.5),
    color: Math.random() > 0.45 ? "#dff9ff" : "#74e5ff",
    trail: [],
    born: t,
  });
}

function explodeFirework(x, y, color) {
  const count = Math.floor(rand(110, 190) * sparkMultiplier);
  for (let i = 0; i < count; i += 1) {
    const a = rand(0, Math.PI * 2);
    const speed = rand(1.2, 8.2);
    fireworks.push({
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life: rand(70, 130),
      age: 0,
      size: rand(0.8, 2.8),
      color: Math.random() > 0.34 ? color : "#ffffff",
      rain: Math.random() > 0.78,
    });
  }
}

function updateFireworks(t) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = rockets.length - 1; i >= 0; i -= 1) {
    const r = rockets[i];
    r.trail.push({ x: r.x, y: r.y });
    if (r.trail.length > 20) r.trail.shift();
    r.y += r.vy;
    r.vy += 0.05;
    ctx.strokeStyle = "rgba(210,248,255,.42)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let j = 0; j < r.trail.length; j += 1) {
      const p = r.trail[j];
      if (j === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.fillStyle = r.color;
    ctx.beginPath();
    ctx.arc(r.x, r.y, 3, 0, Math.PI * 2);
    ctx.fill();
    if (r.y <= r.targetY || r.vy >= -1) {
      explodeFirework(r.x, r.y, r.color);
      rockets.splice(i, 1);
    }
  }

  for (let i = fireworks.length - 1; i >= 0; i -= 1) {
    const f = fireworks[i];
    f.age += 1;
    f.x += f.vx;
    f.y += f.vy;
    f.vx *= 0.986;
    f.vy = f.vy * 0.986 + (f.rain ? 0.08 : 0.035);
    const a = 1 - f.age / f.life;
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = f.color;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.size * (0.8 + a), 0, Math.PI * 2);
    ctx.fill();
    if (f.rain && f.age % 2 === 0) {
      ctx.fillRect(f.x, f.y + 4, 1, 10);
    }
    if (f.age >= f.life) fireworks.splice(i, 1);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function render(t = 0) {
  drawBackground(t);
  updateTimeline(t);
  requestAnimationFrame(render);
}

function mergeToCake() {
  if (state.stage !== "photoSphere") return;
  document.body.classList.add("gift-started");
  document.body.classList.remove("photo-sphere-active", "gift-ready", "cake-ready-active");
  state.stage = "cake";
  state.stageCue = "";
  state.selectedPhoto = -1;
  state.selectedZoom = 1;
  state.timelineStart = performance.now() - 12850;
  assignCakeShape();
  statusEl.textContent = "照片星球正在聚合成蛋糕";
}

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function findPhotoAt(x, y) {
  for (let i = photoCards.length - 1; i >= 0; i -= 1) {
    const card = photoCards[i];
    if (x >= card.sx && x <= card.sx + card.sw && y >= card.sy && y <= card.sy + card.sh) return i;
  }
  return -1;
}

function beginSphereDrag(event) {
  if (state.stage !== "photoSphere") return;
  const point = getCanvasPoint(event);
  state.dragging = true;
  state.dragMoved = false;
  state.dragX = point.x;
  state.dragY = point.y;
  canvas.setPointerCapture?.(event.pointerId);
}

function moveSphereDrag(event) {
  if (!state.dragging || state.stage !== "photoSphere") return;
  const point = getCanvasPoint(event);
  const dx = point.x - state.dragX;
  const dy = point.y - state.dragY;
  if (Math.abs(dx) + Math.abs(dy) > 3) state.dragMoved = true;
  state.sphereRotY += dx * 0.006;
  state.sphereRotX = clamp(state.sphereRotX - dy * 0.004, -0.7, 0.7);
  state.dragX = point.x;
  state.dragY = point.y;
}

function endSphereDrag(event) {
  if (!state.dragging || state.stage !== "photoSphere") return;
  const point = getCanvasPoint(event);
  canvas.releasePointerCapture?.(event.pointerId);
  state.dragging = false;
  if (state.dragMoved) return;
  const hit = findPhotoAt(point.x, point.y);
  if (hit >= 0) {
    state.selectedPhoto = state.selectedPhoto === hit ? -1 : hit;
    state.selectedZoom = 1.12;
  } else {
    state.selectedPhoto = -1;
    state.selectedZoom = 1;
  }
}

function zoomSelectedPhoto(event) {
  if (state.stage !== "photoSphere" || state.selectedPhoto < 0) return;
  event.preventDefault();
  state.selectedZoom = clamp(state.selectedZoom + (event.deltaY < 0 ? 0.14 : -0.14), 0.72, 2.15);
}

function bindEvents() {
  startGiftBtn.addEventListener("click", launchGift);
  document.addEventListener("pointerdown", playBackgroundMusic, { once: true });
  document.addEventListener("keydown", playBackgroundMusic, { once: true });
  photoWallBtn.addEventListener("click", scatterToPhotoWall);
  cakeMergeBtn.addEventListener("click", mergeToCake);
  canvas.addEventListener("pointerdown", beginSphereDrag);
  canvas.addEventListener("pointermove", moveSphereDrag);
  canvas.addEventListener("pointerup", endSphereDrag);
  canvas.addEventListener("pointercancel", () => { state.dragging = false; });
  canvas.addEventListener("wheel", zoomSelectedPhoto, { passive: false });
}

window.addEventListener("resize", fitCanvas);

async function startApp() {
  applySavedConfig();
  fitCanvas();
  initStars();
  initMorphParticles();
  await loadPhotoConfig();
  initPhotoAssets();
  initPhotoSphere();
  bindEvents();
  requestAnimationFrame(render);
}

startApp();
