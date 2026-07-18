// ID page compositing — builds a single canvas combining the template
// artwork, the user's uploaded photo, and their entered text fields. The
// result is handed to main.js, which applies it as a live texture on the
// passport model's ID page mesh. Pure canvas/image work only — no DOM form
// concerns live here.
//
// Two-canvas pipeline: everything is composed on a "design" canvas in the
// template artwork's natural upright orientation (as assets/id_template.png
// itself reads), then that design is drawn onto a "texture" canvas rotated
// by TEXTURE_ROTATION — the ID page's UV layout on the 3D model expects the
// artwork rotated relative to how it reads as a flat image.

// Degrees clockwise to rotate the finished design before it becomes the
// GPU texture. Flip to -90 if the page renders upside down in 3D.
const TEXTURE_ROTATION = -90;

// Slot geometry on assets/id_template.png, expressed as fractions of the
// template's own natural width/height so layout scales with the template's
// resolution regardless of the asset's actual pixel size. Positions are
// VALUE baselines — the template artwork already prints the labels (Type,
// Username, Sex, Role, Date of Birth); we only draw the user's entered
// values next to them. Calibrated against the printed label positions in
// assets/id_template.png (each value sits in the gap below its label and
// above the next) — re-tune if the label layout changes.
//
// `columnEnd` is how far (as a template-width fraction) the value may run
// before truncating with an ellipsis, so a long value can't bleed into the
// neighboring column.
const LAYOUT = {
  photo: { x: 0.033, y: 0.175, w: 0.215, h: 0.24 }, // upper-left slot
  type: { x: 0.246, y: 0.181, size: 0.03, columnEnd: 0.49 }, // "B" value under Type label
  username: { x: 0.246, y: 0.24, size: 0.03, columnEnd: 0.49 },
  sex: { x: 0.246, y: 0.3044, size: 0.03, columnEnd: 0.49 },
  role: { x: 0.246, y: 0.368, size: 0.03, columnEnd: 0.49 },
  dob: { x: 0.5, y: 0.176, size: 0.03, columnEnd: 0.98 },
  mrz1: { x: 0.02, y: 0.545, size: 0.058 },
  mrz2: { x: 0.02, y: 0.626, size: 0.058 },
};

const TYPE_VALUE = "B";

const TEXT_COLOR = "#2b2416"; // dark ink
const VALUE_FONT_STACK = '"Helvetica Neue", Arial, sans-serif'; // bold sans for values
const MRZ_FONT_STACK = '"Courier New", "DejaVu Sans Mono", monospace'; // passport-like monospace
const TEMPLATE_URL = "assets/id_template.png";
// Longest edge, in pixels, an uploaded photo is downscaled to before any
// compositing work — phone-camera photos are routinely 4000px+ on a side,
// far more detail than a small ID photo slot can show.
const MAX_PHOTO_EDGE = 1500;

let templateImagePromise = null;

function loadTemplateImage() {
  if (!templateImagePromise) {
    templateImagePromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load ${TEMPLATE_URL}`));
      img.src = TEMPLATE_URL;
    });
  }
  return templateImagePromise;
}

// Loads a File into a drawable image — an ImageBitmap where supported,
// otherwise an HTMLImageElement via FileReader — downscaled so its longest
// edge is at most MAX_PHOTO_EDGE.
export async function loadPhotoFromFile(file) {
  if (!file || !file.type || !file.type.startsWith("image/")) {
    throw new Error("That file isn't an image.");
  }

  let rawImage;
  try {
    rawImage =
      "createImageBitmap" in window
        ? await createImageBitmap(file)
        : await loadImageViaFileReader(file);
  } catch (error) {
    throw new Error("Couldn't read that photo — try a different file.");
  }

  return downscaleIfNeeded(rawImage);
}

function loadImageViaFileReader(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("That file isn't a readable image."));
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function downscaleIfNeeded(image) {
  const width = image.width;
  const height = image.height;
  const longEdge = Math.max(width, height);
  if (longEdge <= MAX_PHOTO_EDGE) return image;

  const scale = MAX_PHOTO_EDGE / longEdge;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas; // a <canvas> is itself drawable via ctx.drawImage, same as the original
}

// Cover-fits `image` into the rect (x, y, w, h): fills the whole rect,
// preserves aspect ratio, crops overflow, never stretches.
function drawCoverFit(ctx, image, x, y, w, h) {
  const imgW = image.width;
  const imgH = image.height;
  const targetRatio = w / h;
  const imgRatio = imgW / imgH;

  let sx, sy, sw, sh;
  if (imgRatio > targetRatio) {
    // image is relatively wider than the slot — crop its left/right edges
    sh = imgH;
    sw = imgH * targetRatio;
    sx = (imgW - sw) / 2;
    sy = 0;
  } else {
    // image is relatively taller than the slot — crop its top/bottom edges
    sw = imgW;
    sh = imgW / targetRatio;
    sx = 0;
    sy = (imgH - sh) / 2;
  }

  ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
}

// Draws `text` at (x, y) at the given font size using `fontStack`,
// truncating with an ellipsis (via measureText) if it would exceed
// maxWidth.
function drawValueText(ctx, text, x, y, size, maxWidth, fontStack) {
  ctx.font = `bold ${size}px ${fontStack}`;
  ctx.fillStyle = TEXT_COLOR;
  ctx.textBaseline = "alphabetic";

  let display = text;
  if (ctx.measureText(display).width > maxWidth) {
    const ellipsis = "…";
    while (display.length > 0 && ctx.measureText(display + ellipsis).width > maxWidth) {
      display = display.slice(0, -1);
    }
    display += ellipsis;
  }

  ctx.fillText(display, x, y);
}

// Draws a LAYOUT value field (fractions of the template's natural size)
// onto the design canvas, capped to its column so it can't run into the
// neighboring field.
function drawField(ctx, text, layout, templateWidth, templateHeight) {
  const x = layout.x * templateWidth;
  const y = layout.y * templateHeight;
  const size = layout.size * templateWidth;
  const maxWidth = layout.columnEnd * templateWidth - x;
  drawValueText(ctx, text, x, y, size, maxWidth, VALUE_FONT_STACK);
}

// Appends "<" to `prefix` until the next one would overflow `maxWidth`, per
// ICAO MRZ filler-character convention. Assumes ctx.font is already set.
function padMRZ(ctx, prefix, maxWidth) {
  let line = prefix;
  while (ctx.measureText(line + "<").width <= maxWidth) {
    line += "<";
  }
  return line;
}

function drawMRZLine(ctx, prefix, layout, templateWidth, templateHeight) {
  const x = layout.x * templateWidth;
  const y = layout.y * templateHeight;
  const size = layout.size * templateWidth;
  const maxWidth = templateWidth * (1 - 2 * layout.x);

  ctx.font = `${size}px ${MRZ_FONT_STACK}`;
  ctx.fillStyle = TEXT_COLOR;
  ctx.textBaseline = "alphabetic";

  ctx.fillText(padMRZ(ctx, prefix, maxWidth), x, y);
}

// "2025-04-03" -> "03 Apr 2025". Parsed as plain date components (not
// through the UTC-shifting Date(string) constructor) so the displayed day
// never drifts from what the date picker showed.
function formatDOBDisplay(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// "2025-04-03" -> "03042025", the DDMMYYYY form MRZ line 2 fills from.
function formatDOBForMRZ(isoDate) {
  const [year, month, day] = isoDate.split("-");
  return `${day}${month}${year}`;
}

// Rotates `sourceCanvas` by ±90 degrees onto a freshly created canvas and
// returns it. Only ±90 is supported — TEXTURE_ROTATION is a UV-orientation
// fix, not a general design knob.
function rotateCanvas90(sourceCanvas, degreesClockwise) {
  const rotated = document.createElement("canvas");
  rotated.width = sourceCanvas.height;
  rotated.height = sourceCanvas.width;
  const ctx = rotated.getContext("2d");

  if (degreesClockwise === 90) {
    ctx.translate(rotated.width, 0);
    ctx.rotate(Math.PI / 2);
  } else if (degreesClockwise === -90) {
    ctx.translate(0, rotated.height);
    ctx.rotate(-Math.PI / 2);
  } else {
    throw new Error(`rotateCanvas90 only supports ±90 degrees, got ${degreesClockwise}`);
  }

  ctx.drawImage(sourceCanvas, 0, 0);
  return rotated;
}

// Builds the design canvas — the template, photo, and text fields composed
// in the artwork's natural upright orientation — then rotates it into the
// final texture canvas. Callers pass the result straight to a
// THREE.CanvasTexture.
export async function buildIDTexture({ username, sex, role, dob, photoImage }) {
  const template = await loadTemplateImage();

  const design = document.createElement("canvas");
  design.width = template.naturalWidth;
  design.height = template.naturalHeight;
  const ctx = design.getContext("2d");
  const w = design.width;
  const h = design.height;

  ctx.drawImage(template, 0, 0, w, h);

  if (photoImage) {
    const { photo } = LAYOUT;
    drawCoverFit(ctx, photoImage, photo.x * w, photo.y * h, photo.w * w, photo.h * h);
  }

  drawField(ctx, TYPE_VALUE, LAYOUT.type, w, h);

  if (username) {
    drawField(ctx, username.toUpperCase(), LAYOUT.username, w, h);
  }
  if (sex) {
    drawField(ctx, sex.toUpperCase(), LAYOUT.sex, w, h);
  }
  if (role) {
    drawField(ctx, role.toUpperCase(), LAYOUT.role, w, h);
  }
  if (dob) {
    drawField(ctx, formatDOBDisplay(dob), LAYOUT.dob, w, h);
  }

  if (username) {
    drawMRZLine(ctx, `B<${username.toLowerCase()}`, LAYOUT.mrz1, w, h);
  }
  if (dob) {
    drawMRZLine(ctx, formatDOBForMRZ(dob), LAYOUT.mrz2, w, h);
  }

  return rotateCanvas90(design, TEXTURE_ROTATION);
}
