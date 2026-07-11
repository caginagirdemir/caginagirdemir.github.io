// Model Editor — main.js

// ─── Layer model ─────────────────────────────────────────────────
// Each entry describes one user-facing layer.
// `konvaLayer` is null until Step 2 wires it up.

let activeLayerId = 'layer1';

const layers = [
  { id: 'layer1', name: 'Layer 1', visible: true, locked: false, opacity: 1.0, konvaLayer: null },
];

// Helper — find a layer by id
function getLayer(id) {
  return layers.find(l => l.id === id) ?? null;
}

// ─── Point model ─────────────────────────────────────────────────
// Each point is a waypoint node on the driving graph.
// `layerId`    — which user layer owns this point
// `konvaGroup` — the Konva.Group (circle + label) once drawn; null until Step 2

const points = [];
let pointCounter = 1;

function makePointId() { return 'pt-' + Date.now(); }
function makePointName() { return 'Point-' + String(pointCounter++).padStart(4, '0'); }

function getPoint(id) { return points.find(p => p.id === id) ?? null; }

function createPoint(x, y, layerId) {
  const p = {
    id: makePointId(), name: makePointName(),
    x, y, layerId, konvaGroup: null,
    angle: NaN,
    type: 'HALT_POSITION',
    envelopes: [],          // [{ key: string, coords: [{x, y}] }]
    vehicleBoundingBox: { length: 1000, width: 1000, height: 1000, refOffsetX: 0, refOffsetY: 0 },
    miscProperties: [],       // [{ key: string, value: string }]
    labelXOffset: -10,
    labelYOffset: -20,
    labelOrientationAngle: NaN,
  };
  points.push(p);
  return p;
}

function deletePoint(id) {
  const idx = points.findIndex(p => p.id === id);
  if (idx === -1) return;
  points[idx].konvaGroup?.destroy();
  points.splice(idx, 1);
}

// ─── Path model ──────────────────────────────────────────────────

const pathList = [];

function makePathId()  { return 'path-' + Date.now(); }
function getPath(id)   { return pathList.find(p => p.id === id) ?? null; }

function createPath(startPointId, endPointId, layerId) {
  const sp = getPoint(startPointId);
  const ep = getPoint(endPointId);
  const pa = {
    id: makePathId(),
    name: sp.name + ' --- ' + ep.name,
    startPointId,
    endPointId,
    layerId,
    length: null,           // mm, null = auto-calculated
    maxVelocity: 1.0,       // m/s
    maxReverseVelocity: 0.0,// m/s
    connectionType: 'DIRECT', // 'DIRECT' | 'BEZIER' | 'POLYLINE'
    controlPoints: [],      // for BEZIER: [{x,y},{x,y}]; auto-seeded on type change
    locked: false,
    peripheralOperations: [], // [{ location, operation, trigger, completionRequired }]
    envelopes: [],
    miscProperties: [],
    konvaGroup: null,
  };
  pathList.push(pa);
  return pa;
}

function deletePath(id) {
  const idx = pathList.findIndex(p => p.id === id);
  if (idx === -1) return;
  pathList[idx].konvaGroup?.destroy();
  pathList.splice(idx, 1);
}

function pathLength(pa) {
  const sp = getPoint(pa.startPointId);
  const ep = getPoint(pa.endPointId);
  if (!sp || !ep) return 0;
  return Math.sqrt((ep.x - sp.x) ** 2 + (ep.y - sp.y) ** 2);
}

// ─── Location type model ─────────────────────────────────────────

const locationTypes = [];
let ltCounter = 1;

function makeLtId()   { return 'lt-' + Date.now(); }
function makeLtName() { return 'LType-' + String(ltCounter++).padStart(4, '0'); }
function getLocationType(id) { return locationTypes.find(l => l.id === id) ?? null; }

function createLocationType() {
  const lt = {
    id: makeLtId(), name: makeLtName(),
    supportedVehicleOperations: [],
    supportedPeripheralOperations: [],
    symbol: 'NONE',
    miscProperties: [],
  };
  locationTypes.push(lt);
  return lt;
}

function deleteLocationType(id) {
  const idx = locationTypes.findIndex(l => l.id === id);
  if (idx !== -1) locationTypes.splice(idx, 1);
}

// ─── Location model ──────────────────────────────────────────────

const locations = [];
let locCounter = 1;

function makeLocId()   { return 'loc-' + Date.now(); }
function makeLocName() { return 'Location-' + String(locCounter++).padStart(4, '0'); }
function getLocation(id) { return locations.find(l => l.id === id) ?? null; }

function createLocation(x, y, layerId) {
  const loc = {
    id: makeLocId(), name: makeLocName(),
    x, y, layerId, konvaGroup: null,
    type: null,
    locked: false,
    symbol: 'DEFAULT',
    labelXOffset: -10,
    labelYOffset: -20,
    labelOrientationAngle: NaN,
    reservationToken: '',
    peripheralState: '',
    processingState: '',
    peripheralJob: '',
    miscProperties: [],
  };
  locations.push(loc);
  return loc;
}

function deleteLocation(id) {
  const idx = locations.findIndex(l => l.id === id);
  if (idx === -1) return;
  locations[idx].konvaGroup?.destroy();
  locations.splice(idx, 1);
}

// ─── Link model ──────────────────────────────────────────────────

const links = [];

function makeLinkId() { return 'link-' + Date.now(); }
function getLink(id)  { return links.find(l => l.id === id) ?? null; }

function createLink(pointId, locationId, layerId) {
  const pt  = getPoint(pointId);
  const loc = getLocation(locationId);
  const lk = {
    id: makeLinkId(),
    name: (pt?.name ?? '?') + ' --- ' + (loc?.name ?? '?'),
    pointId, locationId, layerId,
    actions: [],   // string[] — allowed vehicle operations from the location type
    konvaGroup: null,
  };
  links.push(lk);
  return lk;
}

function deleteLink(id) {
  const idx = links.findIndex(l => l.id === id);
  if (idx !== -1) { links[idx].konvaGroup?.destroy(); links.splice(idx, 1); }
}

// ─── Block model ─────────────────────────────────────────────────

const blocks = [];
let blockCounter = 1;

function makeBlockId()   { return 'blk-' + Date.now(); }
function makeBlockName() { return 'Block-' + String(blockCounter++).padStart(4, '0'); }
function getBlock(id)    { return blocks.find(b => b.id === id) ?? null; }

function createBlock() {
  const blk = {
    id: makeBlockId(), name: makeBlockName(),
    color: '#ff0000',
    type: 'SINGLE_VEHICLE_ONLY',
    members: [],   // element ids (points, paths, locations)
    miscProperties: [],
  };
  blocks.push(blk);
  return blk;
}

function deleteBlock(id) {
  const idx = blocks.findIndex(b => b.id === id);
  if (idx !== -1) blocks.splice(idx, 1);
}

// ─── Vehicle model ───────────────────────────────────────────────

const vehicles = [];
let vehicleCounter = 1;

function makeVehicleId()   { return 'veh-' + Date.now(); }
function makeVehicleName() { return 'Vehicle-' + String(vehicleCounter++).padStart(4, '0'); }
function getVehicle(id)    { return vehicles.find(v => v.id === id) ?? null; }

function createVehicle() {
  const veh = {
    id: makeVehicleId(), name: makeVehicleName(),
    boundingBoxLength: 1000, boundingBoxWidth: 1000, boundingBoxHeight: 1000,
    boundingBoxOffsetX: 0,   boundingBoxOffsetY: 0,
    routeColor: '#ff0000',
    maxVelocity: 1000.0,
    maxReverseVelocity: 1000.0,
    energyCritical: 30,
    energyFullyRecharged: 90,
    energyDegraded: 40,
    energySufficientlyRecharged: 95,
    currentEnergyLevel: NaN,
    loaded: false,
    state: 'UNKNOWN',
    processingState: 'IDLE',
    integrationLevel: 'TO_BE_RESPECTED',
    paused: false,
    currentPoint: '',
    exactPosition: 'null',
    vehicleOrientation: NaN,
    envelopeKey: '',
    miscProperties: [],
    currentTransportOrder: '',
    currentOrderSequence: '',
    acceptableOrderTypes: '',
    allocatedResources: '',
    claimedResources: '',
  };
  vehicles.push(veh);
  return veh;
}

function deleteVehicle(id) {
  const idx = vehicles.findIndex(v => v.id === id);
  if (idx !== -1) vehicles.splice(idx, 1);
}

// ─── Active tool ─────────────────────────────────────────────────

let activeTool = 'Select';

// ─── Sidebar UI ─────────────────────────────────────────────────

const DRAW_TOOLS = ['AreaSelect', 'Select', 'Pan', 'Point', 'Path', 'Link', 'Location', 'Zone'];

document.querySelectorAll('.me-toolbar .me-tool').forEach(btn => {
  if (!DRAW_TOOLS.includes(btn.title)) return;
  btn.addEventListener('click', () => {
    document.querySelectorAll('.me-toolbar .me-tool').forEach(t => {
      if (DRAW_TOOLS.includes(t.title)) t.classList.remove('is-active');
    });
    btn.classList.add('is-active');
    activeTool = btn.title;
    // Cancel any pending path first-click when switching tools
    if (typeof cancelPathTool === 'function') cancelPathTool();
    const canvas = document.getElementById('konva-container');
    if (canvas) canvas.style.cursor = (activeTool === 'Point' || activeTool === 'Path' || activeTool === 'Link' || activeTool === 'Location' || activeTool === 'AreaSelect') ? 'crosshair' : 'grab';
  });
});

document.querySelectorAll('.me-tree__row').forEach(row => {
  row.addEventListener('click', () => {
    // Expand / collapse header rows that have a child list
    const targetId = row.dataset.target;
    if (targetId) {
      const list = document.getElementById(targetId);
      if (list) {
        const collapsed = row.classList.toggle('is-collapsed');
        list.classList.toggle('me-tree__children--hidden', collapsed);
      }
      return; // don't apply is-selected to category headers
    }
    document.querySelectorAll('.me-tree__row').forEach(r => r.classList.remove('is-selected'));
    row.classList.add('is-selected');
  });
});

document.querySelectorAll('.me-layer').forEach(layer => {
  layer.addEventListener('click', () => {
    document.querySelectorAll('.me-layer').forEach(l => l.classList.remove('is-active'));
    layer.classList.add('is-active');
  });
});

// ─── Status bar ─────────────────────────────────────────────────

const sb = {
  coords:   document.getElementById('sb-coords'),
  zoom:     document.getElementById('sb-zoom'),
  grid:     document.getElementById('sb-grid'),
  snap:     document.getElementById('sb-snap'),
  counts:   document.getElementById('sb-counts'),
  warnings: document.getElementById('sb-warnings'),
};

// Call this whenever counts change (points, paths, locations added/removed)
function updateCounts(points = 0, paths = 0, locations = 0, warnings = 0) {
  sb.counts.textContent = `${points} points · ${paths} paths · ${locations} locations`;
  if (warnings > 0) {
    sb.warnings.textContent = `⚠ ${warnings} warning${warnings > 1 ? 's' : ''}`;
    sb.warnings.style.display = '';
  } else {
    sb.warnings.style.display = 'none';
  }
}

updateCounts(); // initialise to zeros

// ─── Konva canvas ───────────────────────────────────────────────

const RULER_H = 24;
const RULER_W = 40;

(function initCanvas() {
  const container = document.getElementById('konva-container');
  let W = container.clientWidth;
  let H = container.clientHeight;

  const stage = new Konva.Stage({ container: 'konva-container', width: W, height: H });

  // ── Fixed infrastructure layers (never removed) ───────────────
  const contentLayer = new Konva.Layer(); // grid background
  const overlayLayer = new Konva.Layer(); // origin marker
  const rulerLayer   = new Konva.Layer(); // rulers

  // Shared canvas transform state (pan + zoom)
  let tx = RULER_W, ty = RULER_H, ts = 1;

  // Apply the current transform to every world group in the scene
  function applyTransform() {
    [world, previewGroup, ...layers.map(l => l.worldGroup).filter(Boolean)].forEach(g => {
      g.position({ x: tx, y: ty });
      g.scale({ x: ts, y: ts });
    });
  }

  // ── Grid world group (inside contentLayer) ────────────────────
  contentLayer.clip({ x: RULER_W, y: RULER_H, width: W - RULER_W, height: H - RULER_H });
  const world = new Konva.Group({ x: tx, y: ty });
  contentLayer.add(world);

  // ── Create one Konva.Layer per entry in layers[] ──────────────
  function createKonvaLayer(layerDef) {
    const kl = new Konva.Layer({ visible: layerDef.visible, opacity: layerDef.opacity });
    kl.clip({ x: RULER_W, y: RULER_H, width: W - RULER_W, height: H - RULER_H });
    const wg = new Konva.Group({ x: tx, y: ty, scaleX: ts, scaleY: ts });
    kl.add(wg);
    layerDef.konvaLayer = kl;
    layerDef.worldGroup = wg;
    stage.add(kl);
    // Caller is responsible for calling reorderKonvaLayers() after all layers are created
  }

  // Build the initial stage order: contentLayer → user layers → previewLayer → overlayLayer → rulerLayer
  const previewLayer = new Konva.Layer();
  previewLayer.clip({ x: RULER_W, y: RULER_H, width: W - RULER_W, height: H - RULER_H });
  const previewGroup = new Konva.Group({ x: tx, y: ty, scaleX: ts, scaleY: ts });
  previewLayer.add(previewGroup);

  stage.add(contentLayer, overlayLayer, rulerLayer);
  layers.forEach(l => {
    const kl = new Konva.Layer({ visible: l.visible, opacity: l.opacity });
    kl.clip({ x: RULER_W, y: RULER_H, width: W - RULER_W, height: H - RULER_H });
    const wg = new Konva.Group({ x: tx, y: ty, scaleX: ts, scaleY: ts });
    kl.add(wg);
    l.konvaLayer = kl;
    l.worldGroup = wg;
    stage.add(kl);
  });

  // previewLayer, overlayLayer, rulerLayer always stay on top — initial order is set by reorderKonvaLayers below
  stage.add(previewLayer);
  // Establish correct initial layer order
  reorderKonvaLayers();

  // ── Layer UI ─────────────────────────────────────────────────
  const layersList = document.getElementById('layers-list');
  const layerCount = document.getElementById('layer-count');

  // Returns the worldGroup for the currently active layer
  function getActiveWorldGroup() {
    return getLayer(activeLayerId)?.worldGroup ?? null;
  }

  // Sync Konva layer stack to match layers[] order.
  // layers[0] = top of UI list = rendered on top (front).
  // layers[N-1] = bottom of UI list = rendered at back.
  // Fixed layers: contentLayer at absolute bottom, then user layers, then previewLayer/overlayLayer/rulerLayer.
  function reorderKonvaLayers() {
    contentLayer.moveToBottom();
    // Move user layers in reverse so layers[0] ends up on top
    [...layers].reverse().forEach(l => { if (l.konvaLayer) l.konvaLayer.moveToTop(); });
    previewLayer.moveToTop();
    overlayLayer.moveToTop();
    rulerLayer.moveToTop();
  }

  // ── Drag-to-reorder ──────────────────────────────────────────
  let draggedId = null;

  function clearDropIndicators() {
    layersList.querySelectorAll('.me-layer').forEach(r =>
      r.classList.remove('drop-above', 'drop-below'));
  }

  function setupDragAndDrop() {
    layersList.querySelectorAll('.me-layer').forEach(row => {
      row.setAttribute('draggable', 'true');

      row.addEventListener('dragstart', e => {
        draggedId = row.dataset.id;
        row.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      row.addEventListener('dragend', () => {
        draggedId = null;
        layersList.querySelectorAll('.me-layer')
          .forEach(r => r.classList.remove('is-dragging'));
        clearDropIndicators();
      });

      row.addEventListener('dragover', e => {
        e.preventDefault();
        if (row.dataset.id === draggedId) return;
        clearDropIndicators();
        const mid = row.getBoundingClientRect().top + row.offsetHeight / 2;
        row.classList.add(e.clientY < mid ? 'drop-above' : 'drop-below');
      });

      row.addEventListener('dragleave', () => clearDropIndicators());

      row.addEventListener('drop', e => {
        e.preventDefault();
        clearDropIndicators();
        if (!draggedId || draggedId === row.dataset.id) return;

        const fromIdx = layers.findIndex(l => l.id === draggedId);
        const mid     = row.getBoundingClientRect().top + row.offsetHeight / 2;
        const before  = e.clientY < mid;

        const [moved] = layers.splice(fromIdx, 1);
        let toIdx = layers.findIndex(l => l.id === row.dataset.id);
        layers.splice(before ? toIdx : toIdx + 1, 0, moved);

        reorderKonvaLayers();
        renderLayersUI();
      });
    });
  }

  function startRename(row, l) {
    const nameEl = row.querySelector('.me-layer__name');
    const input  = document.createElement('input');
    input.className = 'me-layer__rename';
    input.value     = l.name;
    nameEl.replaceWith(input);
    input.focus();
    input.select();

    function commit() {
      const val = input.value.trim();
      if (val) l.name = val;
      renderLayersUI();
    }
    input.addEventListener('blur',    commit);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter')  { input.blur(); }
      if (e.key === 'Escape') { input.value = l.name; input.blur(); }
    });
  }

  function deleteLayer(id) {
    if (layers.length === 1) return; // must keep at least one layer
    const idx = layers.findIndex(l => l.id === id);
    if (idx === -1) return;
    layers[idx].konvaLayer.destroy();
    layers.splice(idx, 1);
    // If we deleted the active layer, activate the one above (or first)
    if (activeLayerId === id) {
      activeLayerId = layers[Math.max(0, idx - 1)].id;
    }
    renderLayersUI();
  }

  // ── Properties panel (right side) ────────────────────────────
  function renderPropertiesPanel(l) {
    const panel = document.getElementById('properties-panel');
    if (!l) {
      panel.innerHTML = '<p class="pp-placeholder">No layer selected.</p>';
      return;
    }

    const isBg = l.id === '__bg__';
    const mpp  = isBg ? (l.mapMetersPerPixel ?? 1.0) : 1.0;
    const ppm  = mpp > 0 ? 1.0 / mpp : 0;

    panel.innerHTML = `
      <div class="me-selection">
        <svg class="me-selection__icon"><use href="#icon-layer"/></svg>
        <div class="pp-name-wrap">
          <span class="pp-name" title="Double-click to rename">${l.name}</span>
        </div>
      </div>
      <div class="me-prop">
        <span class="me-prop__label">Opacity</span>
        <div class="pp-opacity-row">
          <input class="pp-slider" type="range" min="0" max="100" step="1" value="${Math.round(l.opacity * 100)}">
          <input class="pp-opacity-num" type="number" min="0" max="100" step="1" value="${Math.round(l.opacity * 100)}">
        </div>
      </div>
      <div class="me-prop">
        <span class="me-prop__label">Visible</span>
        <button class="pp-toggle me-pill${l.visible ? ' me-pill--accent' : ''}"
                data-action="visible">${l.visible ? 'Visible' : 'Hidden'}</button>
      </div>
      ${isBg ? `
      <div class="me-prop-group-label">Image Scale</div>
      <div class="me-prop">
        <span class="me-prop__label">m / px</span>
        <input id="pp-mpp" class="pp-num-input" type="number" min="0.000001" step="0.0001"
               value="${mpp.toFixed(6)}" style="width:100px;border:1px solid var(--border);background:#f3f1ec;padding:1px 8px;">
      </div>
      <div class="me-prop">
        <span class="me-prop__label">px / m</span>
        <input id="pp-ppm" class="pp-num-input" type="number" min="0.000001" step="0.0001"
               value="${ppm.toFixed(6)}" style="width:100px;border:1px solid var(--border);background:#f3f1ec;padding:1px 8px;">
      </div>
      ` : ''}
      <div class="pp-delete-zone">
        <button class="pp-delete" data-action="delete">Delete layer</button>
      </div>
    `;

    // Name — dblclick to rename inline
    const nameEl = panel.querySelector('.pp-name');
    nameEl.addEventListener('dblclick', () => {
      const input = document.createElement('input');
      input.className = 'pp-name-input';
      input.value = l.name;
      nameEl.replaceWith(input);
      input.focus();
      input.select();
      function commit() {
        const val = input.value.trim();
        if (val) l.name = val;
        renderLayersUI();
      }
      input.addEventListener('blur', commit);
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') { input.value = l.name; input.blur(); }
      });
    });

    // Opacity — slider and number input stay in sync
    const slider    = panel.querySelector('.pp-slider');
    const opNum     = panel.querySelector('.pp-opacity-num');
    function clamp(v) { return Math.min(100, Math.max(0, parseInt(v) || 0)); }
    function applyOpacity(pct) {
      l.opacity = pct / 100;
      l.konvaLayer.opacity(l.opacity);
      l.konvaLayer.batchDraw();
      slider.value = pct;
      opNum.value  = pct;
    }
    slider.addEventListener('input', () => applyOpacity(clamp(slider.value)));
    opNum.addEventListener('input',  () => applyOpacity(clamp(opNum.value)));
    opNum.addEventListener('blur',   () => applyOpacity(clamp(opNum.value)));

    panel.querySelector('[data-action="visible"]').addEventListener('click', () => {
      l.visible = !l.visible;
      l.konvaLayer.visible(l.visible);
      l.konvaLayer.batchDraw();
      renderLayersUI();
    });

    if (isBg) {
      const mppInput = panel.querySelector('#pp-mpp');
      const ppmInput = panel.querySelector('#pp-ppm');

      function applyScale(mppVal) {
        if (!isFinite(mppVal) || mppVal <= 0) return;
        l.mapMetersPerPixel = mppVal;
        mppInput.value = mppVal.toFixed(6);
        ppmInput.value = (1.0 / mppVal).toFixed(6);
        const kImg = l.worldGroup?.findOne('Image');
        if (kImg) { kImg.scaleX(mppVal); kImg.scaleY(mppVal); l.konvaLayer.batchDraw(); }
      }
      function applyMpp(val) {
        const v = parseFloat(val);
        if (!isFinite(v) || v <= 0) return;
        applyScale(v);
      }
      function applyPpm(val) {
        const v = parseFloat(val);
        if (!isFinite(v) || v <= 0) return;
        applyScale(1.0 / v);
      }

      mppInput.addEventListener('input', () => applyMpp(mppInput.value));
      mppInput.addEventListener('blur',  () => applyMpp(mppInput.value));
      ppmInput.addEventListener('input', () => applyPpm(ppmInput.value));
      ppmInput.addEventListener('blur',  () => applyPpm(ppmInput.value));
    }

    panel.querySelector('[data-action="delete"]').addEventListener('click', () => {
      deleteLayer(l.id);
    });
  }

  function renderLayersUI() {
    layerCount.textContent = layers.length;
    layersList.innerHTML = layers.map(l => `
      <div class="me-layer ${l.id === activeLayerId ? 'is-active' : ''}" data-id="${l.id}">
        <span class="me-layer__handle">⠿</span>
        <svg class="me-layer__toggle ${l.visible ? '' : 'is-off'}" data-action="visibility">
          <use href="#icon-${l.visible ? 'eye' : 'eye-off'}"/>
        </svg>
        <span class="me-layer__name">${l.name}</span>
      </div>
    `).join('');

    layersList.querySelectorAll('.me-layer').forEach(row => {
      const id = row.dataset.id;
      const l  = getLayer(id);

      // Row click → activate
      row.addEventListener('click', e => {
        if (e.target.closest('[data-action]')) return;
        activeLayerId = id;
        renderLayersUI();
      });

      // Double-click name → rename
      row.querySelector('.me-layer__name').addEventListener('dblclick', e => {
        e.stopPropagation();
        startRename(row, l);
      });

      // Visibility toggle
      row.querySelector('[data-action="visibility"]').addEventListener('click', e => {
        e.stopPropagation();
        l.visible = !l.visible;
        l.konvaLayer.visible(l.visible);
        l.konvaLayer.batchDraw();
        renderLayersUI();
      });

    });

    setupDragAndDrop();
    renderPropertiesPanel(getLayer(activeLayerId));
  }

  renderLayersUI();

  // Add layer button
  let newLayerIndex = layers.length + 1;
  document.getElementById('btn-add-layer').addEventListener('click', () => {
    const id   = 'layer-' + Date.now();
    const name = 'Layer ' + newLayerIndex++;
    const def  = { id, name, visible: true, locked: false, opacity: 1.0, konvaLayer: null, worldGroup: null };
    layers.push(def);

    const kl = new Konva.Layer({ visible: true, opacity: 1.0 });
    kl.clip({ x: RULER_W, y: RULER_H, width: W - RULER_W, height: H - RULER_H });
    const wg = new Konva.Group({ x: tx, y: ty, scaleX: ts, scaleY: ts });
    kl.add(wg);
    def.konvaLayer = kl;
    def.worldGroup = wg;
    stage.add(kl);
    reorderKonvaLayers();

    activeLayerId = id;
    renderLayersUI();
  });

  // ── Point drawing ─────────────────────────────────────────────
  const POINT_R = 8; // world-unit radius

  // ── Point selection state ─────────────────────────────────────
  let selectedPointId = null;

  function getBlockColorFor(elementId) {
    const blk = blocks.find(b => b.members.includes(elementId));
    return blk ? blk.color : null;
  }

  function refreshAllElementColors() {
    points.forEach(p => {
      if (p.konvaGroup && selectedPointId !== p.id) setPointStyle(p, false);
    });
    pathList.forEach(pa => {
      if (pa.konvaGroup && selectedPathId !== pa.id) setPathStyle(pa, false);
    });
  }

  function setPointStyle(p, selected) {
    if (!p?.konvaGroup) return;
    const ring = p.konvaGroup.findOne('.ring');
    const dot  = p.konvaGroup.findOne('.dot');
    const lbl  = p.konvaGroup.findOne('.label');
    if (selected) {
      ring.stroke('#f59e0b'); ring.strokeWidth(2);
      dot.fill('#f59e0b');
      lbl.fill('#b45309');
    } else {
      const col = getBlockColorFor(p.id) ?? '#1d4ed8';
      ring.stroke(col); ring.strokeWidth(1.5); ring.dash([]);
      dot.fill(col);
      lbl.fill(col);
    }
    getLayer(p.layerId)?.konvaLayer.batchDraw();
  }

  function renderPointProperties(p) {
    const panel  = document.getElementById('properties-panel');
    const u      = UNITS[unitIdx].label;
    const fmtVal = v => isNaN(v) ? 'NaN' : String(v);

    panel.innerHTML = `
      <div class="me-selection">
        <svg class="me-selection__icon"><use href="#icon-point"/></svg>
        <div class="pp-name-wrap">
          <span class="pp-name">${p.name}</span>
        </div>
      </div>
      <table class="pp-table">
        <thead><tr><th>Attribute</th><th>Value</th></tr></thead>
        <tbody>
          <tr>
            <td>Name</td>
            <td><input class="pp-pt-name" type="text" value="${p.name}"></td>
          </tr>
          <tr>
            <td>x-position</td>
            <td><div class="pp-val-row">
              <input class="pp-pt-x" type="number" step="any" value="${p.x.toFixed(1)}">
              <span class="pp-unit">${u}</span>
            </div></td>
          </tr>
          <tr>
            <td>y-position</td>
            <td><div class="pp-val-row">
              <input class="pp-pt-y" type="number" step="any" value="${p.y.toFixed(1)}">
              <span class="pp-unit">${u}</span>
            </div></td>
          </tr>
          <tr>
            <td>Angle</td>
            <td><div class="pp-val-row">
              <input class="pp-pt-angle" type="number" step="any" value="${fmtVal(p.angle)}">
              <span class="pp-unit">deg</span>
            </div></td>
          </tr>
          <tr>
            <td>Type</td>
            <td><select class="pp-pt-type">
              <option value="HALT_POSITION"   ${p.type === 'HALT_POSITION'   ? 'selected' : ''}>Halt point</option>
              <option value="REPORT_POSITION" ${p.type === 'REPORT_POSITION' ? 'selected' : ''}>Report position</option>
              <option value="PARK_POSITION"   ${p.type === 'PARK_POSITION'   ? 'selected' : ''}>Park position</option>
            </select></td>
          </tr>
          <tr class="pp-section"><td colspan="2">Vehicle envelopes</td></tr>
          <tr>
            <td>Envelopes</td>
            <td>
              <button class="pp-env-btn" style="font-family:var(--font-mono);font-size:11px;
                border:1px solid var(--border);background:#f3f1ec;padding:1px 8px;
                border-radius:2px;cursor:pointer;width:100%;text-align:left;">
                ${p.envelopes.length === 0 ? 'None defined…' : `${p.envelopes.length} envelope(s)…`}
              </button>
            </td>
          </tr>
          <tr>
            <td>Maximum vehicle bounding box</td>
            <td>
              <button class="pp-bbox-btn" style="font-family:var(--font-mono);font-size:11px;
                border:1px solid var(--border);background:#f3f1ec;padding:1px 8px;
                border-radius:2px;cursor:pointer;width:100%;text-align:left;">
                (${p.vehicleBoundingBox.length}, ${p.vehicleBoundingBox.width}, ${p.vehicleBoundingBox.height}), offset: (${p.vehicleBoundingBox.refOffsetX}, ${p.vehicleBoundingBox.refOffsetY})
              </button>
            </td>
          </tr>
          <tr class="pp-section"><td colspan="2">Miscellaneous</td></tr>
          <tr>
            <td>Properties</td>
            <td>
              <button class="pp-misc-btn" style="font-family:var(--font-mono);font-size:11px;
                border:1px solid var(--border);background:#f3f1ec;padding:1px 8px;
                border-radius:2px;cursor:pointer;width:100%;text-align:left;">
                ${p.miscProperties.length === 0 ? 'None defined…' : `${p.miscProperties.length} pair(s)…`}
              </button>
            </td>
          </tr>
          <tr>
            <td>Label x offset</td>
            <td><input class="pp-pt-lxoff" type="number" step="any" value="${p.labelXOffset}"></td>
          </tr>
          <tr>
            <td>Label y offset</td>
            <td><input class="pp-pt-lyoff" type="number" step="any" value="${p.labelYOffset}"></td>
          </tr>
          <tr>
            <td>Label orientation angle</td>
            <td><input class="pp-pt-langle" type="number" step="any" value="${fmtVal(p.labelOrientationAngle)}"></td>
          </tr>
          <tr>
            <td>Layer</td>
            <td><select class="pp-pt-layer">
              ${layers.map(l => `<option value="${l.id}" ${l.id === p.layerId ? 'selected' : ''}>${l.name}</option>`).join('')}
            </select></td>
          </tr>
        </tbody>
      </table>
      <div class="pp-delete-zone">
        <button class="pp-delete" data-action="delete-point">Delete point</button>
      </div>
    `;

    // ── Wire handlers ───────────────────────────────────────────
    const q = sel => panel.querySelector(sel);

    q('[data-action="delete-point"]').addEventListener('click', () => removePoint(p.id));

    q('.pp-pt-name').addEventListener('change', e => {
      const val = e.target.value.trim();
      if (!val) { e.target.value = p.name; return; }
      p.name = val;
      p.konvaGroup?.findOne('.label').text(p.name);
      getLayer(p.layerId)?.konvaLayer.batchDraw();
      renderComponentsTree();
    });

    q('.pp-pt-x').addEventListener('change', e => {
      p.x = parseFloat(e.target.value) || p.x;
      p.konvaGroup?.position({ x: p.x, y: -p.y });
      getLayer(p.layerId)?.konvaLayer.batchDraw();
    });

    q('.pp-pt-y').addEventListener('change', e => {
      p.y = parseFloat(e.target.value) || p.y;
      p.konvaGroup?.position({ x: p.x, y: -p.y });
      getLayer(p.layerId)?.konvaLayer.batchDraw();
    });

    q('.pp-pt-angle').addEventListener('change', e => {
      p.angle = parseFloat(e.target.value);
    });

    q('.pp-pt-type').addEventListener('change', e => {
      p.type = e.target.value;
    });

    q('.pp-pt-lxoff').addEventListener('change', e => {
      p.labelXOffset = parseFloat(e.target.value) || 0;
      p.konvaGroup?.findOne('.label').x(p.labelXOffset);
      getLayer(p.layerId)?.konvaLayer.batchDraw();
    });

    q('.pp-pt-lyoff').addEventListener('change', e => {
      p.labelYOffset = parseFloat(e.target.value) || 0;
      p.konvaGroup?.findOne('.label').y(p.labelYOffset);
      getLayer(p.layerId)?.konvaLayer.batchDraw();
    });

    q('.pp-pt-langle').addEventListener('change', e => {
      p.labelOrientationAngle = parseFloat(e.target.value);
      p.konvaGroup?.findOne('.label').rotation(isNaN(p.labelOrientationAngle) ? 0 : p.labelOrientationAngle);
      getLayer(p.layerId)?.konvaLayer.batchDraw();
    });

    q('.pp-pt-layer').addEventListener('change', e => {
      const newLayerId = e.target.value;
      if (newLayerId === p.layerId) return;
      const oldLayer = getLayer(p.layerId);
      const newLayer = getLayer(newLayerId);
      if (!oldLayer || !newLayer?.worldGroup) return;
      p.konvaGroup.moveTo(newLayer.worldGroup);
      oldLayer.konvaLayer.batchDraw();
      newLayer.konvaLayer.batchDraw();
      p.layerId = newLayerId;
    });

    q('.pp-env-btn').addEventListener('click', () => openEnvelopesDialog(p));
    q('.pp-bbox-btn').addEventListener('click', () => openBoundingBoxDialog(p));
    q('.pp-misc-btn').addEventListener('click', () => openMiscPropertiesDialog(p));
  }

  // ── Envelope dialogs ──────────────────────────────────────────
  function createModal(title, width = 460) {
    const overlay = document.createElement('div');
    overlay.className = 'me-modal-overlay';
    const modal = document.createElement('div');
    modal.className = 'me-modal';
    modal.style.width = width + 'px';
    modal.innerHTML = `
      <div class="me-modal__head">${title}</div>
      <div class="me-modal__body"></div>
      <div class="me-modal__foot"></div>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    return {
      overlay,
      body: modal.querySelector('.me-modal__body'),
      foot: modal.querySelector('.me-modal__foot'),
      close: () => overlay.remove(),
    };
  }

  function refreshPropertiesFor(obj) {
    if (pathList.includes(obj)) renderPathProperties(obj);
    else if (locationTypes.includes(obj)) renderLocationTypeProperties(obj);
    else if (locations.includes(obj)) renderLocationProperties(obj);
    else if (links.includes(obj)) renderLinkProperties(obj);
    else if (blocks.includes(obj))   renderBlockProperties(obj);
    else if (vehicles.includes(obj)) renderVehicleProperties(obj);
    else renderPointProperties(obj);
  }

  // ── Peripheral operations dialog ──────────────────────────────
  function openPeripheralOpsDialog(pa) {
    const backup = JSON.parse(JSON.stringify(pa.peripheralOperations));
    let selIdx = -1;
    const { body, foot, close } = createModal('Peripheral operations', 620);

    function render() {
      body.innerHTML = `
        <div style="display:flex;gap:8px;height:260px;">
          <div style="flex:1;overflow:auto;border:1px solid var(--border);">
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
              <thead>
                <tr style="background:#e8e5de;position:sticky;top:0;">
                  <th style="padding:4px 8px;text-align:left;border-bottom:1px solid var(--border);">Location</th>
                  <th style="padding:4px 8px;text-align:left;border-bottom:1px solid var(--border);">Operation</th>
                  <th style="padding:4px 8px;text-align:left;border-bottom:1px solid var(--border);">Trigger</th>
                  <th style="padding:4px 8px;text-align:center;border-bottom:1px solid var(--border);">Completion required</th>
                </tr>
              </thead>
              <tbody id="periph-rows">
                ${pa.peripheralOperations.length === 0
                  ? '<tr><td colspan="4" style="padding:10px;color:var(--muted);text-align:center;">No operations defined</td></tr>'
                  : pa.peripheralOperations.map((op, i) => `
                    <tr class="periph-row${i === selIdx ? ' is-selected' : ''}" data-idx="${i}"
                      style="cursor:pointer;${i === selIdx ? 'background:#cfe8ff;' : ''}">
                      <td style="padding:3px 8px;border-bottom:1px solid #eee;font-family:var(--font-mono);">${op.location || '<em style="color:var(--muted)">—</em>'}</td>
                      <td style="padding:3px 8px;border-bottom:1px solid #eee;font-family:var(--font-mono);">${op.operation || '<em style="color:var(--muted)">—</em>'}</td>
                      <td style="padding:3px 8px;border-bottom:1px solid #eee;">${op.trigger === 'AFTER_MOVEMENT' ? 'After movement' : 'After allocation'}</td>
                      <td style="padding:3px 8px;border-bottom:1px solid #eee;text-align:center;">
                        <input type="checkbox" ${op.completionRequired ? 'checked' : ''} disabled>
                      </td>
                    </tr>`).join('')}
              </tbody>
            </table>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;padding-top:2px;min-width:80px;">
            <button id="periph-add"    class="me-modal-btn">Add</button>
            <button id="periph-edit"   class="me-modal-btn" ${selIdx < 0 ? 'disabled' : ''}>Edit</button>
            <button id="periph-remove" class="me-modal-btn" ${selIdx < 0 ? 'disabled' : ''}>Remove</button>
            <div style="flex:1"></div>
            <button id="periph-up"   class="me-modal-btn" ${selIdx <= 0 ? 'disabled' : ''}>Up</button>
            <button id="periph-down" class="me-modal-btn" ${selIdx < 0 || selIdx >= pa.peripheralOperations.length - 1 ? 'disabled' : ''}>Down</button>
          </div>
        </div>
      `;

      body.querySelectorAll('.periph-row').forEach(row => {
        row.addEventListener('click', () => { selIdx = +row.dataset.idx; render(); });
        row.addEventListener('dblclick', () => {
          selIdx = +row.dataset.idx;
          openEditPeripheralOpDialog(pa.peripheralOperations[selIdx], saved => {
            pa.peripheralOperations[selIdx] = saved; render();
          });
        });
      });

      body.querySelector('#periph-add').addEventListener('click', () => {
        openEditPeripheralOpDialog(
          { location: '', operation: '', trigger: 'AFTER_ALLOCATION', completionRequired: false },
          saved => { pa.peripheralOperations.push(saved); selIdx = pa.peripheralOperations.length - 1; render(); }
        );
      });
      body.querySelector('#periph-edit').addEventListener('click', () => {
        if (selIdx < 0) return;
        openEditPeripheralOpDialog(pa.peripheralOperations[selIdx], saved => {
          pa.peripheralOperations[selIdx] = saved; render();
        });
      });
      body.querySelector('#periph-remove').addEventListener('click', () => {
        if (selIdx < 0) return;
        pa.peripheralOperations.splice(selIdx, 1);
        selIdx = Math.min(selIdx, pa.peripheralOperations.length - 1);
        render();
      });
      body.querySelector('#periph-up').addEventListener('click', () => {
        if (selIdx <= 0) return;
        [pa.peripheralOperations[selIdx - 1], pa.peripheralOperations[selIdx]] =
          [pa.peripheralOperations[selIdx], pa.peripheralOperations[selIdx - 1]];
        selIdx--; render();
      });
      body.querySelector('#periph-down').addEventListener('click', () => {
        if (selIdx < 0 || selIdx >= pa.peripheralOperations.length - 1) return;
        [pa.peripheralOperations[selIdx + 1], pa.peripheralOperations[selIdx]] =
          [pa.peripheralOperations[selIdx], pa.peripheralOperations[selIdx + 1]];
        selIdx++; render();
      });
    }

    render();
    foot.innerHTML = `
      <button class="me-modal-btn me-modal-btn--primary" id="periph-ok">Ok</button>
      <button class="me-modal-btn" id="periph-cancel">Cancel</button>
    `;
    foot.querySelector('#periph-ok').addEventListener('click', () => {
      close(); refreshPropertiesFor(pa);
    });
    foot.querySelector('#periph-cancel').addEventListener('click', () => {
      pa.peripheralOperations = backup; close(); refreshPropertiesFor(pa);
    });
  }

  function openEditPeripheralOpDialog(op, onSave) {
    const draft = { ...op };
    const { body, foot, close } = createModal('Peripheral operation', 400);
    body.innerHTML = `
      <table class="me-modal-table" style="width:100%">
        <tbody>
          <tr class="me-modal-row">
            <td class="me-modal-label">Location</td>
            <td><input id="pop-location" type="text" value="${draft.location}"
              placeholder="Location name"
              style="width:100%;font-family:var(--font-mono);font-size:12px;border:1px solid var(--border);padding:2px 4px;"></td>
          </tr>
          <tr class="me-modal-row">
            <td class="me-modal-label">Operation</td>
            <td><input id="pop-operation" type="text" value="${draft.operation}"
              placeholder="Operation name"
              style="width:100%;font-family:var(--font-mono);font-size:12px;border:1px solid var(--border);padding:2px 4px;"></td>
          </tr>
          <tr class="me-modal-row">
            <td class="me-modal-label">Trigger</td>
            <td>
              <select id="pop-trigger" style="width:100%;font-size:12px;border:1px solid var(--border);padding:2px 4px;">
                <option value="AFTER_ALLOCATION" ${draft.trigger === 'AFTER_ALLOCATION' ? 'selected' : ''}>
                  After allocation (before movement)
                </option>
                <option value="AFTER_MOVEMENT" ${draft.trigger === 'AFTER_MOVEMENT' ? 'selected' : ''}>
                  After movement
                </option>
              </select>
            </td>
          </tr>
          <tr class="me-modal-row">
            <td class="me-modal-label">Completion required</td>
            <td><input id="pop-completion" type="checkbox" ${draft.completionRequired ? 'checked' : ''}
              style="width:16px;height:16px;cursor:pointer;"></td>
          </tr>
        </tbody>
      </table>
      <div id="pop-err" class="me-modal-validation" style="display:none;"></div>
    `;
    foot.innerHTML = `
      <button class="me-modal-btn me-modal-btn--primary" id="pop-ok">Ok</button>
      <button class="me-modal-btn" id="pop-cancel">Cancel</button>
    `;
    foot.querySelector('#pop-ok').addEventListener('click', () => {
      const location  = body.querySelector('#pop-location').value.trim();
      const operation = body.querySelector('#pop-operation').value.trim();
      const err = body.querySelector('#pop-err');
      if (!location) { err.textContent = 'Location must not be empty.'; err.style.display = 'block'; return; }
      if (!operation) { err.textContent = 'Operation must not be empty.'; err.style.display = 'block'; return; }
      onSave({
        location,
        operation,
        trigger: body.querySelector('#pop-trigger').value,
        completionRequired: body.querySelector('#pop-completion').checked,
      });
      close();
    });
    foot.querySelector('#pop-cancel').addEventListener('click', () => close());
  }

  function openEnvelopesDialog(p) {
    const backup = JSON.parse(JSON.stringify(p.envelopes));
    const { body, foot, close } = createModal('Envelopes', 500);
    let selIdx = -1;

    function render() {
      body.innerHTML = `
        <div style="display:flex;gap:10px;align-items:flex-start;">
          <table class="me-modal-table" style="flex:1;">
            <thead><tr><th>Key</th><th>Coordinates</th></tr></thead>
            <tbody>
              ${p.envelopes.length === 0
                ? '<tr><td colspan="2" style="padding:8px;color:var(--muted);text-align:center;">No envelopes</td></tr>'
                : p.envelopes.map((e, i) => `
                  <tr class="me-modal-row${selIdx === i ? ' is-selected' : ''}" data-idx="${i}">
                    <td>${e.key || '<em>unnamed</em>'}</td>
                    <td style="color:var(--muted);">${e.coords.map(c => `(${c.x},${c.y})`).join(' ')}</td>
                  </tr>`).join('')}
            </tbody>
          </table>
          <div style="display:flex;flex-direction:column;gap:4px;padding-top:24px;">
            <button class="me-modal-btn" id="env-add">Add</button>
            <button class="me-modal-btn" id="env-edit"   ${selIdx < 0 ? 'disabled' : ''}>Edit</button>
            <button class="me-modal-btn" id="env-remove" ${selIdx < 0 ? 'disabled' : ''}>Remove</button>
          </div>
        </div>
      `;

      body.querySelectorAll('.me-modal-row').forEach(row => {
        row.addEventListener('click', () => { selIdx = +row.dataset.idx; render(); });
        row.addEventListener('dblclick', () => {
          selIdx = +row.dataset.idx;
          openEditEnvelopeDialog(p.envelopes[selIdx], saved => {
            p.envelopes[selIdx] = saved; render();
          });
        });
      });

      body.querySelector('#env-add').addEventListener('click', () => {
        openEditEnvelopeDialog({ key: '', coords: [{x:0,y:0},{x:0,y:0},{x:0,y:0},{x:0,y:0}] }, saved => {
          p.envelopes.push(saved); selIdx = p.envelopes.length - 1; render();
        });
      });
      body.querySelector('#env-edit').addEventListener('click', () => {
        if (selIdx < 0) return;
        openEditEnvelopeDialog(p.envelopes[selIdx], saved => {
          p.envelopes[selIdx] = saved; render();
        });
      });
      body.querySelector('#env-remove').addEventListener('click', () => {
        if (selIdx < 0) return;
        p.envelopes.splice(selIdx, 1);
        selIdx = Math.min(selIdx, p.envelopes.length - 1);
        render();
      });
    }

    render();

    foot.innerHTML = `
      <button class="me-modal-btn me-modal-btn--primary" id="env-ok">Ok</button>
      <button class="me-modal-btn" id="env-cancel">Cancel</button>
    `;
    foot.querySelector('#env-ok').addEventListener('click', () => {
      close(); refreshPropertiesFor(p);
    });
    foot.querySelector('#env-cancel').addEventListener('click', () => {
      p.envelopes = backup; close(); refreshPropertiesFor(p);
    });
  }

  function openBoundingBoxDialog(p) {
    const backup = { ...p.vehicleBoundingBox };
    const { body, foot, close } = createModal('Maximum vehicle bounding box', 400);
    const render = () => {
      const bb = p.vehicleBoundingBox;
      body.innerHTML = `
        <table class="me-modal-table" style="width:100%">
          <tbody>
            <tr class="me-modal-row">
              <td class="me-modal-label">Length (mm)</td>
              <td><input id="bb-length" type="number" step="1" value="${bb.length}" style="width:100%;font-family:var(--font-mono);font-size:12px;border:1px solid var(--border);padding:2px 4px;"></td>
            </tr>
            <tr class="me-modal-row">
              <td class="me-modal-label">Width (mm)</td>
              <td><input id="bb-width" type="number" step="1" value="${bb.width}" style="width:100%;font-family:var(--font-mono);font-size:12px;border:1px solid var(--border);padding:2px 4px;"></td>
            </tr>
            <tr class="me-modal-row">
              <td class="me-modal-label">Height (mm)</td>
              <td><input id="bb-height" type="number" step="1" value="${bb.height}" style="width:100%;font-family:var(--font-mono);font-size:12px;border:1px solid var(--border);padding:2px 4px;"></td>
            </tr>
            <tr class="me-modal-row">
              <td class="me-modal-label">Reference offset X (mm)</td>
              <td><input id="bb-refx" type="number" step="1" value="${bb.refOffsetX}" style="width:100%;font-family:var(--font-mono);font-size:12px;border:1px solid var(--border);padding:2px 4px;"></td>
            </tr>
            <tr class="me-modal-row">
              <td class="me-modal-label">Reference offset Y (mm)</td>
              <td><input id="bb-refy" type="number" step="1" value="${bb.refOffsetY}" style="width:100%;font-family:var(--font-mono);font-size:12px;border:1px solid var(--border);padding:2px 4px;"></td>
            </tr>
          </tbody>
        </table>
      `;
    };
    render();
    foot.innerHTML = `
      <button class="me-modal-btn me-modal-btn--primary" id="bb-ok">Ok</button>
      <button class="me-modal-btn" id="bb-cancel">Cancel</button>
    `;
    foot.querySelector('#bb-ok').addEventListener('click', () => {
      const q = id => parseFloat(body.querySelector(id).value) || 0;
      p.vehicleBoundingBox = {
        length:     q('#bb-length'),
        width:      q('#bb-width'),
        height:     q('#bb-height'),
        refOffsetX: q('#bb-refx'),
        refOffsetY: q('#bb-refy'),
      };
      close(); refreshPropertiesFor(p);
    });
    foot.querySelector('#bb-cancel').addEventListener('click', () => {
      p.vehicleBoundingBox = backup; close();
    });
  }

  function openMiscPropertiesDialog(p) {
    const backup = JSON.parse(JSON.stringify(p.miscProperties));
    let selIdx = -1;
    const { body, foot, close } = createModal('Edit key-value pairs', 480);

    function render() {
      body.innerHTML = `
        <div style="display:flex;gap:8px;height:240px;">
          <div style="flex:1;overflow:auto;border:1px solid var(--border);">
            <table style="width:100%;border-collapse:collapse;font-size:12px;font-family:var(--font-mono);">
              <thead>
                <tr style="background:#e8e5de;">
                  <th style="padding:4px 8px;text-align:left;border-bottom:1px solid var(--border);width:45%;">Key</th>
                  <th style="padding:4px 8px;text-align:left;border-bottom:1px solid var(--border);">Value</th>
                </tr>
              </thead>
              <tbody id="misc-rows">
                ${p.miscProperties.length === 0
                  ? '<tr><td colspan="2" style="padding:8px;color:var(--muted);text-align:center;">No properties</td></tr>'
                  : p.miscProperties.map((kv, i) => `
                    <tr class="misc-row${i === selIdx ? ' is-selected' : ''}" data-idx="${i}"
                      style="cursor:pointer;${i === selIdx ? 'background:#cfe8ff;' : ''}">
                      <td style="padding:3px 8px;border-bottom:1px solid #eee;">${kv.key}</td>
                      <td style="padding:3px 8px;border-bottom:1px solid #eee;">${kv.value}</td>
                    </tr>`).join('')}
              </tbody>
            </table>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;padding-top:2px;">
            <button id="misc-add" class="me-modal-btn">Add</button>
            <button id="misc-edit" class="me-modal-btn" ${selIdx < 0 ? 'disabled' : ''}>Edit</button>
            <button id="misc-remove" class="me-modal-btn" ${selIdx < 0 ? 'disabled' : ''}>Remove</button>
          </div>
        </div>
      `;

      body.querySelectorAll('.misc-row').forEach(row => {
        row.addEventListener('click', () => {
          selIdx = parseInt(row.dataset.idx);
          render();
        });
        row.addEventListener('dblclick', () => {
          selIdx = parseInt(row.dataset.idx);
          openEditKVDialog(p.miscProperties[selIdx], saved => {
            p.miscProperties[selIdx] = saved; render();
          });
        });
      });

      body.querySelector('#misc-add').addEventListener('click', () => {
        openEditKVDialog({ key: '', value: '' }, saved => {
          p.miscProperties.push(saved); selIdx = p.miscProperties.length - 1; render();
        });
      });

      body.querySelector('#misc-edit').addEventListener('click', () => {
        if (selIdx < 0) return;
        openEditKVDialog(p.miscProperties[selIdx], saved => {
          p.miscProperties[selIdx] = saved; render();
        });
      });

      body.querySelector('#misc-remove').addEventListener('click', () => {
        if (selIdx < 0) return;
        p.miscProperties.splice(selIdx, 1);
        selIdx = Math.min(selIdx, p.miscProperties.length - 1);
        render();
      });
    }

    render();
    foot.innerHTML = `
      <button class="me-modal-btn me-modal-btn--primary" id="misc-ok">Ok</button>
      <button class="me-modal-btn" id="misc-cancel">Cancel</button>
    `;
    foot.querySelector('#misc-ok').addEventListener('click', () => {
      close(); refreshPropertiesFor(p);
    });
    foot.querySelector('#misc-cancel').addEventListener('click', () => {
      p.miscProperties = backup; close(); refreshPropertiesFor(p);
    });
  }

  function openEditKVDialog(kv, onSave) {
    const draft = { ...kv };
    const { body, foot, close } = createModal('Edit key-value pair', 360);
    body.innerHTML = `
      <table class="me-modal-table" style="width:100%">
        <tbody>
          <tr class="me-modal-row">
            <td class="me-modal-label">Key</td>
            <td><input id="kv-key" type="text" value="${draft.key}"
              style="width:100%;font-family:var(--font-mono);font-size:12px;border:1px solid var(--border);padding:2px 4px;"></td>
          </tr>
          <tr class="me-modal-row">
            <td class="me-modal-label">Value</td>
            <td><input id="kv-value" type="text" value="${draft.value}"
              style="width:100%;font-family:var(--font-mono);font-size:12px;border:1px solid var(--border);padding:2px 4px;"></td>
          </tr>
        </tbody>
      </table>
      <div id="kv-err" class="me-modal-validation" style="display:none;"></div>
    `;
    foot.innerHTML = `
      <button class="me-modal-btn me-modal-btn--primary" id="kv-ok">Ok</button>
      <button class="me-modal-btn" id="kv-cancel">Cancel</button>
    `;
    foot.querySelector('#kv-ok').addEventListener('click', () => {
      const key = body.querySelector('#kv-key').value.trim();
      const value = body.querySelector('#kv-value').value;
      const err = body.querySelector('#kv-err');
      if (!key) {
        err.textContent = 'Key must not be empty.';
        err.style.display = 'block';
        return;
      }
      onSave({ key, value });
      close();
    });
    foot.querySelector('#kv-cancel').addEventListener('click', () => close());
  }

  function openEditEnvelopeDialog(envelope, onSave) {
    const draft = JSON.parse(JSON.stringify(envelope));
    const { body, foot, close } = createModal('Edit envelope', 520);
    let selCoord = -1;

    function validate() {
      const n = draft.coords.length;
      if (n === 0 || n >= 3) return { ok: true,  msg: 'The envelope is valid.' };
      return { ok: false, msg: `Invalid: need at least 3 coordinates (currently ${n}).` };
    }

    function render() {
      const v = validate();
      body.innerHTML = `
        <div style="margin-bottom:10px;">
          <span class="me-modal-label">Envelope key (drop down for keys used in plant model):</span>
          <input id="ekey" class="me-modal-key-input" type="text" value="${draft.key}">
        </div>
        <span class="me-modal-label">Envelope coordinates:</span>
        <div style="display:flex;gap:10px;align-items:flex-start;">
          <table class="me-modal-table" style="flex:1;">
            <thead><tr><th>X</th><th>Y</th></tr></thead>
            <tbody>
              ${draft.coords.map((c, i) => `
                <tr class="me-modal-row${selCoord === i ? ' is-selected' : ''}" data-idx="${i}">
                  <td><input type="number" value="${c.x}" data-field="x" data-idx="${i}"></td>
                  <td><input type="number" value="${c.y}" data-field="y" data-idx="${i}"></td>
                </tr>`).join('')}
            </tbody>
          </table>
          <div style="display:flex;flex-direction:column;gap:4px;padding-top:24px;">
            <button class="me-modal-btn" id="coord-add">Add</button>
            <button class="me-modal-btn" id="coord-remove" ${selCoord < 0 ? 'disabled' : ''}>Remove</button>
            <button class="me-modal-btn" id="coord-up"    ${selCoord <= 0 ? 'disabled' : ''}>Up</button>
            <button class="me-modal-btn" id="coord-down"  ${selCoord < 0 || selCoord >= draft.coords.length - 1 ? 'disabled' : ''}>Down</button>
          </div>
        </div>
        <div class="me-modal-validation">
          <div class="me-modal-validation__label">Envelope validation:</div>
          <div class="me-modal-validation__msg me-modal-validation__msg--${v.ok ? 'ok' : 'warn'}">${v.msg}</div>
        </div>
      `;

      body.querySelector('#ekey').addEventListener('input', e => { draft.key = e.target.value; });

      body.querySelectorAll('input[data-field]').forEach(input => {
        input.addEventListener('change', e => {
          draft.coords[+e.target.dataset.idx][e.target.dataset.field] = parseFloat(e.target.value) || 0;
          // re-validate without full re-render
          const v2 = validate();
          const msgEl = body.querySelector('.me-modal-validation__msg');
          msgEl.textContent = v2.msg;
          msgEl.className = `me-modal-validation__msg me-modal-validation__msg--${v2.ok ? 'ok' : 'warn'}`;
        });
      });

      body.querySelectorAll('.me-modal-row').forEach(row => {
        row.addEventListener('click', () => { selCoord = +row.dataset.idx; render(); });
      });

      body.querySelector('#coord-add').addEventListener('click', () => {
        draft.coords.push({ x: 0, y: 0 }); selCoord = draft.coords.length - 1; render();
      });
      body.querySelector('#coord-remove').addEventListener('click', () => {
        if (selCoord < 0) return;
        draft.coords.splice(selCoord, 1);
        selCoord = Math.min(selCoord, draft.coords.length - 1);
        render();
      });
      body.querySelector('#coord-up').addEventListener('click', () => {
        if (selCoord <= 0) return;
        [draft.coords[selCoord - 1], draft.coords[selCoord]] = [draft.coords[selCoord], draft.coords[selCoord - 1]];
        selCoord--; render();
      });
      body.querySelector('#coord-down').addEventListener('click', () => {
        if (selCoord >= draft.coords.length - 1) return;
        [draft.coords[selCoord + 1], draft.coords[selCoord]] = [draft.coords[selCoord], draft.coords[selCoord + 1]];
        selCoord++; render();
      });
    }

    render();

    foot.innerHTML = `
      <button class="me-modal-btn me-modal-btn--primary" id="ee-ok">Ok</button>
      <button class="me-modal-btn" id="ee-cancel">Cancel</button>
    `;
    foot.querySelector('#ee-ok').addEventListener('click', () => { onSave(draft); close(); });
    foot.querySelector('#ee-cancel').addEventListener('click', () => close());
  }

  function openSupportedOpsDialog(lt, field, title) {
    const backup = [...lt[field]];
    let selIdx = -1;
    const { body, foot, close } = createModal(title, 480);

    function render() {
      body.innerHTML = `
        <div style="display:flex;gap:8px;height:240px;">
          <div style="flex:1;overflow:auto;border:1px solid var(--border);">
            <table style="width:100%;border-collapse:collapse;font-size:12px;font-family:var(--font-mono);">
              <thead>
                <tr style="background:#e8e5de;">
                  <th style="padding:4px 8px;text-align:left;border-bottom:1px solid var(--border);">Operation</th>
                </tr>
              </thead>
              <tbody>
                ${lt[field].length === 0
                  ? '<tr><td style="padding:8px;color:var(--muted);text-align:center;">No operations defined</td></tr>'
                  : lt[field].map((op, i) => `
                    <tr class="sops-row${i === selIdx ? ' is-selected' : ''}" data-idx="${i}"
                      style="cursor:pointer;${i === selIdx ? 'background:#cfe8ff;' : ''}">
                      <td style="padding:3px 8px;border-bottom:1px solid #eee;">${op}</td>
                    </tr>`).join('')}
              </tbody>
            </table>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;padding-top:2px;">
            <button id="sops-add"    class="me-modal-btn">Add</button>
            <button id="sops-edit"   class="me-modal-btn" ${selIdx < 0 ? 'disabled' : ''}>Edit</button>
            <button id="sops-remove" class="me-modal-btn" ${selIdx < 0 ? 'disabled' : ''}>Remove</button>
          </div>
        </div>
      `;

      body.querySelectorAll('.sops-row').forEach(row => {
        row.addEventListener('click', () => { selIdx = +row.dataset.idx; render(); });
        row.addEventListener('dblclick', () => {
          selIdx = +row.dataset.idx;
          openEditOpDialog(lt[field][selIdx], saved => { lt[field][selIdx] = saved; render(); });
        });
      });

      body.querySelector('#sops-add').addEventListener('click', () => {
        openEditOpDialog('', saved => { lt[field].push(saved); selIdx = lt[field].length - 1; render(); });
      });
      body.querySelector('#sops-edit').addEventListener('click', () => {
        if (selIdx < 0) return;
        openEditOpDialog(lt[field][selIdx], saved => { lt[field][selIdx] = saved; render(); });
      });
      body.querySelector('#sops-remove').addEventListener('click', () => {
        if (selIdx < 0) return;
        lt[field].splice(selIdx, 1);
        selIdx = Math.min(selIdx, lt[field].length - 1);
        render();
      });
    }

    render();
    foot.innerHTML = `
      <button class="me-modal-btn me-modal-btn--primary" id="sops-ok">Ok</button>
      <button class="me-modal-btn" id="sops-cancel">Cancel</button>
    `;
    foot.querySelector('#sops-ok').addEventListener('click', () => { close(); refreshPropertiesFor(lt); });
    foot.querySelector('#sops-cancel').addEventListener('click', () => { lt[field] = backup; close(); refreshPropertiesFor(lt); });
  }

  function openEditOpDialog(op, onSave) {
    const { body, foot, close } = createModal('Edit operation', 360);
    body.innerHTML = `
      <table class="me-modal-table" style="width:100%">
        <tbody>
          <tr class="me-modal-row">
            <td class="me-modal-label">Operation</td>
            <td><input id="op-value" type="text" value="${op}" placeholder="Operation name"
              style="width:100%;font-family:var(--font-mono);font-size:12px;border:1px solid var(--border);padding:2px 4px;"></td>
          </tr>
        </tbody>
      </table>
      <div id="op-err" class="me-modal-validation" style="display:none;"></div>
    `;
    foot.innerHTML = `
      <button class="me-modal-btn me-modal-btn--primary" id="op-ok">Ok</button>
      <button class="me-modal-btn" id="op-cancel">Cancel</button>
    `;
    foot.querySelector('#op-ok').addEventListener('click', () => {
      const value = body.querySelector('#op-value').value.trim();
      const err = body.querySelector('#op-err');
      if (!value) { err.textContent = 'Operation must not be empty.'; err.style.display = 'block'; return; }
      onSave(value);
      close();
    });
    foot.querySelector('#op-cancel').addEventListener('click', () => close());
  }

  // ── Location drawing ─────────────────────────────────────────
  const LOC_HALF = 12; // half-width of location rectangle in world units
  const LOC_STROKE     = '#7c3aed';
  const LOC_STROKE_SEL = '#f59e0b';

  const LOC_SYM_CHARS = { DEFAULT: 'L', LOAD_TRANSFER_STATION: 'L', RECHARGE_STATION: 'R', WORKING_STATION: 'W', NONE: '' };

  function setLocationStyle(loc, selected) {
    if (!loc?.konvaGroup) return;
    const rect = loc.konvaGroup.findOne('.loc-rect');
    const lbl  = loc.konvaGroup.findOne('.label');
    const sym  = loc.konvaGroup.findOne('.loc-sym');
    if (selected) {
      rect?.stroke(LOC_STROKE_SEL); rect?.strokeWidth(2);
      lbl?.fill('#b45309');
      sym?.fill(LOC_STROKE_SEL);
    } else {
      rect?.stroke(LOC_STROKE); rect?.strokeWidth(1.5); rect?.dash([]);
      lbl?.fill(LOC_STROKE);
      sym?.fill(LOC_STROKE);
    }
    getLayer(loc.layerId)?.konvaLayer.batchDraw();
  }

  function drawLocation(loc) {
    const layer = getLayer(loc.layerId);
    if (!layer?.worldGroup) return;
    if (loc.konvaGroup) loc.konvaGroup.destroy();

    const g = new Konva.Group({ x: loc.x, y: -loc.y, id: loc.id });

    g.add(new Konva.Rect({
      name: 'loc-rect',
      x: -LOC_HALF, y: -LOC_HALF,
      width: LOC_HALF * 2, height: LOC_HALF * 2,
      fill: '#f3eefe',
      stroke: LOC_STROKE,
      strokeWidth: 1.5,
      strokeScaleEnabled: false,
      cornerRadius: 2,
    }));

    if (loc.symbol === 'RECHARGE_STATION') {
      g.add(new Konva.Path({
        name: 'loc-sym',
        x: -10, y: -10,
        scaleX: 1.25, scaleY: 1.25,
        data: 'M11.251.068a.5.5 0 0 1 .227.58L9.677 6.5H13a.5.5 0 0 1 .364.843l-8 8.5a.5.5 0 0 1-.842-.49L6.323 9.5H3a.5.5 0 0 1-.364-.843l8-8.5a.5.5 0 0 1 .615-.09z',
        fill: LOC_STROKE,
        listening: false,
      }));
    } else if (loc.symbol === 'WORKING_STATION') {
      g.add(new Konva.Path({
        name: 'loc-sym',
        x: -10, y: -10,
        scaleX: 1.25, scaleY: 1.25,
        data: 'M9.972 2.508a.5.5 0 0 0-.16-.556l-.178-.129a5 5 0 0 0-2.076-.783C6.215.862 4.504 1.229 2.84 3.133H1.786a.5.5 0 0 0-.354.147L.146 4.567a.5.5 0 0 0 0 .706l2.571 2.579a.5.5 0 0 0 .708 0l1.286-1.29a.5.5 0 0 0 .146-.353V5.57l8.387 8.873A.5.5 0 0 0 14 14.5l1.5-1.5a.5.5 0 0 0 .017-.689l-9.129-8.63c.747-.456 1.772-.839 3.112-.839a.5.5 0 0 0 .472-.334',
        fill: LOC_STROKE,
        listening: false,
      }));
    } else {
      g.add(new Konva.Text({
        name: 'loc-sym',
        x: -LOC_HALF, y: -6,
        width: LOC_HALF * 2,
        text: LOC_SYM_CHARS[loc.symbol] ?? 'L',
        fontSize: 12,
        fontFamily: 'IBM Plex Mono, monospace',
        fill: LOC_STROKE,
        align: 'center',
        listening: false,
      }));
    }

    g.add(new Konva.Text({
      name: 'label',
      x: loc.labelXOffset,
      y: loc.labelYOffset,
      rotation: isNaN(loc.labelOrientationAngle) ? 0 : loc.labelOrientationAngle,
      text: loc.name,
      fontSize: 11,
      fontFamily: 'IBM Plex Mono, monospace',
      fill: LOC_STROKE,
      listening: false,
    }));

    g.draggable(true);

    g.on('dragstart', e => {
      e.cancelBubble = true;
      if (getLayer(loc.layerId)?.locked || loc.locked) { g.stopDrag(); return; }
      pushUndoState();
      stage.container().style.cursor = 'grabbing';
      selectLocation(loc.id);
    });

    g.on('dragmove', () => {
      if (snapEnabled) {
        const step = getSnapStep();
        g.x(Math.round(g.x() / step) * step);
        g.y(Math.round(g.y() / step) * step);
      }
      loc.x = g.x(); loc.y = -g.y();
      const panel = document.getElementById('properties-panel');
      const xi = panel.querySelector('.pp-loc-x');
      const yi = panel.querySelector('.pp-loc-y');
      if (xi) xi.value = Math.round(loc.x);
      if (yi) yi.value = Math.round(loc.y);
      links.filter(lk => lk.locationId === loc.id).forEach(lk => updateLinkGeometry(lk));
    });

    g.on('dragend', () => {
      loc.x = g.x(); loc.y = -g.y();
      stage.container().style.cursor = 'pointer';
      renderLocationProperties(loc);
    });

    g.on('click', e => {
      e.cancelBubble = true;
      if ((activeTool === 'Path' || activeTool === 'Link') && pathStartId) {
        const existing = links.find(lk => lk.pointId === pathStartId && lk.locationId === loc.id);
        if (!existing) {
          pushUndoState();
          const lk = createLink(pathStartId, loc.id, activeLayerId);
          drawLink(lk);
          renderComponentsTree();
          selectLink(lk.id);
        }
        cancelPathTool();
        return;
      }
      if (e.evt.shiftKey) {
        // Promote any prior single selection into multiSelection
        if (selectedPointId) {
          multiSelection.push({ id: selectedPointId, kind: 'point' });
          setPointMultiStyle(getPoint(selectedPointId));
          selectedPointId = null;
        }
        if (selectedLocationId && selectedLocationId !== loc.id) {
          multiSelection.push({ id: selectedLocationId, kind: 'location' });
          setLocationMultiStyle(getLocation(selectedLocationId));
          selectedLocationId = null;
        } else if (selectedLocationId) {
          setLocationStyle(getLocation(selectedLocationId), false);
          selectedLocationId = null;
        }
        if (selectedPathId) { const prev = getPath(selectedPathId); setPathStyle(prev, false); if (needsHandleRedraw(prev)) drawPath(prev, false); selectedPathId = null; }
        if (selectedLinkId) { setLinkStyle(getLink(selectedLinkId), false); selectedLinkId = null; }
        if (selectedLtId) { selectedLtId = null; }
        if (selectedBlockId) { selectedBlockId = null; }
        if (selectedVehicleId) { selectedVehicleId = null; }
        const idx = multiSelection.findIndex(s => s.id === loc.id);
        if (idx !== -1) {
          multiSelection.splice(idx, 1);
          setLocationStyle(loc, false);
        } else {
          multiSelection.push({ id: loc.id, kind: 'location' });
          setLocationMultiStyle(loc);
        }
        renderPropertiesPanel(null);
        return;
      }
      clearMultiSelection();
      selectLocation(loc.id);
    });

    g.on('mouseenter', () => {
      stage.container().style.cursor = (activeTool === 'Path' || activeTool === 'Link') ? 'crosshair' : 'pointer';
    });
    g.on('mouseleave', () => {
      stage.container().style.cursor = (activeTool === 'Location' || activeTool === 'Path' || activeTool === 'Link' || activeTool === 'AreaSelect') ? 'crosshair' : 'grab';
    });

    loc.konvaGroup = g;
    layer.worldGroup.add(g);
    layer.konvaLayer.batchDraw();
  }

  // ── Location properties ───────────────────────────────────────
  function renderLocationProperties(loc) {
    const panel = document.getElementById('properties-panel');
    if (!panel) return;

    const symOpts = ['DEFAULT', 'NONE', 'LOAD_TRANSFER_STATION', 'RECHARGE_STATION', 'WORKING_STATION'];

    panel.innerHTML = `
      <div class="me-selection">
        <svg class="me-selection__icon"><use href="#icon-location"/></svg>
        <div class="pp-name-wrap">
          <span class="pp-name">${loc.name}</span>
        </div>
      </div>
      <table class="pp-table">
        <thead><tr><th>Attribute</th><th>Value</th></tr></thead>
        <tbody>
          <tr>
            <td>Name</td>
            <td><input class="pp-loc-name" type="text" value="${loc.name}"></td>
          </tr>
          <tr>
            <td>x-Position</td>
            <td><div class="pp-val-row">
              <input class="pp-loc-x" type="number" step="any" value="${loc.x.toFixed(1)}">
              <span class="pp-unit">mm</span>
            </div></td>
          </tr>
          <tr>
            <td>y-Position</td>
            <td><div class="pp-val-row">
              <input class="pp-loc-y" type="number" step="any" value="${loc.y.toFixed(1)}">
              <span class="pp-unit">mm</span>
            </div></td>
          </tr>
          <tr>
            <td>Type</td>
            <td>
              <select class="pp-loc-type" style="width:100%;font-size:12px;">
                <option value="" ${!loc.type ? 'selected' : ''}>— None —</option>
                ${locationTypes.map(lt => `<option value="${lt.id}" ${loc.type === lt.id ? 'selected' : ''}>${lt.name}</option>`).join('')}
              </select>
            </td>
          </tr>
          <tr>
            <td>Locked</td>
            <td><input class="pp-loc-locked" type="checkbox" ${loc.locked ? 'checked' : ''}></td>
          </tr>
          <tr>
            <td>Symbol</td>
            <td>
              <select class="pp-loc-symbol" style="width:100%;font-size:12px;">
                ${symOpts.map(s => `<option value="${s}" ${loc.symbol === s ? 'selected' : ''}>${s}</option>`).join('')}
              </select>
            </td>
          </tr>
          <tr>
            <td>Label x offset</td>
            <td><input class="pp-loc-lxoff" type="number" step="any" value="${loc.labelXOffset}"></td>
          </tr>
          <tr>
            <td>Label y offset</td>
            <td><input class="pp-loc-lyoff" type="number" step="any" value="${loc.labelYOffset}"></td>
          </tr>
          <tr>
            <td>Label orientation angle</td>
            <td><input class="pp-loc-langle" type="number" step="any" value="${isNaN(loc.labelOrientationAngle) ? '' : loc.labelOrientationAngle}"></td>
          </tr>
          <tr>
            <td>Layer</td>
            <td><select class="pp-loc-layer" style="width:100%;font-size:12px;">
              ${layers.map(l => `<option value="${l.id}" ${l.id === loc.layerId ? 'selected' : ''}>${l.name}</option>`).join('')}
            </select></td>
          </tr>
          <tr>
            <td>Reservation token</td>
            <td><input class="pp-loc-token" type="text" value="${loc.reservationToken}"
              style="width:100%;font-family:var(--font-mono);font-size:11px;border:1px solid var(--border);padding:1px 4px;"></td>
          </tr>
          <tr>
            <td>Peripheral state</td>
            <td><span class="pp-ro-val">${loc.peripheralState || ''}</span></td>
          </tr>
          <tr>
            <td>Processing state</td>
            <td><span class="pp-ro-val">${loc.processingState || ''}</span></td>
          </tr>
          <tr>
            <td>Peripheral job</td>
            <td><span class="pp-ro-val">${loc.peripheralJob || ''}</span></td>
          </tr>
          <tr class="pp-section"><td colspan="2">Miscellaneous</td></tr>
          <tr>
            <td>Properties</td>
            <td>
              <button class="pp-loc-misc-btn" style="font-family:var(--font-mono);font-size:11px;
                border:1px solid var(--border);background:#f3f1ec;padding:1px 8px;
                border-radius:2px;cursor:pointer;width:100%;text-align:left;">
                ${loc.miscProperties.length === 0 ? 'None defined…' : `${loc.miscProperties.length} pair(s)…`}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="pp-delete-zone">
        <button class="pp-delete" data-action="delete-location">Delete location</button>
      </div>
    `;

    const q = sel => panel.querySelector(sel);

    q('[data-action="delete-location"]').addEventListener('click', () => removeLocation(loc.id));

    q('.pp-loc-name').addEventListener('change', e => {
      const val = e.target.value.trim();
      if (!val) { e.target.value = loc.name; return; }
      loc.name = val;
      loc.konvaGroup?.findOne('.label')?.text(loc.name);
      getLayer(loc.layerId)?.konvaLayer.batchDraw();
      panel.querySelector('.pp-name').textContent = loc.name;
      renderComponentsTree();
    });

    q('.pp-loc-x').addEventListener('change', e => {
      loc.x = parseFloat(e.target.value) || loc.x;
      loc.konvaGroup?.position({ x: loc.x, y: -loc.y });
      getLayer(loc.layerId)?.konvaLayer.batchDraw();
    });

    q('.pp-loc-y').addEventListener('change', e => {
      loc.y = parseFloat(e.target.value) || loc.y;
      loc.konvaGroup?.position({ x: loc.x, y: -loc.y });
      getLayer(loc.layerId)?.konvaLayer.batchDraw();
    });

    q('.pp-loc-type').addEventListener('change', e => { loc.type = e.target.value || null; });

    q('.pp-loc-locked').addEventListener('change', e => { loc.locked = e.target.checked; });

    q('.pp-loc-symbol').addEventListener('change', e => {
      loc.symbol = e.target.value;
      drawLocation(loc);           // redraw to swap Text ↔ Path for the symbol
      setLocationStyle(loc, true); // restore selected state after redraw
    });

    q('.pp-loc-lxoff').addEventListener('change', e => {
      loc.labelXOffset = parseFloat(e.target.value) || 0;
      loc.konvaGroup?.findOne('.label')?.x(loc.labelXOffset);
      getLayer(loc.layerId)?.konvaLayer.batchDraw();
    });

    q('.pp-loc-lyoff').addEventListener('change', e => {
      loc.labelYOffset = parseFloat(e.target.value) || 0;
      loc.konvaGroup?.findOne('.label')?.y(loc.labelYOffset);
      getLayer(loc.layerId)?.konvaLayer.batchDraw();
    });

    q('.pp-loc-langle').addEventListener('change', e => {
      loc.labelOrientationAngle = parseFloat(e.target.value);
      loc.konvaGroup?.findOne('.label')?.rotation(isNaN(loc.labelOrientationAngle) ? 0 : loc.labelOrientationAngle);
      getLayer(loc.layerId)?.konvaLayer.batchDraw();
    });

    q('.pp-loc-layer').addEventListener('change', e => {
      const newLayerId = e.target.value;
      if (newLayerId === loc.layerId) return;
      const oldLayer = getLayer(loc.layerId);
      const newLayer = getLayer(newLayerId);
      if (!oldLayer || !newLayer?.worldGroup) return;
      loc.konvaGroup.moveTo(newLayer.worldGroup);
      oldLayer.konvaLayer.batchDraw();
      newLayer.konvaLayer.batchDraw();
      loc.layerId = newLayerId;
    });

    q('.pp-loc-token').addEventListener('change', e => { loc.reservationToken = e.target.value; });

    q('.pp-loc-misc-btn').addEventListener('click', () => openMiscPropertiesDialog(loc));
  }

  // ── Link drawing ──────────────────────────────────────────────
  const LINK_STROKE     = '#059669';
  const LINK_STROKE_SEL = '#f97316';

  function linkPts(lk) {
    const pt  = getPoint(lk.pointId);
    const loc = getLocation(lk.locationId);
    if (!pt || !loc) return [0, 0, 0, 0];
    return [pt.x, -pt.y, loc.x, -loc.y];
  }

  function linkEndPos(lk) {
    const pt  = getPoint(lk.pointId);
    const loc = getLocation(lk.locationId);
    if (!pt || !loc) return { ptX: 0, ptY: 0, locX: 0, locY: 0 };
    return { ptX: pt.x, ptY: -pt.y, locX: loc.x, locY: -loc.y };
  }

  function setLinkStyle(lk, selected) {
    if (!lk?.konvaGroup) return;
    const col = selected ? LINK_STROKE_SEL : LINK_STROKE;
    lk.konvaGroup.findOne('.link-line')?.stroke(col);
    lk.konvaGroup.findOne('.link-dot-pt')?.fill(col);
    lk.konvaGroup.findOne('.link-dot-loc')?.fill(col);
    getLayer(lk.layerId)?.konvaLayer.batchDraw();
  }

  function drawLink(lk) {
    const layer = getLayer(lk.layerId);
    if (!layer?.worldGroup) return;
    if (lk.konvaGroup) lk.konvaGroup.destroy();

    const g = new Konva.Group({ id: lk.id });

    g.add(new Konva.Line({
      name: 'link-hit',
      points: linkPts(lk),
      stroke: 'transparent',
      strokeWidth: 12,
      strokeScaleEnabled: false,
      listening: true,
    }));

    g.add(new Konva.Line({
      name: 'link-line',
      points: linkPts(lk),
      stroke: LINK_STROKE,
      strokeWidth: 1.5,
      dash: [6, 4],
      strokeScaleEnabled: false,
      listening: false,
    }));

    const { ptX, ptY, locX, locY } = linkEndPos(lk);
    g.add(new Konva.Circle({
      name: 'link-dot-pt',
      x: ptX, y: ptY, radius: 3,
      fill: LINK_STROKE, strokeWidth: 0,
      strokeScaleEnabled: false, listening: false,
    }));
    g.add(new Konva.Circle({
      name: 'link-dot-loc',
      x: locX, y: locY, radius: 3,
      fill: LINK_STROKE, strokeWidth: 0,
      strokeScaleEnabled: false, listening: false,
    }));

    g.on('click', e => { e.cancelBubble = true; selectLink(lk.id); });
    g.on('mouseenter', () => { stage.container().style.cursor = 'pointer'; });
    g.on('mouseleave', () => {
      stage.container().style.cursor = (activeTool === 'Path' || activeTool === 'Link' || activeTool === 'AreaSelect') ? 'crosshair' : 'grab';
    });

    lk.konvaGroup = g;
    layer.worldGroup.add(g);
    g.moveToBottom();
    layer.konvaLayer.batchDraw();
  }

  function updateLinkGeometry(lk) {
    if (!lk.konvaGroup) return;
    const pts = linkPts(lk);
    lk.konvaGroup.findOne('.link-hit')?.points(pts);
    lk.konvaGroup.findOne('.link-line')?.points(pts);
    const { ptX, ptY, locX, locY } = linkEndPos(lk);
    lk.konvaGroup.findOne('.link-dot-pt')?.position({ x: ptX, y: ptY });
    lk.konvaGroup.findOne('.link-dot-loc')?.position({ x: locX, y: locY });
    getLayer(lk.layerId)?.konvaLayer.batchDraw();
  }

  // ── Link properties ───────────────────────────────────────────
  function renderLinkProperties(lk) {
    const panel = document.getElementById('properties-panel');
    if (!panel) return;
    const pt  = getPoint(lk.pointId);
    const loc = getLocation(lk.locationId);

    panel.innerHTML = `
      <div class="me-selection">
        <svg class="me-selection__icon"><use href="#icon-link"/></svg>
        <div class="pp-name-wrap">
          <span class="pp-name">${lk.name}</span>
        </div>
      </div>
      <table class="pp-table">
        <thead><tr><th>Attribute</th><th>Value</th></tr></thead>
        <tbody>
          <tr>
            <td>Name</td>
            <td><input class="pp-lk-name" type="text" value="${lk.name}"></td>
          </tr>
          <tr>
            <td>Actions</td>
            <td>
              <button class="pp-lk-actions-btn" style="font-family:var(--font-mono);font-size:11px;
                border:1px solid var(--border);background:#f3f1ec;padding:1px 8px;
                border-radius:2px;cursor:pointer;width:100%;text-align:left;">
                ${lk.actions.length === 0 ? 'None defined…' : `${lk.actions.length} action(s)…`}
              </button>
            </td>
          </tr>
          <tr>
            <td>Start Component</td>
            <td><span class="pp-ro-val">${pt?.name ?? '—'}</span></td>
          </tr>
          <tr>
            <td>End Component</td>
            <td><span class="pp-ro-val">${loc?.name ?? '—'}</span></td>
          </tr>
          <tr>
            <td>Layer</td>
            <td><select class="pp-lk-layer" style="width:100%;font-size:12px;">
              ${layers.map(l => `<option value="${l.id}" ${l.id === lk.layerId ? 'selected' : ''}>${l.name}</option>`).join('')}
            </select></td>
          </tr>
        </tbody>
      </table>
      <div class="pp-delete-zone">
        <button class="pp-delete" data-action="delete-link">Delete link</button>
      </div>
    `;

    const q = sel => panel.querySelector(sel);

    q('[data-action="delete-link"]').addEventListener('click', () => removeLink(lk.id));

    q('.pp-lk-name').addEventListener('change', e => {
      const val = e.target.value.trim();
      if (!val) { e.target.value = lk.name; return; }
      lk.name = val;
      panel.querySelector('.pp-name').textContent = lk.name;
      renderComponentsTree();
    });

    q('.pp-lk-actions-btn').addEventListener('click', () => openActionsDialog(lk));

    q('.pp-lk-layer').addEventListener('change', e => {
      const newLayerId = e.target.value;
      if (newLayerId === lk.layerId) return;
      const oldLayer = getLayer(lk.layerId);
      const newLayer = getLayer(newLayerId);
      if (!oldLayer || !newLayer?.worldGroup) return;
      lk.konvaGroup.moveTo(newLayer.worldGroup);
      lk.konvaGroup.moveToBottom();
      oldLayer.konvaLayer.batchDraw();
      newLayer.konvaLayer.batchDraw();
      lk.layerId = newLayerId;
    });
  }

  function openActionsDialog(lk) {
    const backup = [...lk.actions];
    let selIdx = -1;
    const { body, foot, close } = createModal('Actions', 480);

    function getAvailableOps() {
      const loc = getLocation(lk.locationId);
      if (!loc || !loc.type) return [];
      const lt = getLocationType(loc.type);
      if (!lt) return [];
      return [...lt.supportedVehicleOperations];
    }

    function render() {
      body.innerHTML = `
        <div style="display:flex;gap:8px;height:260px;">
          <div style="flex:1;overflow:auto;border:1px solid var(--border);">
            <table style="width:100%;border-collapse:collapse;font-size:12px;font-family:var(--font-mono);">
              <thead>
                <tr style="background:#e8e5de;">
                  <th style="padding:4px 8px;text-align:left;border-bottom:1px solid var(--border);">Action</th>
                </tr>
              </thead>
              <tbody>
                ${lk.actions.length === 0
                  ? '<tr><td style="padding:8px;color:var(--muted);text-align:center;">No actions defined</td></tr>'
                  : lk.actions.map((a, i) => `
                    <tr class="lkact-row${i === selIdx ? ' is-selected' : ''}" data-idx="${i}"
                      style="cursor:pointer;${i === selIdx ? 'background:#cfe8ff;' : ''}">
                      <td style="padding:3px 8px;border-bottom:1px solid #eee;">${a}</td>
                    </tr>`).join('')}
              </tbody>
            </table>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;padding-top:2px;min-width:80px;">
            <button id="lkact-add"    class="me-modal-btn">Add</button>
            <button id="lkact-edit"   class="me-modal-btn" ${selIdx < 0 ? 'disabled' : ''}>Edit</button>
            <button id="lkact-remove" class="me-modal-btn" ${selIdx < 0 ? 'disabled' : ''}>Remove</button>
            <div style="flex:1"></div>
            <button id="lkact-up"   class="me-modal-btn" ${selIdx <= 0 ? 'disabled' : ''}>Up</button>
            <button id="lkact-down" class="me-modal-btn" ${selIdx < 0 || selIdx >= lk.actions.length - 1 ? 'disabled' : ''}>Down</button>
          </div>
        </div>
      `;

      body.querySelectorAll('.lkact-row').forEach(row => {
        row.addEventListener('click', () => { selIdx = +row.dataset.idx; render(); });
        row.addEventListener('dblclick', () => {
          selIdx = +row.dataset.idx;
          openEditActionDialog(lk.actions[selIdx], getAvailableOps(), saved => {
            lk.actions[selIdx] = saved; render();
          });
        });
      });

      body.querySelector('#lkact-add').addEventListener('click', () => {
        const ops = getAvailableOps();
        openEditActionDialog(ops[0] ?? '', ops, saved => {
          lk.actions.push(saved); selIdx = lk.actions.length - 1; render();
        });
      });
      body.querySelector('#lkact-edit').addEventListener('click', () => {
        if (selIdx < 0) return;
        openEditActionDialog(lk.actions[selIdx], getAvailableOps(), saved => {
          lk.actions[selIdx] = saved; render();
        });
      });
      body.querySelector('#lkact-remove').addEventListener('click', () => {
        if (selIdx < 0) return;
        lk.actions.splice(selIdx, 1);
        selIdx = Math.min(selIdx, lk.actions.length - 1);
        render();
      });
      body.querySelector('#lkact-up').addEventListener('click', () => {
        if (selIdx <= 0) return;
        [lk.actions[selIdx - 1], lk.actions[selIdx]] = [lk.actions[selIdx], lk.actions[selIdx - 1]];
        selIdx--; render();
      });
      body.querySelector('#lkact-down').addEventListener('click', () => {
        if (selIdx < 0 || selIdx >= lk.actions.length - 1) return;
        [lk.actions[selIdx + 1], lk.actions[selIdx]] = [lk.actions[selIdx], lk.actions[selIdx + 1]];
        selIdx++; render();
      });
    }

    render();
    foot.innerHTML = `
      <button class="me-modal-btn me-modal-btn--primary" id="lkact-ok">Ok</button>
      <button class="me-modal-btn" id="lkact-cancel">Cancel</button>
    `;
    foot.querySelector('#lkact-ok').addEventListener('click', () => { close(); refreshPropertiesFor(lk); });
    foot.querySelector('#lkact-cancel').addEventListener('click', () => { lk.actions = backup; close(); refreshPropertiesFor(lk); });
  }

  function openEditActionDialog(currentValue, availableOps, onSave) {
    const { body, foot, close } = createModal('Edit action', 360);
    const hasOps = availableOps.length > 0;
    body.innerHTML = `
      <table class="me-modal-table" style="width:100%">
        <tbody>
          <tr class="me-modal-row">
            <td class="me-modal-label">Action</td>
            <td>
              ${hasOps
                ? `<select id="act-edit-val" style="width:100%;font-size:12px;border:1px solid var(--border);padding:2px 4px;">
                    ${availableOps.map(op => `<option value="${op}" ${op === currentValue ? 'selected' : ''}>${op}</option>`).join('')}
                  </select>`
                : `<input id="act-edit-val" type="text" value="${currentValue}" placeholder="Operation name"
                    style="width:100%;font-family:var(--font-mono);font-size:12px;border:1px solid var(--border);padding:2px 4px;">`
              }
            </td>
          </tr>
        </tbody>
      </table>
      <div id="act-edit-err" class="me-modal-validation" style="display:none;"></div>
    `;
    foot.innerHTML = `
      <button class="me-modal-btn me-modal-btn--primary" id="act-edit-ok">Ok</button>
      <button class="me-modal-btn" id="act-edit-cancel">Cancel</button>
    `;
    foot.querySelector('#act-edit-ok').addEventListener('click', () => {
      const value = body.querySelector('#act-edit-val').value.trim();
      const err = body.querySelector('#act-edit-err');
      if (!value) { err.textContent = 'Action must not be empty.'; err.style.display = 'block'; return; }
      onSave(value); close();
    });
    foot.querySelector('#act-edit-cancel').addEventListener('click', () => close());
  }

  // ── Location type properties ──────────────────────────────────
  function renderLocationTypeProperties(lt) {
    const panel = document.getElementById('properties-panel');
    if (!panel) return;

    panel.innerHTML = `
      <div class="me-selection">
        <svg class="me-selection__icon"><use href="#icon-location"/></svg>
        <div class="pp-name-wrap">
          <span class="pp-name">${lt.name}</span>
        </div>
      </div>
      <table class="pp-table">
        <thead><tr><th>Attribute</th><th>Value</th></tr></thead>
        <tbody>
          <tr>
            <td>Name</td>
            <td><input class="pp-lt-name" type="text" value="${lt.name}"></td>
          </tr>
          <tr class="pp-section"><td colspan="2">Supported vehicle operations</td></tr>
          <tr>
            <td>Operations</td>
            <td>
              <button class="pp-lt-veh-btn" style="font-family:var(--font-mono);font-size:11px;
                border:1px solid var(--border);background:#f3f1ec;padding:1px 8px;
                border-radius:2px;cursor:pointer;width:100%;text-align:left;">
                ${lt.supportedVehicleOperations.length === 0 ? 'None defined…' : `${lt.supportedVehicleOperations.length} operation(s)…`}
              </button>
            </td>
          </tr>
          <tr class="pp-section"><td colspan="2">Supported peripheral operations</td></tr>
          <tr>
            <td>Operations</td>
            <td>
              <button class="pp-lt-per-btn" style="font-family:var(--font-mono);font-size:11px;
                border:1px solid var(--border);background:#f3f1ec;padding:1px 8px;
                border-radius:2px;cursor:pointer;width:100%;text-align:left;">
                ${lt.supportedPeripheralOperations.length === 0 ? 'None defined…' : `${lt.supportedPeripheralOperations.length} operation(s)…`}
              </button>
            </td>
          </tr>
          <tr>
            <td>Symbol</td>
            <td>
              <select class="pp-lt-symbol" style="width:100%;font-size:12px;">
                <option value="NONE"                   ${lt.symbol === 'NONE'                   ? 'selected' : ''}>NONE</option>
                <option value="LOAD_TRANSFER_STATION"  ${lt.symbol === 'LOAD_TRANSFER_STATION'  ? 'selected' : ''}>LOAD_TRANSFER_STATION</option>
                <option value="RECHARGE_STATION"       ${lt.symbol === 'RECHARGE_STATION'       ? 'selected' : ''}>RECHARGE_STATION</option>
                <option value="WORKING_STATION"        ${lt.symbol === 'WORKING_STATION'        ? 'selected' : ''}>WORKING_STATION</option>
              </select>
            </td>
          </tr>
          <tr class="pp-section"><td colspan="2">Miscellaneous</td></tr>
          <tr>
            <td>Properties</td>
            <td>
              <button class="pp-lt-misc-btn" style="font-family:var(--font-mono);font-size:11px;
                border:1px solid var(--border);background:#f3f1ec;padding:1px 8px;
                border-radius:2px;cursor:pointer;width:100%;text-align:left;">
                ${lt.miscProperties.length === 0 ? 'None defined…' : `${lt.miscProperties.length} pair(s)…`}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="pp-delete-zone">
        <button class="pp-delete" data-action="delete-ltype">Delete location type</button>
      </div>
    `;

    const q = sel => panel.querySelector(sel);

    q('[data-action="delete-ltype"]').addEventListener('click', () => removeLocationType(lt.id));

    q('.pp-lt-name').addEventListener('change', e => {
      const val = e.target.value.trim();
      if (!val) { e.target.value = lt.name; return; }
      lt.name = val;
      panel.querySelector('.pp-name').textContent = lt.name;
      renderComponentsTree();
    });

    q('.pp-lt-symbol').addEventListener('change', e => { lt.symbol = e.target.value; });

    q('.pp-lt-veh-btn').addEventListener('click', () =>
      openSupportedOpsDialog(lt, 'supportedVehicleOperations', 'Supported vehicle operations'));

    q('.pp-lt-per-btn').addEventListener('click', () =>
      openSupportedOpsDialog(lt, 'supportedPeripheralOperations', 'Supported peripheral operations'));

    q('.pp-lt-misc-btn').addEventListener('click', () => openMiscPropertiesDialog(lt));
  }

  // ── Block color picker ────────────────────────────────────────
  // Generic color picker popover — popoverId must be unique per use site
  function openColorPickerPopover(popoverId, initialColor, swatchEl, onApply) {
    const POPOVER_W = 200;
    const existing = document.getElementById(popoverId);
    if (existing) { existing.remove(); return; }

    const popover = document.createElement('div');
    popover.id = popoverId;
    const rect = swatchEl.getBoundingClientRect();
    const left = (window.innerWidth - rect.right >= POPOVER_W + 8)
      ? rect.left : Math.max(4, rect.right - POPOVER_W);

    popover.style.cssText = `position:fixed;left:${left}px;top:${rect.bottom + 4}px;
      width:${POPOVER_W}px;background:#fff;border:1px solid var(--border);border-radius:4px;
      box-shadow:0 4px 14px rgba(0,0,0,.18);padding:10px;z-index:9999;
      display:flex;flex-direction:column;gap:8px;`;

    const pid = popoverId.replace(/[^a-z0-9]/gi, '');
    popover.innerHTML = `
      <div style="display:flex;gap:6px;align-items:center;">
        <div id="${pid}-preview" style="width:28px;height:28px;background:${initialColor};
          border:1px solid var(--border);border-radius:3px;flex-shrink:0;"></div>
        <input id="${pid}-hex" type="text" value="${initialColor}" maxlength="7"
          style="flex:1;font-family:var(--font-mono);font-size:12px;
          border:1px solid var(--border);padding:3px 6px;border-radius:3px;min-width:0;">
      </div>
      <div style="font-size:10px;color:var(--muted);line-height:1.4;">
        Type a hex color (e.g. <b>#ff0000</b>) or pick below
      </div>
      <input id="${pid}-native" type="color" value="${initialColor}"
        style="width:100%;height:30px;border:1px solid var(--border);
        border-radius:3px;padding:0 2px;cursor:pointer;background:none;">
    `;
    document.body.appendChild(popover);

    const preview  = document.getElementById(`${pid}-preview`);
    const hexInput = document.getElementById(`${pid}-hex`);
    const native   = document.getElementById(`${pid}-native`);

    function applyColor(hex) {
      if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
      swatchEl.style.background = hex;
      preview.style.background  = hex;
      hexInput.value = hex;
      native.value   = hex;
      onApply(hex);
    }

    hexInput.addEventListener('input', e => { const v = e.target.value.trim(); if (/^#[0-9a-fA-F]{6}$/.test(v)) applyColor(v); });
    native.addEventListener('input', e => applyColor(e.target.value));

    const onOutside = e => {
      if (!popover.contains(e.target) && e.target !== swatchEl) {
        popover.remove();
        document.removeEventListener('mousedown', onOutside);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', onOutside), 0);
  }

  function openBlockColorPicker(blk, swatchEl) {
    openColorPickerPopover('_blk-cpop', blk.color, swatchEl, hex => {
      blk.color = hex;
      refreshAllElementColors();
    });
  }

  // ── Block properties ─────────────────────────────────────────
  function renderBlockProperties(blk) {
    const panel = document.getElementById('properties-panel');
    if (!panel) return;

    const membersLabel = blk.members.length === 0
      ? 'None defined…'
      : blk.members.map(id => {
          const p  = getPoint(id);
          const pa = getPath(id);
          return p?.name ?? pa?.name ?? id;
        }).join(' --- ');

    panel.innerHTML = `
      <div class="me-selection">
        <svg class="me-selection__icon"><use href="#icon-block"/></svg>
        <div class="pp-name-wrap">
          <span class="pp-name">${blk.name}</span>
        </div>
      </div>
      <table class="pp-table">
        <thead><tr><th>Attribute</th><th>Value</th></tr></thead>
        <tbody>
          <tr>
            <td>Name</td>
            <td><input class="pp-blk-name" type="text" value="${blk.name}"></td>
          </tr>
          <tr>
            <td>Block color</td>
            <td>
              <div class="pp-blk-color-swatch" style="width:100%;height:22px;background:${blk.color};
                border:1px solid var(--border);border-radius:2px;cursor:pointer;box-sizing:border-box;"></div>
            </td>
          </tr>
          <tr>
            <td>Type</td>
            <td>
              <select class="pp-blk-type" style="width:100%;font-size:12px;">
                <option value="SINGLE_VEHICLE_ONLY" ${blk.type === 'SINGLE_VEHICLE_ONLY' ? 'selected' : ''}>Single vehicle only</option>
                <option value="SAME_DIRECTION_ONLY" ${blk.type === 'SAME_DIRECTION_ONLY' ? 'selected' : ''}>Same direction only</option>
              </select>
            </td>
          </tr>
          <tr>
            <td>Block members</td>
            <td>
              <button class="pp-blk-members-btn" style="font-family:var(--font-mono);font-size:11px;
                border:1px solid var(--border);background:#f3f1ec;padding:1px 8px;
                border-radius:2px;cursor:pointer;width:100%;text-align:left;overflow:hidden;
                white-space:nowrap;text-overflow:ellipsis;" title="${membersLabel}">
                ${membersLabel}
              </button>
            </td>
          </tr>
          <tr class="pp-section"><td colspan="2">Miscellaneous</td></tr>
          <tr>
            <td>Properties</td>
            <td>
              <button class="pp-blk-misc-btn" style="font-family:var(--font-mono);font-size:11px;
                border:1px solid var(--border);background:#f3f1ec;padding:1px 8px;
                border-radius:2px;cursor:pointer;width:100%;text-align:left;">
                ${blk.miscProperties.length === 0 ? 'None defined…' : `${blk.miscProperties.length} pair(s)…`}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="pp-delete-zone">
        <button class="pp-delete" data-action="delete-block">Delete block</button>
      </div>
    `;

    const q = sel => panel.querySelector(sel);

    q('[data-action="delete-block"]').addEventListener('click', () => removeBlock(blk.id));

    q('.pp-blk-name').addEventListener('change', e => {
      const val = e.target.value.trim();
      if (!val) { e.target.value = blk.name; return; }
      blk.name = val;
      panel.querySelector('.pp-name').textContent = blk.name;
      renderComponentsTree();
    });

    q('.pp-blk-color-swatch').addEventListener('click', () => openBlockColorPicker(blk, q('.pp-blk-color-swatch')));

    q('.pp-blk-type').addEventListener('change', e => { blk.type = e.target.value; });

    q('.pp-blk-members-btn').addEventListener('click', () => openBlockMembersDialog(blk));

    q('.pp-blk-misc-btn').addEventListener('click', () => openMiscPropertiesDialog(blk));
  }

  function openBlockMembersDialog(blk) {
    const backup = [...blk.members];
    const { body, foot, close } = createModal('Block members', 520);

    function availableElements() {
      return [
        ...points.map(p    => ({ id: p.id,  name: p.name,  kind: 'Point' })),
        ...pathList.map(pa => ({ id: pa.id, name: pa.name, kind: 'Path'  })),
      ].filter(el => !blk.members.includes(el.id));
    }

    let selMember = -1;
    let selAvail  = -1;

    function render() {
      const avail = availableElements();
      body.innerHTML = `
        <div style="display:flex;gap:8px;height:280px;">
          <div style="flex:1;display:flex;flex-direction:column;gap:4px;">
            <div style="font-size:11px;font-weight:600;color:var(--muted);">CURRENT MEMBERS</div>
            <div style="flex:1;overflow:auto;border:1px solid var(--border);">
              <table style="width:100%;border-collapse:collapse;font-size:12px;font-family:var(--font-mono);">
                <thead>
                  <tr style="background:#e8e5de;position:sticky;top:0;">
                    <th style="padding:4px 8px;text-align:left;border-bottom:1px solid var(--border);">Name</th>
                    <th style="padding:4px 8px;text-align:left;border-bottom:1px solid var(--border);">Kind</th>
                  </tr>
                </thead>
                <tbody>
                  ${blk.members.length === 0
                    ? '<tr><td colspan="2" style="padding:8px;color:var(--muted);text-align:center;">No members</td></tr>'
                    : blk.members.map((id, i) => {
                        const p  = getPoint(id);
                        const pa = getPath(id);
                        const name = p?.name ?? pa?.name ?? id;
                        const kind = p ? 'Point' : pa ? 'Path' : '?';
                        return `<tr class="bmem-row${i === selMember ? ' is-selected' : ''}" data-midx="${i}"
                          style="cursor:pointer;${i === selMember ? 'background:#cfe8ff;' : ''}">
                          <td style="padding:3px 8px;border-bottom:1px solid #eee;">${name}</td>
                          <td style="padding:3px 8px;border-bottom:1px solid #eee;color:var(--muted);">${kind}</td>
                        </tr>`;
                      }).join('')}
                </tbody>
              </table>
            </div>
            <button id="bmem-remove" class="me-modal-btn" ${selMember < 0 ? 'disabled' : ''}>Remove</button>
          </div>
          <div style="flex:1;display:flex;flex-direction:column;gap:4px;">
            <div style="font-size:11px;font-weight:600;color:var(--muted);">AVAILABLE ELEMENTS</div>
            <div style="flex:1;overflow:auto;border:1px solid var(--border);">
              <table style="width:100%;border-collapse:collapse;font-size:12px;font-family:var(--font-mono);">
                <thead>
                  <tr style="background:#e8e5de;position:sticky;top:0;">
                    <th style="padding:4px 8px;text-align:left;border-bottom:1px solid var(--border);">Name</th>
                    <th style="padding:4px 8px;text-align:left;border-bottom:1px solid var(--border);">Kind</th>
                  </tr>
                </thead>
                <tbody>
                  ${avail.length === 0
                    ? '<tr><td colspan="2" style="padding:8px;color:var(--muted);text-align:center;">None available</td></tr>'
                    : avail.map((el, i) => `
                        <tr class="bavail-row${i === selAvail ? ' is-selected' : ''}" data-aidx="${i}"
                          style="cursor:pointer;${i === selAvail ? 'background:#cfe8ff;' : ''}">
                          <td style="padding:3px 8px;border-bottom:1px solid #eee;">${el.name}</td>
                          <td style="padding:3px 8px;border-bottom:1px solid #eee;color:var(--muted);">${el.kind}</td>
                        </tr>`).join('')}
                </tbody>
              </table>
            </div>
            <button id="bmem-add" class="me-modal-btn" ${selAvail < 0 ? 'disabled' : ''}>Add</button>
          </div>
        </div>
      `;

      body.querySelectorAll('.bmem-row').forEach(row => {
        row.addEventListener('click', () => { selMember = +row.dataset.midx; selAvail = -1; render(); });
        row.addEventListener('dblclick', () => {
          blk.members.splice(+row.dataset.midx, 1);
          selMember = -1; render();
        });
      });

      body.querySelectorAll('.bavail-row').forEach(row => {
        row.addEventListener('click', () => { selAvail = +row.dataset.aidx; selMember = -1; render(); });
        row.addEventListener('dblclick', () => {
          const el = availableElements()[+row.dataset.aidx];
          if (el) { blk.members.push(el.id); selAvail = -1; render(); }
        });
      });

      body.querySelector('#bmem-remove').addEventListener('click', () => {
        if (selMember < 0) return;
        blk.members.splice(selMember, 1);
        selMember = Math.min(selMember, blk.members.length - 1);
        render();
      });

      body.querySelector('#bmem-add').addEventListener('click', () => {
        if (selAvail < 0) return;
        const el = availableElements()[selAvail];
        if (el) { blk.members.push(el.id); selAvail = -1; render(); }
      });
    }

    render();
    foot.innerHTML = `
      <button class="me-modal-btn me-modal-btn--primary" id="bmem-ok">Ok</button>
      <button class="me-modal-btn" id="bmem-cancel">Cancel</button>
    `;
    foot.querySelector('#bmem-ok').addEventListener('click', () => {
      close(); refreshAllElementColors(); renderBlockProperties(blk);
    });
    foot.querySelector('#bmem-cancel').addEventListener('click', () => {
      blk.members = backup; close(); refreshAllElementColors(); renderBlockProperties(blk);
    });
  }

  // ── Vehicle properties ────────────────────────────────────────
  function renderVehicleProperties(veh) {
    const panel = document.getElementById('properties-panel');
    if (!panel) return;

    const fmtNum = v => isNaN(v) ? 'NaN' : String(v);
    const roVal  = v => `<span class="pp-ro-val">${v || ''}</span>`;

    panel.innerHTML = `
      <div class="me-selection">
        <svg class="me-selection__icon"><use href="#icon-vehicle"/></svg>
        <div class="pp-name-wrap"><span class="pp-name">${veh.name}</span></div>
      </div>
      <table class="pp-table">
        <thead><tr><th>Attribute</th><th>Value</th></tr></thead>
        <tbody>
          <tr>
            <td>Name</td>
            <td><input class="pp-veh-name" type="text" value="${veh.name}"></td>
          </tr>
          <tr>
            <td>Bounding box</td>
            <td>
              <button class="pp-veh-bbox-btn" style="font-family:var(--font-mono);font-size:11px;
                border:1px solid var(--border);background:#f3f1ec;padding:1px 8px;
                border-radius:2px;cursor:pointer;width:100%;text-align:left;">
                (${veh.boundingBoxLength}, ${veh.boundingBoxWidth}, ${veh.boundingBoxHeight}), offset: (${veh.boundingBoxOffsetX}, ${veh.boundingBoxOffsetY})
              </button>
            </td>
          </tr>
          <tr>
            <td>Route color</td>
            <td>
              <div class="pp-veh-color-swatch" style="width:100%;height:22px;background:${veh.routeColor};
                border:1px solid var(--border);border-radius:2px;cursor:pointer;box-sizing:border-box;"></div>
            </td>
          </tr>
          <tr>
            <td>Maximum velocity</td>
            <td><div class="pp-val-row">
              <input class="pp-veh-maxv" type="number" step="any" min="0" value="${veh.maxVelocity}">
              <span class="pp-unit">mm/s</span>
            </div></td>
          </tr>
          <tr>
            <td>Maximum reverse velocity</td>
            <td><div class="pp-val-row">
              <input class="pp-veh-maxrv" type="number" step="any" min="0" value="${veh.maxReverseVelocity}">
              <span class="pp-unit">mm/s</span>
            </div></td>
          </tr>
          <tr>
            <td>Energy level threshold set</td>
            <td>
              <button class="pp-veh-energy-btn" style="font-family:var(--font-mono);font-size:11px;
                border:1px solid var(--border);background:#f3f1ec;padding:1px 8px;
                border-radius:2px;cursor:pointer;width:100%;text-align:left;">
                (${veh.energyCritical}%, ${veh.energyFullyRecharged}%, ${veh.energyDegraded}%, ${veh.energySufficientlyRecharged}%)
              </button>
            </td>
          </tr>
          <tr>
            <td>Current energy level</td>
            <td>${roVal(fmtNum(veh.currentEnergyLevel) + ' %')}</td>
          </tr>
          <tr>
            <td>Loaded</td>
            <td><input type="checkbox" ${veh.loaded ? 'checked' : ''} disabled></td>
          </tr>
          <tr>
            <td>State</td>
            <td>${roVal(veh.state)}</td>
          </tr>
          <tr>
            <td>Processing state</td>
            <td>${roVal(veh.processingState)}</td>
          </tr>
          <tr>
            <td>Integration level</td>
            <td>
              <select class="pp-veh-intlevel" style="width:100%;font-size:12px;">
                <option value="TO_BE_RESPECTED" ${veh.integrationLevel==='TO_BE_RESPECTED'?'selected':''}>TO_BE_RESPECTED</option>
                <option value="RESPECT"         ${veh.integrationLevel==='RESPECT'        ?'selected':''}>RESPECT</option>
                <option value="NOTICE"          ${veh.integrationLevel==='NOTICE'         ?'selected':''}>NOTICE</option>
                <option value="IGNORE"          ${veh.integrationLevel==='IGNORE'         ?'selected':''}>IGNORE</option>
              </select>
            </td>
          </tr>
          <tr>
            <td>Paused</td>
            <td><input class="pp-veh-paused" type="checkbox" ${veh.paused ? 'checked' : ''}></td>
          </tr>
          <tr>
            <td>Current point</td>
            <td>${roVal(veh.currentPoint)}</td>
          </tr>
          <tr>
            <td>Exact position</td>
            <td>${roVal(veh.exactPosition)}</td>
          </tr>
          <tr>
            <td>Vehicle orientation</td>
            <td>${roVal(fmtNum(veh.vehicleOrientation) + ' deg')}</td>
          </tr>
          <tr>
            <td>Envelope key</td>
            <td><input class="pp-veh-envkey" type="text" value="${veh.envelopeKey}"></td>
          </tr>
          <tr class="pp-section"><td colspan="2">Miscellaneous</td></tr>
          <tr>
            <td>Properties</td>
            <td>
              <button class="pp-veh-misc-btn" style="font-family:var(--font-mono);font-size:11px;
                border:1px solid var(--border);background:#f3f1ec;padding:1px 8px;
                border-radius:2px;cursor:pointer;width:100%;text-align:left;">
                ${veh.miscProperties.length === 0 ? 'None defined…' : `${veh.miscProperties.length} pair(s)…`}
              </button>
            </td>
          </tr>
          <tr class="pp-section"><td colspan="2">Runtime state</td></tr>
          <tr><td>Current transport order</td><td>${roVal(veh.currentTransportOrder)}</td></tr>
          <tr><td>Current order sequence</td><td>${roVal(veh.currentOrderSequence)}</td></tr>
          <tr><td>Acceptable order types</td><td>${roVal(veh.acceptableOrderTypes)}</td></tr>
          <tr><td>Allocated resources</td><td>${roVal(veh.allocatedResources)}</td></tr>
          <tr><td>Claimed resources</td><td>${roVal(veh.claimedResources)}</td></tr>
        </tbody>
      </table>
      <div class="pp-delete-zone">
        <button class="pp-delete" data-action="delete-vehicle">Delete vehicle</button>
      </div>
    `;

    const q = sel => panel.querySelector(sel);

    q('[data-action="delete-vehicle"]').addEventListener('click', () => removeVehicle(veh.id));

    q('.pp-veh-name').addEventListener('change', e => {
      const val = e.target.value.trim();
      if (!val) { e.target.value = veh.name; return; }
      veh.name = val;
      panel.querySelector('.pp-name').textContent = veh.name;
      renderComponentsTree();
    });

    q('.pp-veh-color-swatch').addEventListener('click', () =>
      openColorPickerPopover('_veh-cpop', veh.routeColor, q('.pp-veh-color-swatch'), hex => { veh.routeColor = hex; }));

    q('.pp-veh-maxv').addEventListener('change',  e => { veh.maxVelocity        = parseFloat(e.target.value) || 0; });
    q('.pp-veh-maxrv').addEventListener('change', e => { veh.maxReverseVelocity = parseFloat(e.target.value) || 0; });
    q('.pp-veh-intlevel').addEventListener('change', e => { veh.integrationLevel = e.target.value; });
    q('.pp-veh-paused').addEventListener('change',   e => { veh.paused = e.target.checked; });
    q('.pp-veh-envkey').addEventListener('change',   e => { veh.envelopeKey = e.target.value; });

    q('.pp-veh-bbox-btn').addEventListener('click',   () => openBoundingBoxDialog(veh));
    q('.pp-veh-energy-btn').addEventListener('click', () => openEnergyThresholdDialog(veh));
    q('.pp-veh-misc-btn').addEventListener('click',   () => openMiscPropertiesDialog(veh));
  }

  function openBoundingBoxDialog(veh) {
    const { body, foot, close } = createModal('Bounding box', 360);
    function render() {
      body.innerHTML = `
        <table class="me-modal-table" style="width:100%">
          <tbody>
            <tr class="me-modal-row">
              <td class="me-modal-label">Length (mm)</td>
              <td><input id="bbox-l" type="number" min="0" value="${veh.boundingBoxLength}"
                style="width:100%;font-family:var(--font-mono);font-size:12px;border:1px solid var(--border);padding:2px 4px;"></td>
            </tr>
            <tr class="me-modal-row">
              <td class="me-modal-label">Width (mm)</td>
              <td><input id="bbox-w" type="number" min="0" value="${veh.boundingBoxWidth}"
                style="width:100%;font-family:var(--font-mono);font-size:12px;border:1px solid var(--border);padding:2px 4px;"></td>
            </tr>
            <tr class="me-modal-row">
              <td class="me-modal-label">Height (mm)</td>
              <td><input id="bbox-h" type="number" min="0" value="${veh.boundingBoxHeight}"
                style="width:100%;font-family:var(--font-mono);font-size:12px;border:1px solid var(--border);padding:2px 4px;"></td>
            </tr>
            <tr class="me-modal-row">
              <td class="me-modal-label">Offset X (mm)</td>
              <td><input id="bbox-ox" type="number" value="${veh.boundingBoxOffsetX}"
                style="width:100%;font-family:var(--font-mono);font-size:12px;border:1px solid var(--border);padding:2px 4px;"></td>
            </tr>
            <tr class="me-modal-row">
              <td class="me-modal-label">Offset Y (mm)</td>
              <td><input id="bbox-oy" type="number" value="${veh.boundingBoxOffsetY}"
                style="width:100%;font-family:var(--font-mono);font-size:12px;border:1px solid var(--border);padding:2px 4px;"></td>
            </tr>
          </tbody>
        </table>
      `;
    }
    render();
    foot.innerHTML = `
      <button class="me-modal-btn me-modal-btn--primary" id="bbox-ok">Ok</button>
      <button class="me-modal-btn" id="bbox-cancel">Cancel</button>
    `;
    foot.querySelector('#bbox-ok').addEventListener('click', () => {
      veh.boundingBoxLength  = parseFloat(document.getElementById('bbox-l').value)  || 0;
      veh.boundingBoxWidth   = parseFloat(document.getElementById('bbox-w').value)  || 0;
      veh.boundingBoxHeight  = parseFloat(document.getElementById('bbox-h').value)  || 0;
      veh.boundingBoxOffsetX = parseFloat(document.getElementById('bbox-ox').value) || 0;
      veh.boundingBoxOffsetY = parseFloat(document.getElementById('bbox-oy').value) || 0;
      close(); renderVehicleProperties(veh);
    });
    foot.querySelector('#bbox-cancel').addEventListener('click', () => close());
  }

  function openEnergyThresholdDialog(veh) {
    const { body, foot, close } = createModal('Energy level thresholds', 360);
    body.innerHTML = `
      <table class="me-modal-table" style="width:100%">
        <tbody>
          <tr class="me-modal-row">
            <td class="me-modal-label">Critical (%)</td>
            <td><input id="en-crit" type="number" min="0" max="100" value="${veh.energyCritical}"
              style="width:100%;font-family:var(--font-mono);font-size:12px;border:1px solid var(--border);padding:2px 4px;"></td>
          </tr>
          <tr class="me-modal-row">
            <td class="me-modal-label">Fully recharged (%)</td>
            <td><input id="en-full" type="number" min="0" max="100" value="${veh.energyFullyRecharged}"
              style="width:100%;font-family:var(--font-mono);font-size:12px;border:1px solid var(--border);padding:2px 4px;"></td>
          </tr>
          <tr class="me-modal-row">
            <td class="me-modal-label">Degraded critical (%)</td>
            <td><input id="en-dcrit" type="number" min="0" max="100" value="${veh.energyDegraded}"
              style="width:100%;font-family:var(--font-mono);font-size:12px;border:1px solid var(--border);padding:2px 4px;"></td>
          </tr>
          <tr class="me-modal-row">
            <td class="me-modal-label">Degraded fully recharged (%)</td>
            <td><input id="en-dfull" type="number" min="0" max="100" value="${veh.energySufficientlyRecharged}"
              style="width:100%;font-family:var(--font-mono);font-size:12px;border:1px solid var(--border);padding:2px 4px;"></td>
          </tr>
        </tbody>
      </table>
    `;
    foot.innerHTML = `
      <button class="me-modal-btn me-modal-btn--primary" id="en-ok">Ok</button>
      <button class="me-modal-btn" id="en-cancel">Cancel</button>
    `;
    foot.querySelector('#en-ok').addEventListener('click', () => {
      veh.energyCritical              = parseFloat(document.getElementById('en-crit').value)  ?? 30;
      veh.energyFullyRecharged        = parseFloat(document.getElementById('en-full').value)  ?? 90;
      veh.energyDegraded              = parseFloat(document.getElementById('en-dcrit').value) ?? 40;
      veh.energySufficientlyRecharged = parseFloat(document.getElementById('en-dfull').value) ?? 95;
      close(); renderVehicleProperties(veh);
    });
    foot.querySelector('#en-cancel').addEventListener('click', () => close());
  }

  // ── Components tree ───────────────────────────────────────────
  function renderComponentsTree() {
    const list           = document.getElementById('tree-points-list');
    const count          = document.getElementById('tree-points-count');
    const pathsContainer = document.getElementById('tree-paths-list');
    const pathsCount     = document.getElementById('tree-paths-count');
    const ltContainer    = document.getElementById('tree-ltype-list');
    const ltCount        = document.getElementById('tree-ltype-count');
    const locsContainer  = document.getElementById('tree-locations-list');
    const locsCount      = document.getElementById('tree-locations-count');
    const linksContainer  = document.getElementById('tree-links-list');
    const linksCount      = document.getElementById('tree-links-count');
    const blocksContainer   = document.getElementById('tree-blocks-list');
    const blocksCount       = document.getElementById('tree-blocks-count');
    const vehiclesContainer = document.getElementById('tree-vehicles-list');
    const vehiclesCount     = document.getElementById('tree-vehicles-count');
    const total             = document.getElementById('comp-total-count');
    if (!list) return;

    count.textContent = points.length;
    if (pathsCount)    pathsCount.textContent    = pathList.length;
    if (ltCount)       ltCount.textContent       = locationTypes.length;
    if (locsCount)     locsCount.textContent     = locations.length;
    if (linksCount)    linksCount.textContent    = links.length;
    if (vehiclesCount) vehiclesCount.textContent = vehicles.length;
    if (blocksCount)  blocksCount.textContent = blocks.length;
    total.textContent = points.length + pathList.length + locationTypes.length + locations.length + links.length + blocks.length + vehicles.length;

    list.innerHTML = points.map(p => `
      <div class="me-tree__row${selectedPointId === p.id ? ' is-selected' : ''}"
           data-depth="1" data-point-id="${p.id}">
        <span class="me-tree__chev me-tree__chev--blank"></span>
        <svg class="me-tree__icon"><use href="#icon-point"/></svg>
        <span class="me-tree__label me-tree__label--mono">${p.name}</span>
      </div>
    `).join('');
    list.querySelectorAll('[data-point-id]').forEach(row => {
      row.addEventListener('click', () => selectPoint(row.dataset.pointId));
    });

    if (pathsContainer) {
      pathsContainer.innerHTML = pathList.map(pa => `
        <div class="me-tree__row${selectedPathId === pa.id ? ' is-selected' : ''}"
             data-depth="1" data-path-id="${pa.id}">
          <span class="me-tree__chev me-tree__chev--blank"></span>
          <svg class="me-tree__icon"><use href="#icon-path"/></svg>
          <span class="me-tree__label me-tree__label--mono">${pa.name}</span>
        </div>
      `).join('');
      pathsContainer.querySelectorAll('[data-path-id]').forEach(row => {
        row.addEventListener('click', () => selectPath(row.dataset.pathId));
      });
    }

    if (ltContainer) {
      ltContainer.innerHTML = locationTypes.map(lt => `
        <div class="me-tree__row${selectedLtId === lt.id ? ' is-selected' : ''}"
             data-depth="1" data-lt-id="${lt.id}">
          <span class="me-tree__chev me-tree__chev--blank"></span>
          <svg class="me-tree__icon"><use href="#icon-location"/></svg>
          <span class="me-tree__label me-tree__label--mono">${lt.name}</span>
        </div>
      `).join('');
      ltContainer.querySelectorAll('[data-lt-id]').forEach(row => {
        row.addEventListener('click', () => selectLocationType(row.dataset.ltId));
      });
    }

    if (locsContainer) {
      locsContainer.innerHTML = locations.map(loc => `
        <div class="me-tree__row${selectedLocationId === loc.id ? ' is-selected' : ''}"
             data-depth="1" data-loc-id="${loc.id}">
          <span class="me-tree__chev me-tree__chev--blank"></span>
          <svg class="me-tree__icon"><use href="#icon-location"/></svg>
          <span class="me-tree__label me-tree__label--mono">${loc.name}</span>
        </div>
      `).join('');
      locsContainer.querySelectorAll('[data-loc-id]').forEach(row => {
        row.addEventListener('click', () => selectLocation(row.dataset.locId));
      });
    }

    if (linksContainer) {
      linksContainer.innerHTML = links.map(lk => `
        <div class="me-tree__row${selectedLinkId === lk.id ? ' is-selected' : ''}"
             data-depth="1" data-link-id="${lk.id}">
          <span class="me-tree__chev me-tree__chev--blank"></span>
          <svg class="me-tree__icon"><use href="#icon-link"/></svg>
          <span class="me-tree__label me-tree__label--mono">${lk.name}</span>
        </div>
      `).join('');
      linksContainer.querySelectorAll('[data-link-id]').forEach(row => {
        row.addEventListener('click', () => selectLink(row.dataset.linkId));
      });
    }

    if (blocksContainer) {
      blocksContainer.innerHTML = blocks.map(blk => `
        <div class="me-tree__row${selectedBlockId === blk.id ? ' is-selected' : ''}"
             data-depth="1" data-block-id="${blk.id}">
          <span class="me-tree__chev me-tree__chev--blank"></span>
          <svg class="me-tree__icon"><use href="#icon-block"/></svg>
          <span class="me-tree__label me-tree__label--mono">${blk.name}</span>
        </div>
      `).join('');
      blocksContainer.querySelectorAll('[data-block-id]').forEach(row => {
        row.addEventListener('click', () => selectBlock(row.dataset.blockId));
      });
    }

    if (vehiclesContainer) {
      vehiclesContainer.innerHTML = vehicles.map(veh => `
        <div class="me-tree__row${selectedVehicleId === veh.id ? ' is-selected' : ''}"
             data-depth="1" data-vehicle-id="${veh.id}">
          <span class="me-tree__chev me-tree__chev--blank"></span>
          <svg class="me-tree__icon"><use href="#icon-vehicle"/></svg>
          <span class="me-tree__label me-tree__label--mono">${veh.name}</span>
        </div>
      `).join('');
      vehiclesContainer.querySelectorAll('[data-vehicle-id]').forEach(row => {
        row.addEventListener('click', () => selectVehicle(row.dataset.vehicleId));
      });
    }
  }

  function selectPoint(id) {
    clearMultiSelection();
    if (selectedLtId) selectedLtId = null;
    if (selectedBlockId) selectedBlockId = null;
    if (selectedVehicleId) selectedVehicleId = null;
    if (selectedPathId) {
      const prev = getPath(selectedPathId);
      setPathStyle(prev, false);
      if (needsHandleRedraw(prev)) drawPath(prev, false);
      selectedPathId = null;
    }
    if (selectedLocationId) { setLocationStyle(getLocation(selectedLocationId), false); selectedLocationId = null; }
    if (selectedLinkId) { setLinkStyle(getLink(selectedLinkId), false); selectedLinkId = null; }
    // Deselect previous (only if switching to a different point)
    if (selectedPointId && selectedPointId !== id) setPointStyle(getPoint(selectedPointId), false);
    selectedPointId = id;
    const p = getPoint(id);
    if (!p) return;
    setPointStyle(p, true);
    renderPointProperties(p);
    renderComponentsTree();
  }

  function deselectPoint() {
    if (selectedPointId) {
      setPointStyle(getPoint(selectedPointId), false);
      selectedPointId = null;
    }
    renderPropertiesPanel(null);
    renderComponentsTree();
  }

  function removePoint(id) {
    pushUndoState();
    if (selectedPointId === id) selectedPointId = null;
    if (pathStartId === id) pathStartId = null;
    // Remove all paths and links connected to this point
    pathList.filter(pa => pa.startPointId === id || pa.endPointId === id)
            .map(pa => pa.id)
            .forEach(pid => deletePath(pid));
    links.filter(lk => lk.pointId === id).map(lk => lk.id).forEach(lid => deleteLink(lid));
    deletePoint(id);
    updateCounts(points.length, pathList.length, locations.length);
    renderPropertiesPanel(null);
    renderComponentsTree();
  }

  // Keyboard shortcuts
  window.addEventListener('keydown', e => {
    const tag = document.activeElement?.tagName;
    const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

    // Undo / Redo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); performUndo(); return; }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); performRedo(); return; }

    // Edit operations (skip when focus is inside a text input)
    if (!inInput) {
      if (e.key === 'Escape') { e.preventDefault(); if (pathStartId) cancelPathTool(); else deselectAll(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') { e.preventDefault(); selectAll(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') { e.preventDefault(); copySelection(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') { e.preventDefault(); cutSelection(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') { e.preventDefault(); pasteClipboard(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); duplicateSelection(); return; }
    }

    if (e.key !== 'Delete' && e.key !== 'Backspace') return;
    if (inInput) return;
    deleteSelection();
  });

  // Properties panel — capture undo state before any input edit
  document.getElementById('properties-panel').addEventListener('focusin', e => {
    if (e.target.matches('input, select, textarea')) pushUndoState();
  });

  function drawPoint(p) {
    const layer = getLayer(p.layerId);
    if (!layer?.worldGroup) return;

    const g = new Konva.Group({ x: p.x, y: -p.y, id: p.id });

    g.add(new Konva.Circle({
      name: 'ring',
      radius: POINT_R,
      fill: '#ffffff',
      stroke: '#1d4ed8',
      strokeWidth: 1.5,
      strokeScaleEnabled: false,
    }));

    g.add(new Konva.Circle({
      name: 'dot',
      radius: 3,
      fill: '#1d4ed8',
    }));

    g.add(new Konva.Text({
      name: 'label',
      x: p.labelXOffset,
      y: p.labelYOffset,
      rotation: isNaN(p.labelOrientationAngle) ? 0 : p.labelOrientationAngle,
      text: p.name,
      fontSize: 11,
      fontFamily: 'IBM Plex Mono, monospace',
      fill: '#1d4ed8',
    }));

    g.draggable(true);

    g.on('dragstart', e => {
      e.cancelBubble = true;
      if (getLayer(p.layerId)?.locked) { g.stopDrag(); return; }
      pushUndoState();
      stage.container().style.cursor = 'grabbing';
      selectPoint(p.id);
    });

    g.on('dragmove', () => {
      if (snapEnabled) {
        const step = getSnapStep();
        g.x(Math.round(g.x() / step) * step);
        g.y(Math.round(g.y() / step) * step);
      }
      p.x = g.x();
      p.y = -g.y();
      // Live-update coordinate fields in the properties panel
      const panel = document.getElementById('properties-panel');
      const xInput = panel.querySelector('.pp-pt-x');
      const yInput = panel.querySelector('.pp-pt-y');
      if (xInput) xInput.value = Math.round(p.x);
      if (yInput) yInput.value = Math.round(p.y);
      // Update all paths connected to this point
      pathList.filter(pa => pa.startPointId === p.id || pa.endPointId === p.id)
              .forEach(pa => {
                updatePathGeometry(pa);
                // If this path is currently shown in the properties panel, refresh its length
                if (pa.id === selectedPathId) {
                  const lenInput = document.querySelector('.pp-pa-length');
                  if (lenInput) lenInput.value = pathLength(pa).toFixed(1);
                }
              });
      links.filter(lk => lk.pointId === p.id).forEach(lk => updateLinkGeometry(lk));
    });

    g.on('dragend', () => {
      p.x = g.x();
      p.y = -g.y();
      stage.container().style.cursor = 'pointer';
      renderPointProperties(p); // refresh panel with final position
    });

    g.on('click', e => {
      e.cancelBubble = true;
      if (activeTool === 'Path') {
        if (!pathStartId) {
          pathStartId = p.id;
          setPointStyle(p, true);
        } else if (pathStartId === p.id) {
          cancelPathTool();
        } else {
          pushUndoState();
          const pa = createPath(pathStartId, p.id, activeLayerId);
          drawPath(pa);
          cancelPathTool();
          renderComponentsTree();
          selectPath(pa.id);
        }
        return;
      }
      if (activeTool === 'Link') {
        if (!pathStartId) {
          pathStartId = p.id;
          setPointStyle(p, true);
        } else if (pathStartId === p.id) {
          cancelPathTool();
        } else {
          // Re-select new start point for link tool
          setPointStyle(getPoint(pathStartId), false);
          pathStartId = p.id;
          setPointStyle(p, true);
        }
        return;
      }
      if (e.evt.shiftKey) {
        // Promote any prior single selection into multiSelection
        if (selectedPointId && selectedPointId !== p.id) {
          multiSelection.push({ id: selectedPointId, kind: 'point' });
          setPointMultiStyle(getPoint(selectedPointId));
          selectedPointId = null;
        } else if (selectedPointId) {
          setPointStyle(getPoint(selectedPointId), false);
          selectedPointId = null;
        }
        if (selectedLocationId) {
          multiSelection.push({ id: selectedLocationId, kind: 'location' });
          setLocationMultiStyle(getLocation(selectedLocationId));
          selectedLocationId = null;
        }
        if (selectedPathId) { const prev = getPath(selectedPathId); setPathStyle(prev, false); if (needsHandleRedraw(prev)) drawPath(prev, false); selectedPathId = null; }
        if (selectedLinkId) { setLinkStyle(getLink(selectedLinkId), false); selectedLinkId = null; }
        if (selectedLtId) { selectedLtId = null; }
        if (selectedBlockId) { selectedBlockId = null; }
        if (selectedVehicleId) { selectedVehicleId = null; }
        const idx = multiSelection.findIndex(s => s.id === p.id);
        if (idx !== -1) {
          multiSelection.splice(idx, 1);
          setPointStyle(p, false);
        } else {
          multiSelection.push({ id: p.id, kind: 'point' });
          setPointMultiStyle(p);
        }
        renderPropertiesPanel(null);
        return;
      }
      clearMultiSelection();
      selectPoint(p.id);
    });

    g.on('mouseenter', () => {
      stage.container().style.cursor = (activeTool === 'Path' || activeTool === 'Link') ? 'crosshair' : 'pointer';
    });
    g.on('mouseleave', () => {
      stage.container().style.cursor = (activeTool === 'Point' || activeTool === 'Path' || activeTool === 'Link' || activeTool === 'AreaSelect') ? 'crosshair' : 'grab';
    });

    p.konvaGroup = g;
    layer.worldGroup.add(g);
    layer.konvaLayer.batchDraw();
  }

  // ── Path drawing ────────────────────────────────────────────────

  const PATH_STROKE    = '#555555';
  const PATH_STROKE_SEL= '#f97316';
  const ARROW_LEN      = 10;
  const ARROW_W        = 6;

  function pathSvgData(pa) {
    const sp = getPoint(pa.startPointId);
    const ep = getPoint(pa.endPointId);
    if (!sp || !ep) return '';
    if (pa.connectionType === 'BEZIER' && pa.controlPoints.length === 2) {
      const [c1, c2] = pa.controlPoints;
      return `M ${sp.x} ${-sp.y} C ${c1.x} ${-c1.y} ${c2.x} ${-c2.y} ${ep.x} ${-ep.y}`;
    }
    if (pa.connectionType === 'BEZIER_Q' && pa.controlPoints.length === 1) {
      const [c] = pa.controlPoints;
      return `M ${sp.x} ${-sp.y} Q ${c.x} ${-c.y} ${ep.x} ${-ep.y}`;
    }
    if (pa.connectionType === 'POLYLINE' && pa.controlPoints.length > 0) {
      const mid = pa.controlPoints.map(cp => `L ${cp.x} ${-cp.y}`).join(' ');
      return `M ${sp.x} ${-sp.y} ${mid} L ${ep.x} ${-ep.y}`;
    }
    return `M ${sp.x} ${-sp.y} L ${ep.x} ${-ep.y}`;
  }

  function arrowheadPoints(pa) {
    const sp = getPoint(pa.startPointId);
    const ep = getPoint(pa.endPointId);
    if (!sp || !ep) return [0,0,0,0,0,0];
    let tx2, ty2;
    if (pa.connectionType === 'BEZIER' && pa.controlPoints.length === 2) {
      const c2 = pa.controlPoints[1];
      tx2 = ep.x - c2.x; ty2 = c2.y - ep.y; // screen-space (Y-down)
    } else if (pa.connectionType === 'BEZIER_Q' && pa.controlPoints.length === 1) {
      const c = pa.controlPoints[0];
      tx2 = ep.x - c.x; ty2 = c.y - ep.y; // tangent at end: Q→P1
    } else if (pa.connectionType === 'POLYLINE' && pa.controlPoints.length > 0) {
      const prev = pa.controlPoints[pa.controlPoints.length - 1];
      tx2 = ep.x - prev.x; ty2 = prev.y - ep.y; // screen-space (Y-down)
    } else {
      tx2 = ep.x - sp.x; ty2 = sp.y - ep.y; // screen-space (Y-down)
    }
    const len = Math.sqrt(tx2*tx2 + ty2*ty2) || 1;
    const ux = tx2/len, uy = ty2/len;
    const px = -uy, py = ux;
    const tip = { x: ep.x, y: -ep.y };
    const b1  = { x: ep.x - ux*ARROW_LEN + px*(ARROW_W/2), y: -ep.y - uy*ARROW_LEN + py*(ARROW_W/2) };
    const b2  = { x: ep.x - ux*ARROW_LEN - px*(ARROW_W/2), y: -ep.y - uy*ARROW_LEN - py*(ARROW_W/2) };
    return [tip.x, tip.y, b1.x, b1.y, b2.x, b2.y];
  }

  function seedControlPoints(pa) {
    const sp = getPoint(pa.startPointId);
    const ep = getPoint(pa.endPointId);
    if (!sp || !ep) return;
    if (pa.connectionType === 'BEZIER') {
      pa.controlPoints = [
        { x: sp.x + (ep.x - sp.x) / 3, y: sp.y + (ep.y - sp.y) / 3 },
        { x: sp.x + (ep.x - sp.x) * 2 / 3, y: sp.y + (ep.y - sp.y) * 2 / 3 },
      ];
    } else if (pa.connectionType === 'BEZIER_Q') {
      pa.controlPoints = [
        { x: (sp.x + ep.x) / 2, y: (sp.y + ep.y) / 2 },
      ];
    } else if (pa.connectionType === 'POLYLINE') {
      pa.controlPoints = [
        { x: (sp.x + ep.x) / 2, y: (sp.y + ep.y) / 2 },
      ];
    }
  }

  // Returns true when a path needs drawPath() called on select/deselect to show or hide handles.
  function needsHandleRedraw(pa) {
    if (!pa || !pa.controlPoints?.length) return false;
    return pa.connectionType === 'BEZIER' || pa.connectionType === 'BEZIER_Q' || pa.connectionType === 'POLYLINE';
  }

  function drawPath(pa, withHandles = (selectedPathId === pa.id)) {
    const layer = getLayer(pa.layerId);
    if (!layer?.worldGroup) return;
    if (pa.konvaGroup) pa.konvaGroup.destroy();

    const g = new Konva.Group({ id: pa.id });

    // Invisible wide hit area
    const hit = new Konva.Path({
      name: 'path-hit',
      data: pathSvgData(pa),
      stroke: 'transparent',
      strokeWidth: 16,
      strokeScaleEnabled: false,
      listening: true,
    });
    g.add(hit);

    // Visible line
    const line = new Konva.Path({
      name: 'path-line',
      data: pathSvgData(pa),
      stroke: PATH_STROKE,
      strokeWidth: 1.5,
      strokeScaleEnabled: false,
      listening: false,
    });
    g.add(line);

    // Arrowhead
    const arrow = new Konva.Line({
      name: 'path-arrow',
      points: arrowheadPoints(pa),
      closed: true,
      fill: PATH_STROKE,
      stroke: PATH_STROKE,
      strokeWidth: 0,
      strokeScaleEnabled: false,
      listening: false,
    });
    g.add(arrow);

    // Control point handles (only when selected)
    if (withHandles && pa.controlPoints.length > 0) {
      const isBezier  = pa.connectionType === 'BEZIER';
      const isBezierQ = pa.connectionType === 'BEZIER_Q';
      const spPt = getPoint(pa.startPointId);
      const epPt = getPoint(pa.endPointId);
      pa.controlPoints.forEach((cp, i) => {
        if (isBezier) {
          const anchor = i === 0 ? spPt : epPt;
          g.add(new Konva.Line({
            name: 'cp-line-' + i,
            points: [anchor.x, -anchor.y, cp.x, -cp.y],
            stroke: '#aaa', strokeWidth: 1, dash: [4, 3],
            strokeScaleEnabled: false, listening: false,
          }));
        } else if (isBezierQ) {
          g.add(new Konva.Line({
            name: 'cp-line-sp',
            points: [spPt.x, -spPt.y, cp.x, -cp.y],
            stroke: '#aaa', strokeWidth: 1, dash: [4, 3],
            strokeScaleEnabled: false, listening: false,
          }));
          g.add(new Konva.Line({
            name: 'cp-line-ep',
            points: [epPt.x, -epPt.y, cp.x, -cp.y],
            stroke: '#aaa', strokeWidth: 1, dash: [4, 3],
            strokeScaleEnabled: false, listening: false,
          }));
        }
        const handle = new Konva.Circle({
          name: 'wp-handle-' + i,
          x: cp.x, y: -cp.y, radius: (isBezier || isBezierQ) ? 5 : 6,
          fill: '#fff',
          stroke: (isBezier || isBezierQ) ? PATH_STROKE_SEL : '#7c3aed',
          strokeWidth: 1.5,
          strokeScaleEnabled: false, draggable: true,
        });
        handle.on('dragmove', () => {
          pa.controlPoints[i] = { x: Math.round(handle.x()), y: -Math.round(handle.y()) };
          updatePathGeometry(pa);
          // Update dashed reference lines
          if (isBezier) {
            const anchor = i === 0 ? spPt : epPt;
            g.findOne('.cp-line-' + i)?.points([anchor.x, -anchor.y, handle.x(), handle.y()]);
          } else if (isBezierQ) {
            g.findOne('.cp-line-sp')?.points([spPt.x, -spPt.y, handle.x(), handle.y()]);
            g.findOne('.cp-line-ep')?.points([epPt.x, -epPt.y, handle.x(), handle.y()]);
          }
          // Live-update coordinates in the properties panel
          if (pa.connectionType === 'POLYLINE') {
            const propPanel = document.getElementById('properties-panel');
            const xInp = propPanel?.querySelector(`.pp-wp-x[data-idx="${i}"]`);
            const yInp = propPanel?.querySelector(`.pp-wp-y[data-idx="${i}"]`);
            if (xInp) xInp.value = pa.controlPoints[i].x;
            if (yInp) yInp.value = pa.controlPoints[i].y;
          }
        });
        handle.on('click', e => e.cancelBubble = true);
        g.add(handle);
      });
    }

    g.on('click', e => { e.cancelBubble = true; selectPath(pa.id); });
    g.on('mouseenter', () => { stage.container().style.cursor = 'pointer'; });
    g.on('mouseleave', () => {
      stage.container().style.cursor = (activeTool === 'Point' || activeTool === 'AreaSelect') ? 'crosshair' : 'grab';
    });

    pa.konvaGroup = g;
    layer.worldGroup.add(g);
    g.moveToBottom();          // paths sit below points
    layer.konvaLayer.batchDraw();
  }

  function updatePathGeometry(pa) {
    if (!pa.konvaGroup) return;
    const svgData = pathSvgData(pa);
    pa.konvaGroup.findOne('.path-hit')?.data(svgData);
    pa.konvaGroup.findOne('.path-line')?.data(svgData);
    pa.konvaGroup.findOne('.path-arrow')?.points(arrowheadPoints(pa));
    getLayer(pa.layerId)?.konvaLayer.batchDraw();
  }

  function setPathStyle(pa, selected) {
    if (!pa?.konvaGroup) return;
    const col = selected ? PATH_STROKE_SEL : (getBlockColorFor(pa.id) ?? PATH_STROKE);
    pa.konvaGroup.findOne('.path-line')?.stroke(col);
    pa.konvaGroup.findOne('.path-arrow')?.fill(col).stroke(col);
    getLayer(pa.layerId)?.konvaLayer.batchDraw();
  }

  let selectedPathId = null;

  function selectPath(id) {
    clearMultiSelection();
    if (selectedLtId) selectedLtId = null;
    if (selectedLocationId) { setLocationStyle(getLocation(selectedLocationId), false); selectedLocationId = null; }
    if (selectedLinkId) { setLinkStyle(getLink(selectedLinkId), false); selectedLinkId = null; }
    if (selectedPathId && selectedPathId !== id) {
      const prev = getPath(selectedPathId);
      setPathStyle(prev, false);
      // Redraw prev to hide control handles
      if (needsHandleRedraw(prev)) drawPath(prev, false);
    }
    if (selectedPointId) { setPointStyle(getPoint(selectedPointId), false); selectedPointId = null; }
    selectedPathId = id;
    const pa = getPath(id);
    if (!pa) return;
    setPathStyle(pa, true);
    if (needsHandleRedraw(pa)) drawPath(pa); // redraw to show handles
    renderPathProperties(pa);
    renderComponentsTree();
  }

  function deselectPath() {
    if (selectedPathId) {
      const pa = getPath(selectedPathId);
      setPathStyle(pa, false);
      if (needsHandleRedraw(pa)) drawPath(pa, false);
      selectedPathId = null;
    }
  }

  function removePath(id) {
    pushUndoState();
    if (selectedPathId === id) selectedPathId = null;
    deletePath(id);
    renderPropertiesPanel(null);
    renderComponentsTree();
  }

  let selectedLtId       = null;
  let selectedLocationId = null;

  function selectLocation(id) {
    clearMultiSelection();
    if (selectedPointId) { setPointStyle(getPoint(selectedPointId), false); selectedPointId = null; }
    if (selectedPathId)  {
      const prev = getPath(selectedPathId);
      setPathStyle(prev, false);
      if (needsHandleRedraw(prev)) drawPath(prev, false);
      selectedPathId = null;
    }
    if (selectedLtId) selectedLtId = null;
    if (selectedBlockId) selectedBlockId = null;
    if (selectedVehicleId) selectedVehicleId = null;
    if (selectedLinkId) { setLinkStyle(getLink(selectedLinkId), false); selectedLinkId = null; }
    if (selectedLocationId && selectedLocationId !== id) setLocationStyle(getLocation(selectedLocationId), false);
    selectedLocationId = id;
    const loc = getLocation(id);
    if (!loc) return;
    setLocationStyle(loc, true);
    renderLocationProperties(loc);
    renderComponentsTree();
  }

  function deselectLocation() {
    if (selectedLocationId) {
      setLocationStyle(getLocation(selectedLocationId), false);
      selectedLocationId = null;
    }
  }

  function removeLocation(id) {
    pushUndoState();
    if (selectedLocationId === id) selectedLocationId = null;
    links.filter(lk => lk.locationId === id).map(lk => lk.id).forEach(lid => deleteLink(lid));
    deleteLocation(id);
    renderPropertiesPanel(null);
    renderComponentsTree();
  }

  let selectedLinkId = null;

  function selectLink(id) {
    clearMultiSelection();
    if (selectedPointId) { setPointStyle(getPoint(selectedPointId), false); selectedPointId = null; }
    if (selectedPathId) {
      const prev = getPath(selectedPathId);
      setPathStyle(prev, false);
      if (needsHandleRedraw(prev)) drawPath(prev, false);
      selectedPathId = null;
    }
    if (selectedLtId) selectedLtId = null;
    if (selectedBlockId) selectedBlockId = null;
    if (selectedVehicleId) selectedVehicleId = null;
    if (selectedLocationId) { setLocationStyle(getLocation(selectedLocationId), false); selectedLocationId = null; }
    if (selectedLinkId && selectedLinkId !== id) setLinkStyle(getLink(selectedLinkId), false);
    selectedLinkId = id;
    const lk = getLink(id);
    if (!lk) return;
    setLinkStyle(lk, true);
    renderLinkProperties(lk);
    renderComponentsTree();
  }

  function deselectLink() {
    if (selectedLinkId) {
      setLinkStyle(getLink(selectedLinkId), false);
      selectedLinkId = null;
    }
  }

  function removeLink(id) {
    pushUndoState();
    if (selectedLinkId === id) selectedLinkId = null;
    deleteLink(id);
    renderPropertiesPanel(null);
    renderComponentsTree();
  }

  function selectLocationType(id) {
    clearMultiSelection();
    if (selectedPointId) { setPointStyle(getPoint(selectedPointId), false); selectedPointId = null; }
    if (selectedPathId) {
      const prev = getPath(selectedPathId);
      setPathStyle(prev, false);
      if (needsHandleRedraw(prev)) drawPath(prev, false);
      selectedPathId = null;
    }
    if (selectedBlockId) selectedBlockId = null;
    if (selectedVehicleId) selectedVehicleId = null;
    if (selectedLocationId) { setLocationStyle(getLocation(selectedLocationId), false); selectedLocationId = null; }
    if (selectedLinkId) { setLinkStyle(getLink(selectedLinkId), false); selectedLinkId = null; }
    selectedLtId = id;
    const lt = getLocationType(id);
    if (!lt) return;
    renderLocationTypeProperties(lt);
    renderComponentsTree();
  }

  function deselectLocationType() {
    if (selectedLtId) {
      selectedLtId = null;
      renderPropertiesPanel(null);
      renderComponentsTree();
    }
  }

  function removeLocationType(id) {
    pushUndoState();
    if (selectedLtId === id) selectedLtId = null;
    deleteLocationType(id);
    renderPropertiesPanel(null);
    renderComponentsTree();
  }

  let selectedBlockId = null;

  // Multi-selection — array of { id, kind: 'point' | 'location' }
  let multiSelection = [];

  function selectBlock(id) {
    clearMultiSelection();
    if (selectedPointId) { setPointStyle(getPoint(selectedPointId), false); selectedPointId = null; }
    if (selectedPathId) {
      const prev = getPath(selectedPathId);
      setPathStyle(prev, false);
      if (needsHandleRedraw(prev)) drawPath(prev, false);
      selectedPathId = null;
    }
    if (selectedLtId) selectedLtId = null;
    if (selectedVehicleId) selectedVehicleId = null;
    if (selectedLocationId) { setLocationStyle(getLocation(selectedLocationId), false); selectedLocationId = null; }
    if (selectedLinkId) { setLinkStyle(getLink(selectedLinkId), false); selectedLinkId = null; }
    selectedBlockId = id;
    const blk = getBlock(id);
    if (!blk) return;
    renderBlockProperties(blk);
    renderComponentsTree();
  }

  function deselectBlock() {
    if (selectedBlockId) {
      selectedBlockId = null;
      renderPropertiesPanel(null);
      renderComponentsTree();
    }
  }

  function removeBlock(id) {
    pushUndoState();
    if (selectedBlockId === id) selectedBlockId = null;
    deleteBlock(id);
    refreshAllElementColors();
    renderPropertiesPanel(null);
    renderComponentsTree();
  }

  let selectedVehicleId = null;

  function selectVehicle(id) {
    clearMultiSelection();
    if (selectedPointId) { setPointStyle(getPoint(selectedPointId), false); selectedPointId = null; }
    if (selectedPathId) {
      const prev = getPath(selectedPathId);
      setPathStyle(prev, false);
      if (needsHandleRedraw(prev)) drawPath(prev, false);
      selectedPathId = null;
    }
    if (selectedLtId) selectedLtId = null;
    if (selectedBlockId) selectedBlockId = null;
    if (selectedLocationId) { setLocationStyle(getLocation(selectedLocationId), false); selectedLocationId = null; }
    if (selectedLinkId) { setLinkStyle(getLink(selectedLinkId), false); selectedLinkId = null; }
    selectedVehicleId = id;
    const veh = getVehicle(id);
    if (!veh) return;
    renderVehicleProperties(veh);
    renderComponentsTree();
  }

  function deselectVehicle() {
    if (selectedVehicleId) {
      selectedVehicleId = null;
      renderPropertiesPanel(null);
      renderComponentsTree();
    }
  }

  function removeVehicle(id) {
    pushUndoState();
    if (selectedVehicleId === id) selectedVehicleId = null;
    deleteVehicle(id);
    renderPropertiesPanel(null);
    renderComponentsTree();
  }

  // ── Multi-selection ───────────────────────────────────────────────
  function clearMultiSelection() {
    multiSelection.forEach(({ id, kind }) => {
      if (kind === 'point')    setPointStyle(getPoint(id), false);
      else                     setLocationStyle(getLocation(id), false);
    });
    multiSelection = [];
  }

  function setPointMultiStyle(p) {
    if (!p?.konvaGroup) return;
    const ring = p.konvaGroup.findOne('.ring');
    const dot  = p.konvaGroup.findOne('.dot');
    const lbl  = p.konvaGroup.findOne('.label');
    ring.stroke('#ea580c'); ring.strokeWidth(2); ring.dash([4, 3]);
    dot.fill('#ea580c');
    lbl.fill('#9a3412');
    getLayer(p.layerId)?.konvaLayer.batchDraw();
  }

  function setLocationMultiStyle(loc) {
    if (!loc?.konvaGroup) return;
    const rect = loc.konvaGroup.findOne('.loc-rect');
    const lbl  = loc.konvaGroup.findOne('.label');
    const sym  = loc.konvaGroup.findOne('.loc-sym');
    rect?.stroke('#ea580c'); rect?.strokeWidth(2); rect?.dash([4, 3]);
    lbl?.fill('#9a3412');
    sym?.fill('#ea580c');
    getLayer(loc.layerId)?.konvaLayer.batchDraw();
  }

  function alignElements(axis, mode) {
    if (multiSelection.length < 2) return;
    const items = multiSelection.map(({ id, kind }) => ({
      el: kind === 'point' ? getPoint(id) : getLocation(id),
      kind,
    })).filter(i => i.el);
    if (items.length < 2) return;
    pushUndoState();

    const coords = items.map(({ el }) => axis === 'x' ? el.x : el.y);
    const target = mode === 'min'  ? Math.min(...coords)
                 : mode === 'max'  ? Math.max(...coords)
                 : coords.reduce((a, b) => a + b, 0) / coords.length;

    items.forEach(({ el, kind }) => {
      if (axis === 'x') el.x = target; else el.y = target;
      el.konvaGroup?.position({ x: el.x, y: -el.y });
      if (kind === 'point') {
        pathList.filter(pa => pa.startPointId === el.id || pa.endPointId === el.id)
                .forEach(pa => updatePathGeometry(pa));
        links.filter(lk => lk.pointId === el.id).forEach(lk => updateLinkGeometry(lk));
      } else {
        links.filter(lk => lk.locationId === el.id).forEach(lk => updateLinkGeometry(lk));
      }
    });
    layers.forEach(l => l.konvaLayer?.batchDraw());
  }

  // ── Undo / Redo ──────────────────────────────────────────────────
  const undoStack = [];
  const redoStack = [];
  const MAX_UNDO  = 100;

  function captureState() {
    const replacer = (k, v) => {
      if (k === 'konvaGroup') return undefined;
      if (typeof v === 'number' && isNaN(v)) return '__NaN__';
      return v;
    };
    const text = JSON.stringify({
      points, pathList, locations, links, blocks, vehicles, locationTypes,
      counters: { pointCounter, ltCounter, locCounter, blockCounter, vehicleCounter },
    }, replacer);
    return JSON.parse(text, (k, v) => v === '__NaN__' ? NaN : v);
  }

  function pushUndoState() {
    undoStack.push(captureState());
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack.length = 0;
    updateUndoRedoButtons();
    markDirty();
  }

  function updateUndoRedoButtons() {
    const u = document.querySelector('.me-toolbar .me-tool[title="Undo"]');
    const r = document.querySelector('.me-toolbar .me-tool[title="Redo"]');
    if (u) u.disabled = undoStack.length === 0;
    if (r) r.disabled = redoStack.length === 0;
  }

  function restoreState(snap) {
    pathStartId = null;
    clearPathPreview();
    selectedPointId = null; selectedPathId = null; selectedLocationId = null;
    selectedLinkId  = null; selectedLtId   = null; selectedBlockId    = null;
    selectedVehicleId = null; multiSelection = [];

    layers.forEach(l => { if (l.id !== '__bg__') l.worldGroup?.destroyChildren(); });

    const loadV = (arr, src) => { arr.length = 0; src.forEach(o => arr.push(Object.assign({}, o, { konvaGroup: null }))); };
    const loadD = (arr, src) => { arr.length = 0; src.forEach(o => arr.push(Object.assign({}, o))); };
    loadV(points,        snap.points);
    loadV(pathList,      snap.pathList);
    loadV(locations,     snap.locations);
    loadV(links,         snap.links);
    loadD(blocks,        snap.blocks);
    loadD(vehicles,      snap.vehicles);
    loadD(locationTypes, snap.locationTypes);

    ({ pointCounter, ltCounter, locCounter, blockCounter, vehicleCounter } = snap.counters);

    points.forEach(p      => drawPoint(p));
    pathList.forEach(pa   => drawPath(pa));
    locations.forEach(loc => drawLocation(loc));
    links.forEach(lk      => drawLink(lk));

    renderPropertiesPanel(null);
    renderComponentsTree();
    updateCounts(points.length, pathList.length, locations.length);
    updateUndoRedoButtons();
  }

  function performUndo() {
    if (!undoStack.length) return;
    redoStack.push(captureState());
    restoreState(undoStack.pop());
  }

  function performRedo() {
    if (!redoStack.length) return;
    undoStack.push(captureState());
    restoreState(redoStack.pop());
  }

  // ── Path tool state ─────────────────────────────────────────────
  let pathStartId = null; // point id waiting for second click

  function cancelPathTool() {
    if (pathStartId) {
      setPointStyle(getPoint(pathStartId), false);
      pathStartId = null;
    }
    clearPathPreview();
  }

  function clearPathPreview() {
    previewGroup.destroyChildren();
    previewLayer.batchDraw();
  }

  function updatePathPreview(wx, wy) {
    previewGroup.destroyChildren();
    if (!pathStartId) return;
    const sp = getPoint(pathStartId);
    if (!sp) return;

    // Convert Y-up world coords to screen Y-down for Konva drawing
    const swy  = -wy;
    const sspy = -sp.y;

    const dx = wx - sp.x, dy = swy - sspy;
    const len = Math.sqrt(dx*dx + dy*dy) || 1;
    const ux = dx/len, uy = dy/len;
    const px = -uy, py = ux;

    previewGroup.add(new Konva.Line({
      points: [sp.x, sspy, wx, swy],
      stroke: '#888',
      strokeWidth: 1.5,
      dash: [6, 5],
      strokeScaleEnabled: false,
      listening: false,
    }));

    previewGroup.add(new Konva.Line({
      points: [
        wx, swy,
        wx - ux*ARROW_LEN + px*(ARROW_W/2), swy - uy*ARROW_LEN + py*(ARROW_W/2),
        wx - ux*ARROW_LEN - px*(ARROW_W/2), swy - uy*ARROW_LEN - py*(ARROW_W/2),
      ],
      closed: true,
      fill: '#888',
      strokeWidth: 0,
      strokeScaleEnabled: false,
      listening: false,
    }));

    previewLayer.batchDraw();
  }

  // ── Path properties panel ────────────────────────────────────────
  function renderPathProperties(pa) {
    const panel = document.getElementById('properties-panel');
    if (!panel) return;
    const sp = getPoint(pa.startPointId);
    const ep = getPoint(pa.endPointId);
    const len = (pa.length !== null ? pa.length : pathLength(pa)).toFixed(1);

    panel.innerHTML = `
      <div class="me-selection">
        <svg class="me-selection__icon"><use href="#icon-path"/></svg>
        <div class="pp-name-wrap">
          <span class="pp-name">${pa.name}</span>
        </div>
      </div>
      <table class="pp-table">
        <thead><tr><th>Attribute</th><th>Value</th></tr></thead>
        <tbody>
          <tr>
            <td>Name</td>
            <td><input class="pp-pa-name" type="text" value="${pa.name}"></td>
          </tr>
          <tr>
            <td>Length</td>
            <td><div class="pp-val-row">
              <input class="pp-pa-length" type="text" readonly value="${len}"
                style="background:#f3f1ec;color:var(--muted);cursor:default;">
              <span class="pp-unit">mm</span>
            </div></td>
          </tr>
          <tr>
            <td>Maximum velocity</td>
            <td><div class="pp-val-row">
              <input class="pp-pa-maxv" type="number" step="any" value="${pa.maxVelocity}">
              <span class="pp-unit">m/s</span>
            </div></td>
          </tr>
          <tr>
            <td>Maximum reverse velocity</td>
            <td><div class="pp-val-row">
              <input class="pp-pa-maxrv" type="number" step="any" value="${pa.maxReverseVelocity}">
              <span class="pp-unit">m/s</span>
            </div></td>
          </tr>
          <tr>
            <td>Path connection type</td>
            <td><select class="pp-pa-type">
              <option value="DIRECT"    ${pa.connectionType === 'DIRECT'    ? 'selected' : ''}>Direct</option>
              <option value="BEZIER"    ${pa.connectionType === 'BEZIER'    ? 'selected' : ''}>Bezier curve (cubic)</option>
              <option value="BEZIER_Q"  ${pa.connectionType === 'BEZIER_Q'  ? 'selected' : ''}>Bezier curve (quadratic)</option>
              <option value="POLYLINE"  ${pa.connectionType === 'POLYLINE'  ? 'selected' : ''}>Polyline</option>
            </select></td>
          </tr>
          ${pa.connectionType === 'POLYLINE' ? `
          <tr>
            <td colspan="2" style="padding:4px 0 2px;">
              <div style="display:flex;gap:4px;">
                <button id="pp-wp-add" style="font-size:11px;padding:2px 8px;border:1px solid var(--border);
                  background:#f3f1ec;border-radius:2px;cursor:pointer;flex:1;">+ Add waypoint</button>
              </div>
              ${pa.controlPoints.length > 0 ? `
              <table style="width:100%;font-family:var(--font-mono);font-size:11px;margin-top:2px;border-collapse:collapse;">
                <thead><tr style="background:#e8e5de;">
                  <th style="padding:2px 6px;text-align:left;">#</th>
                  <th style="padding:2px 6px;text-align:left;">X</th>
                  <th style="padding:2px 6px;text-align:left;">Y</th>
                  <th style="padding:2px 6px;"></th>
                </tr></thead>
                <tbody>
                  ${pa.controlPoints.map((cp, i) => `
                  <tr class="pp-wp-row" data-idx="${i}" style="border-bottom:1px solid #eee;cursor:pointer;">
                    <td style="padding:2px 6px;">${i + 1}</td>
                    <td style="padding:2px 6px;">
                      <input class="pp-wp-x" data-idx="${i}" type="number" step="1" value="${Math.round(cp.x)}"
                        style="width:60px;font-family:inherit;font-size:inherit;border:1px solid var(--border);padding:1px 3px;">
                    </td>
                    <td style="padding:2px 6px;">
                      <input class="pp-wp-y" data-idx="${i}" type="number" step="1" value="${Math.round(cp.y)}"
                        style="width:60px;font-family:inherit;font-size:inherit;border:1px solid var(--border);padding:1px 3px;">
                    </td>
                    <td style="padding:2px 4px;">
                      <button class="pp-wp-del" data-idx="${i}"
                        style="font-size:11px;padding:1px 5px;border:1px solid var(--border);
                        background:#f3f1ec;border-radius:2px;cursor:pointer;color:#c00;">×</button>
                    </td>
                  </tr>`).join('')}
                </tbody>
              </table>` : ''}
            </td>
          </tr>` : ''}
          <tr class="pp-section"><td colspan="2">Path control points</td></tr>
          <tr>
            <td>Start Component</td>
            <td>${sp?.name ?? '—'}</td>
          </tr>
          <tr>
            <td>End Component</td>
            <td>${ep?.name ?? '—'}</td>
          </tr>
          <tr>
            <td>Layer</td>
            <td><select class="pp-pa-layer">
              ${layers.map(l => `<option value="${l.id}" ${l.id === pa.layerId ? 'selected' : ''}>${l.name}</option>`).join('')}
            </select></td>
          </tr>
          <tr>
            <td>Locked</td>
            <td><input class="pp-pa-locked" type="checkbox" ${pa.locked ? 'checked' : ''}></td>
          </tr>
          <tr class="pp-section"><td colspan="2">Peripheral operations</td></tr>
          <tr>
            <td>Operations</td>
            <td>
              <button class="pp-pa-periph-btn" style="font-family:var(--font-mono);font-size:11px;
                border:1px solid var(--border);background:#f3f1ec;padding:1px 8px;
                border-radius:2px;cursor:pointer;width:100%;text-align:left;">
                ${pa.peripheralOperations.length === 0 ? 'None defined…' : `${pa.peripheralOperations.length} operation(s)…`}
              </button>
            </td>
          </tr>
          <tr class="pp-section"><td colspan="2">Vehicle envelopes</td></tr>
          <tr>
            <td>Envelopes</td>
            <td>
              <button class="pp-pa-env-btn" style="font-family:var(--font-mono);font-size:11px;
                border:1px solid var(--border);background:#f3f1ec;padding:1px 8px;
                border-radius:2px;cursor:pointer;width:100%;text-align:left;">
                ${pa.envelopes.length === 0 ? 'None defined…' : `${pa.envelopes.length} envelope(s)…`}
              </button>
            </td>
          </tr>
          <tr class="pp-section"><td colspan="2">Miscellaneous</td></tr>
          <tr>
            <td>Properties</td>
            <td>
              <button class="pp-pa-misc-btn" style="font-family:var(--font-mono);font-size:11px;
                border:1px solid var(--border);background:#f3f1ec;padding:1px 8px;
                border-radius:2px;cursor:pointer;width:100%;text-align:left;">
                ${pa.miscProperties.length === 0 ? 'None defined…' : `${pa.miscProperties.length} pair(s)…`}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="pp-delete-zone">
        <button class="pp-delete" data-action="delete-path">Delete path</button>
      </div>
    `;

    const q = sel => panel.querySelector(sel);

    q('[data-action="delete-path"]').addEventListener('click', () => removePath(pa.id));

    q('.pp-pa-name').addEventListener('change', e => {
      const val = e.target.value.trim();
      if (!val) { e.target.value = pa.name; return; }
      pa.name = val;
      panel.querySelector('.pp-name').textContent = pa.name;
      renderComponentsTree();
    });



    q('.pp-pa-maxv').addEventListener('change', e => {
      pa.maxVelocity = parseFloat(e.target.value) || 0;
    });

    q('.pp-pa-maxrv').addEventListener('change', e => {
      pa.maxReverseVelocity = parseFloat(e.target.value) || 0;
    });

    q('.pp-pa-type').addEventListener('change', e => {
      const newType = e.target.value;
      if (newType === pa.connectionType) return;
      pa.connectionType = newType;
      pa.controlPoints = [];
      if (newType === 'BEZIER' || newType === 'BEZIER_Q' || newType === 'POLYLINE') seedControlPoints(pa);
      drawPath(pa);
      setPathStyle(pa, true);
      renderPathProperties(pa); // re-render to show/hide radius helper / waypoints
    });

    // Polyline waypoint controls
    const wpAdd = q('#pp-wp-add');
    if (wpAdd) {
      wpAdd.addEventListener('click', () => {
        const sp2 = getPoint(pa.startPointId);
        const ep2 = getPoint(pa.endPointId);
        // Build full node list: start → waypoints → end
        const nodes = [sp2, ...pa.controlPoints, ep2];
        // Find the longest segment — split it so the new point goes where there's the most room
        let maxLen = -1, splitAt = 0;
        for (let i = 0; i < nodes.length - 1; i++) {
          const dx = nodes[i + 1].x - nodes[i].x;
          const dy = nodes[i + 1].y - nodes[i].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d > maxLen) { maxLen = d; splitAt = i; }
        }
        // Insert midpoint of that segment into controlPoints at the right index
        // splitAt corresponds to segment nodes[splitAt]→nodes[splitAt+1]
        // In controlPoints, index = splitAt - 1 (since nodes[0] = sp2)
        const newWp = {
          x: Math.round((nodes[splitAt].x + nodes[splitAt + 1].x) / 2),
          y: Math.round((nodes[splitAt].y + nodes[splitAt + 1].y) / 2),
        };
        pa.controlPoints.splice(splitAt, 0, newWp);
        drawPath(pa); setPathStyle(pa, true);
        renderPathProperties(pa);
      });
    }
    // Per-row waypoint delete buttons
    panel.querySelectorAll('.pp-wp-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.idx);
        pa.controlPoints.splice(i, 1);
        drawPath(pa); setPathStyle(pa, true);
        renderPathProperties(pa);
      });
    });

    // Waypoint row selection — highlights the matching canvas handle
    let wpSel = -1;
    function applyWpHandleColors() {
      if (!pa.konvaGroup) return;
      pa.controlPoints.forEach((_, j) => {
        const h = pa.konvaGroup.findOne('.wp-handle-' + j);
        if (!h) return;
        if (j === wpSel) { h.fill('#fef08a'); h.stroke('#d97706'); }
        else             { h.fill('#fff');    h.stroke('#7c3aed'); }
      });
      getLayer(pa.layerId)?.konvaLayer.batchDraw();
    }
    panel.querySelectorAll('.pp-wp-row').forEach(row => {
      row.addEventListener('click', e => {
        if (e.target.closest('input, button')) return;
        const i = parseInt(row.dataset.idx);
        wpSel = (wpSel === i) ? -1 : i;
        panel.querySelectorAll('.pp-wp-row').forEach(r =>
          r.style.background = parseInt(r.dataset.idx) === wpSel ? '#fef9c3' : '');
        applyWpHandleColors();
      });
    });

    // Inline waypoint coordinate edits
    panel.querySelectorAll('.pp-wp-x').forEach(inp => {
      inp.addEventListener('change', () => {
        const i = parseInt(inp.dataset.idx);
        pa.controlPoints[i].x = Math.round(parseFloat(inp.value)) || 0;
        inp.value = pa.controlPoints[i].x;
        drawPath(pa); setPathStyle(pa, true);
      });
    });
    panel.querySelectorAll('.pp-wp-y').forEach(inp => {
      inp.addEventListener('change', () => {
        const i = parseInt(inp.dataset.idx);
        pa.controlPoints[i].y = Math.round(parseFloat(inp.value)) || 0;
        inp.value = pa.controlPoints[i].y;
        drawPath(pa); setPathStyle(pa, true);
      });
    });

    q('.pp-pa-layer').addEventListener('change', e => {
      const newLayerId = e.target.value;
      if (newLayerId === pa.layerId) return;
      const oldLayer = getLayer(pa.layerId);
      const newLayer = getLayer(newLayerId);
      if (!oldLayer || !newLayer?.worldGroup) return;
      pa.konvaGroup.moveTo(newLayer.worldGroup);
      pa.konvaGroup.moveToBottom();
      oldLayer.konvaLayer.batchDraw();
      newLayer.konvaLayer.batchDraw();
      pa.layerId = newLayerId;
    });

    q('.pp-pa-locked').addEventListener('change', e => {
      pa.locked = e.target.checked;
    });

    q('.pp-pa-periph-btn').addEventListener('click', () => openPeripheralOpsDialog(pa));
    q('.pp-pa-env-btn').addEventListener('click', () => openEnvelopesDialog(pa));
    q('.pp-pa-misc-btn').addEventListener('click', () => openMiscPropertiesDialog(pa));
  }

  // Add location type button
  document.getElementById('btn-add-ltype')?.addEventListener('click', e => {
    e.stopPropagation();
    const lt = createLocationType();
    renderComponentsTree();
    selectLocationType(lt.id);
  });

  document.getElementById('btn-add-block')?.addEventListener('click', e => {
    e.stopPropagation();
    const blk = createBlock();
    renderComponentsTree();
    selectBlock(blk.id);
  });

  document.getElementById('btn-add-vehicle')?.addEventListener('click', e => {
    e.stopPropagation();
    const veh = createVehicle();
    renderComponentsTree();
    selectVehicle(veh.id);
  });

  // Toolbar "create" shortcuts — not drawing tools, just instant-create buttons
  document.querySelector('.me-toolbar .me-tool[title="Vehicle"]')?.addEventListener('click', () => {
    pushUndoState();
    const veh = createVehicle();
    renderComponentsTree();
    selectVehicle(veh.id);
  });

  document.querySelector('.me-toolbar .me-tool[title="Block"]')?.addEventListener('click', () => {
    pushUndoState();
    const blk = createBlock();
    renderComponentsTree();
    selectBlock(blk.id);
  });

  document.querySelector('.me-toolbar .me-tool[title="LocationType"]')?.addEventListener('click', () => {
    pushUndoState();
    const lt = createLocationType();
    renderComponentsTree();
    selectLocationType(lt.id);
  });

  document.querySelector('.me-toolbar .me-tool[title="Align left"]')?.addEventListener('click', () => alignElements('x', 'min'));
  document.querySelector('.me-toolbar .me-tool[title="Align center horizontal"]')?.addEventListener('click', () => alignElements('x', 'mid'));
  document.querySelector('.me-toolbar .me-tool[title="Align right"]')?.addEventListener('click', () => alignElements('x', 'max'));
  document.querySelector('.me-toolbar .me-tool[title="Align top"]')?.addEventListener('click', () => alignElements('y', 'min'));
  document.querySelector('.me-toolbar .me-tool[title="Align center vertical"]')?.addEventListener('click', () => alignElements('y', 'mid'));
  document.querySelector('.me-toolbar .me-tool[title="Align bottom"]')?.addEventListener('click', () => alignElements('y', 'max'));

  const gridGroup = new Konva.Group();
  world.add(gridGroup);

  const zoomPct = document.querySelector('.me-canvas__zoom__pct');

  // ── Origin marker (drawn in screen space on overlayLayer) ─────
  // Stays at a fixed pixel size; repositioned on every redraw.
  const ARM = 24; // crosshair arm length in px
  const originShapes = {
    lineX: new Konva.Line({ points: [-ARM, 0, ARM, 0], stroke: '#e05555', strokeWidth: 1.2 }),
    lineY: new Konva.Line({ points: [0, -ARM, 0, ARM], stroke: '#4a9e6b', strokeWidth: 1.2 }),
    dot:   new Konva.Circle({ radius: 3.5, fill: '#fff', stroke: '#555', strokeWidth: 1.2 }),
    lblX:  new Konva.Text({ text: 'X', fontSize: 9, fontFamily: 'IBM Plex Mono, monospace', fill: '#e05555' }),
    lblY:  new Konva.Text({ text: 'Y', fontSize: 9, fontFamily: 'IBM Plex Mono, monospace', fill: '#4a9e6b' }),
    lbl00: new Konva.Text({ text: '0,0', fontSize: 8, fontFamily: 'IBM Plex Mono, monospace', fill: '#888' }),
  };
  Object.values(originShapes).forEach(s => overlayLayer.add(s));

  // ── Area-select rubber-band rect (lives in screen space on overlayLayer) ──
  const areaSelRect = new Konva.Rect({
    stroke: '#2563eb', strokeWidth: 1.5,
    fill: 'rgba(37,99,235,0.07)',
    dash: [5, 3], visible: false, listening: false,
  });
  overlayLayer.add(areaSelRect);

  overlayLayer.clip({ x: RULER_W, y: RULER_H, width: W - RULER_W, height: H - RULER_H });

  function updateOriginMarker() {
    const ox = tx;
    const oy = ty;
    const visible = ox > RULER_W - ARM && ox < W + ARM && oy > RULER_H - ARM && oy < H + ARM;
    Object.values(originShapes).forEach(s => s.visible(visible));
    if (!visible) { overlayLayer.batchDraw(); return; }
    originShapes.lineX.position({ x: ox, y: oy });
    originShapes.lineY.position({ x: ox, y: oy });
    originShapes.dot.position({ x: ox, y: oy });
    originShapes.lblX.position({ x: ox + ARM + 3, y: oy - 6 });
    originShapes.lblY.position({ x: ox + 4, y: oy + ARM + 2 });
    originShapes.lbl00.position({ x: ox + 5, y: oy - ARM - 12 });
    overlayLayer.batchDraw();
  }

  // ── Snap ──────────────────────────────────────────────────────
  let snapEnabled = true;

  function getSnapStep() {
    return (20 * ts >= 4) ? 20 : 100;
  }

  function snapCoord(v) {
    if (!snapEnabled) return v;
    const step = getSnapStep();
    return Math.round(v / step) * step;
  }

  // ── Grid (redrawn to show only visible tiles) ─────────────────
  let gridVisible = true;

  const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  function drawGrid() {
    gridGroup.destroyChildren();
    if (!gridVisible) return;

    const s  = ts;
    const ox = tx;
    const oy = ty;

    // World-space visible bounds
    const wx0 = (RULER_W - ox) / s;
    const wy0 = (RULER_H - oy) / s;
    const wx1 = (W - ox) / s;
    const wy1 = (H - oy) / s;

    const snap = (v, step) => Math.floor(v / step) * step;
    const fineCol   = cssVar('--border-faint');
    const coarseCol = cssVar('--border');

    // Fine grid (20 units) — skip if too dense on screen
    if (20 * s >= 4) {
      for (let x = snap(wx0, 20); x <= wx1; x += 20)
        gridGroup.add(new Konva.Line({ points: [x, wy0, x, wy1], stroke: fineCol, strokeWidth: 0.5 / s }));
      for (let y = snap(wy0, 20); y <= wy1; y += 20)
        gridGroup.add(new Konva.Line({ points: [wx0, y, wx1, y], stroke: fineCol, strokeWidth: 0.5 / s }));
    }

    // Coarse grid (100 units)
    for (let x = snap(wx0, 100); x <= wx1; x += 100)
      gridGroup.add(new Konva.Line({ points: [x, wy0, x, wy1], stroke: coarseCol, strokeWidth: 0.6 / s }));
    for (let y = snap(wy0, 100); y <= wy1; y += 100)
      gridGroup.add(new Konva.Line({ points: [wx0, y, wx1, y], stroke: coarseCol, strokeWidth: 0.6 / s }));
  }

  // ── Rulers (fixed, redrawn on every pan/zoom) ─────────────────
  function drawRulers() {
    rulerLayer.destroyChildren();

    const s  = ts;
    const ox = tx;
    const oy = ty;

    // Backgrounds
    const rulerBg  = cssVar('--panel');
    const rulerBdr = cssVar('--border');
    const rulerTick = cssVar('--muted');
    rulerLayer.add(new Konva.Rect({ x: 0, y: 0, width: W, height: RULER_H, fill: rulerBg }));
    rulerLayer.add(new Konva.Rect({ x: 0, y: 0, width: RULER_W, height: H,  fill: rulerBg }));
    rulerLayer.add(new Konva.Line({ points: [RULER_W, RULER_H, W, RULER_H], stroke: rulerBdr, strokeWidth: 1 }));
    rulerLayer.add(new Konva.Line({ points: [RULER_W, RULER_H, RULER_W, H], stroke: rulerBdr, strokeWidth: 1 }));

    // Pick a step that keeps screen gaps between 50–120px
    const minGap = 50;
    const rawStep = minGap / s;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const step = ([1, 2, 5].find(n => n * mag >= rawStep) ?? 10) * mag;

    // Horizontal ticks
    const wxStart = Math.floor((RULER_W - ox) / s / step) * step;
    for (let wx = wxStart; ox + wx * s <= W; wx += step) {
      const sx = ox + wx * s;
      if (sx < RULER_W) continue;
      rulerLayer.add(new Konva.Line({ points: [sx, RULER_H - 5, sx, RULER_H], stroke: rulerTick, strokeWidth: 1 }));
      rulerLayer.add(new Konva.Text({ x: sx + 2, y: 7, text: String(Math.round(wx)), fontSize: 8, fontFamily: 'IBM Plex Mono, monospace', fill: rulerTick }));
    }

    // Vertical ticks
    const wyStart = Math.floor((RULER_H - oy) / s / step) * step;
    for (let wy = wyStart; oy + wy * s <= H; wy += step) {
      const sy = oy + wy * s;
      if (sy < RULER_H) continue;
      rulerLayer.add(new Konva.Line({ points: [RULER_W - 5, sy, RULER_W, sy], stroke: rulerTick, strokeWidth: 1 }));
      rulerLayer.add(new Konva.Text({ x: 2, y: sy + 1, text: String(Math.round(-wy)), fontSize: 8, fontFamily: 'IBM Plex Mono, monospace', fill: rulerTick }));
    }

    rulerLayer.batchDraw();
  }

  // ── Unit conversion ───────────────────────────────────────────
  // 1 world unit = 1 mm (base). Conversions and display precision:
  const UNITS = [
    { label: 'mm', factor: 1,      decimals: 0 },
    { label: 'cm', factor: 0.1,    decimals: 1 },
    { label: 'm',  factor: 0.001,  decimals: 3 },
  ];
  let unitIdx = 0;

  function toUnit(worldVal) {
    const u = UNITS[unitIdx];
    return (worldVal * u.factor).toFixed(u.decimals);
  }

  document.getElementById('sb-unit').addEventListener('click', function () {
    unitIdx = (unitIdx + 1) % UNITS.length;
    this.textContent = UNITS[unitIdx].label;
  });

  function updateStatusBar() {
    const s = ts;
    const pct = Math.round(s * 100);

    // Grid label: show the coarse grid world-unit size
    const minGap = 50;
    const rawStep = minGap / s;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const step = ([1, 2, 5].find(n => n * mag >= rawStep) ?? 10) * mag;
    sb.grid.textContent = gridVisible ? `Grid: ${Math.round(step * 10)}` : 'Grid: off';

    sb.zoom.textContent = `Zoom: ${pct}%`;
    zoomPct.textContent = `${pct}%`;
  }

  function redraw() {
    applyTransform();
    drawGrid();
    contentLayer.batchDraw();
    layers.forEach(l => l.konvaLayer?.batchDraw());
    drawRulers();
    updateStatusBar();
    updateOriginMarker();
  }

  redraw();

  // ── Area-select state ─────────────────────────────────────────
  let areaSelStart  = null; // screen-space {x,y} of drag start
  let areaSelActive = false;

  function finishAreaSelect() {
    areaSelRect.visible(false);
    overlayLayer.batchDraw();
    const endPos = stage.getPointerPosition() || areaSelStart;
    const start  = areaSelStart;
    areaSelStart  = null;
    areaSelActive = false;
    if (!start) return;

    const dx = endPos.x - start.x, dy = endPos.y - start.y;
    // Small drag → treat as click → clear selection
    if (Math.sqrt(dx*dx + dy*dy) < 5) {
      clearMultiSelection();
      deselectPoint(); deselectPath(); deselectLocationType();
      deselectLocation(); deselectLink(); deselectBlock(); deselectVehicle();
      renderPropertiesPanel(null);
      return;
    }

    // World bounds (Y-up)
    const sx1 = Math.min(start.x, endPos.x), sx2 = Math.max(start.x, endPos.x);
    const sy1 = Math.min(start.y, endPos.y), sy2 = Math.max(start.y, endPos.y);
    const wx1 = (sx1 - tx) / ts,  wx2 = (sx2 - tx) / ts;
    const wy1 = -(sy2 - ty) / ts, wy2 = -(sy1 - ty) / ts; // Y-up: flip

    clearMultiSelection();
    deselectPoint(); deselectPath(); deselectLocationType();
    deselectLocation(); deselectLink(); deselectBlock(); deselectVehicle();

    const inside = (ex, ey) => ex >= wx1 && ex <= wx2 && ey >= wy1 && ey <= wy2;
    points.forEach(p => {
      if (!getLayer(p.layerId)?.locked && inside(p.x, p.y)) {
        multiSelection.push({ id: p.id, kind: 'point' });
        setPointMultiStyle(p);
      }
    });
    locations.forEach(loc => {
      if (!getLayer(loc.layerId)?.locked && !loc.locked && inside(loc.x, loc.y)) {
        multiSelection.push({ id: loc.id, kind: 'location' });
        setLocationMultiStyle(loc);
      }
    });

    // If only 1 item, promote to single selection
    if (multiSelection.length === 1) {
      const { id, kind } = multiSelection[0];
      clearMultiSelection();
      if (kind === 'point') selectPoint(id);
      else selectLocation(id);
    } else {
      renderPropertiesPanel(null);
    }
  }

  // ── Pan (manual tracking — rulers stay fixed) ─────────────────
  let panning    = false;
  let panMoved   = 0;   // accumulated pixel distance — distinguishes click from pan
  let lastPos    = { x: 0, y: 0 };

  stage.on('mousedown', e => {
    if (e.target !== stage) return; // shape drag — don't pan
    if (activeTool === 'AreaSelect') {
      areaSelStart  = stage.getPointerPosition();
      areaSelActive = true;
      return;
    }
    panning  = true;
    panMoved = 0;
    lastPos  = stage.getPointerPosition();
    if (activeTool !== 'Point') container.style.cursor = 'grabbing';
  });

  stage.on('mousemove', () => {
    const pos = stage.getPointerPosition();

    // Live coordinates in status bar (Y-up: negate canvas Y)
    const wx = (pos.x - tx) / ts;
    const wy = -(pos.y - ty) / ts;
    const u = UNITS[unitIdx].label;
    sb.coords.textContent = `x: ${toUnit(wx)} ${u}  y: ${toUnit(wy)} ${u}`;

    // Path rubber-band preview
    if ((activeTool === 'Path' || activeTool === 'Link') && pathStartId) updatePathPreview(wx, wy);

    // Area-select rubber-band
    if (areaSelActive && areaSelStart) {
      const rx = Math.min(areaSelStart.x, pos.x), ry = Math.min(areaSelStart.y, pos.y);
      areaSelRect.setAttrs({ x: rx, y: ry, width: Math.abs(pos.x - areaSelStart.x), height: Math.abs(pos.y - areaSelStart.y), visible: true });
      overlayLayer.batchDraw();
    }

    if (!panning) return;
    const dx = pos.x - lastPos.x;
    const dy = pos.y - lastPos.y;
    panMoved += Math.abs(dx) + Math.abs(dy);
    tx += dx;
    ty += dy;
    lastPos = pos;
    redraw();
  });

  stage.on('mouseleave', () => {
    const u = UNITS[unitIdx].label;
    sb.coords.textContent = `x: —  y: — ${u}`;
    if (areaSelActive) { finishAreaSelect(); }
  });

  window.addEventListener('mouseup', () => {
    if (areaSelActive) { finishAreaSelect(); return; }
    panning = false;
    container.style.cursor = (activeTool === 'Point' || activeTool === 'Path' || activeTool === 'Link' || activeTool === 'Location' || activeTool === 'AreaSelect') ? 'crosshair' : 'grab';
  });

  // ── Canvas click — place point or clear selection ─────────────
  stage.on('click', e => {
    if (activeTool === 'AreaSelect') return; // handled by mouseup
    if (panMoved > 4) return; // was a pan drag, not a click
    if (e.target !== stage) return;

    if (activeTool === 'Point') {
      pushUndoState();
      const pos = stage.getPointerPosition();
      const wx  = snapCoord((pos.x - tx) / ts);
      const wy  = snapCoord(-(pos.y - ty) / ts);
      const p   = createPoint(wx, wy, activeLayerId);
      drawPoint(p);
      updateCounts(points.length, pathList.length, locations.length);
      renderComponentsTree();
    } else if (activeTool === 'Location') {
      pushUndoState();
      const pos = stage.getPointerPosition();
      const wx  = snapCoord((pos.x - tx) / ts);
      const wy  = snapCoord(-(pos.y - ty) / ts);
      const loc = createLocation(wx, wy, activeLayerId);
      drawLocation(loc);
      updateCounts(points.length, pathList.length, locations.length);
      renderComponentsTree();
      selectLocation(loc.id);
    } else if (activeTool === 'Path' || activeTool === 'Link') {
      cancelPathTool(); // clicked empty space — cancel pending first-click
    } else {
      clearMultiSelection();
      deselectPoint();
      deselectPath();
      deselectLocationType();
      deselectLocation();
      deselectLink();
      deselectBlock();
      deselectVehicle();
    }
  });

  // ── Zoom (wheel, centered on cursor) ─────────────────────────
  function applyZoom(newScale, focalX, focalY) {
    const wx = (focalX - tx) / ts;
    const wy = (focalY - ty) / ts;
    ts = newScale;
    tx = focalX - wx * ts;
    ty = focalY - wy * ts;
    redraw();
  }

  stage.on('wheel', e => {
    e.evt.preventDefault();
    const ptr    = stage.getPointerPosition();
    const factor = e.evt.deltaY < 0 ? 1.12 : 1 / 1.12;
    applyZoom(Math.min(8, Math.max(0.05, ts * factor)), ptr.x, ptr.y);
  });

  const midX = () => W / 2;
  const midY = () => H / 2;

  function fitToContent() {
    const allItems = [
      ...points.map(p => ({ x: p.x, y: -p.y })),
      ...locations.map(l => ({ x: l.x, y: -l.y })),
    ];
    if (allItems.length === 0) { tx = RULER_W; ty = RULER_H; ts = 1; redraw(); return; }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    allItems.forEach(({ x, y }) => {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    });
    const PAD = 60;
    const vw = W - RULER_W - PAD * 2;
    const vh = H - RULER_H - PAD * 2;
    const cw = maxX - minX || 1;
    const ch = maxY - minY || 1;
    const newTs = Math.min(8, Math.max(0.05, Math.min(vw / cw, vh / ch)));
    tx = RULER_W + PAD + (vw - cw * newTs) / 2 - minX * newTs;
    ty = RULER_H + PAD + (vh - ch * newTs) / 2 - minY * newTs;
    ts = newTs;
    redraw();
  }

  document.querySelector('[title="Zoom in"]')?.addEventListener('click', () =>
    applyZoom(Math.min(8, ts * 1.25), midX(), midY()));

  document.querySelector('[title="Zoom out"]')?.addEventListener('click', () =>
    applyZoom(Math.max(0.05, ts / 1.25), midX(), midY()));

  document.querySelector('[title="Fit to window"]')?.addEventListener('click', fitToContent);

  // Grid toggle
  const gridBtn = document.querySelector('[title="Grid"]');
  gridBtn?.addEventListener('click', () => {
    gridVisible = !gridVisible;
    gridBtn.classList.toggle('is-active', gridVisible);
    redraw();
  });

  // Floor plan — load a background image and place it at world origin (0,0)
  const floorPlanBtn = document.querySelector('[title="Floor plan"]');
  const bgFileInput  = document.createElement('input');
  bgFileInput.type   = 'file';
  bgFileInput.accept = 'image/*';
  bgFileInput.style.display = 'none';
  document.body.appendChild(bgFileInput);

  floorPlanBtn?.addEventListener('click', () => bgFileInput.click());

  bgFileInput.addEventListener('change', () => {
    const file = bgFileInput.files[0];
    bgFileInput.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const img = new window.Image();
      img.onload = () => {
        // Reuse existing bg layer or create a new one at index 0
        let bgDef = getLayer('__bg__');
        if (!bgDef) {
          bgDef = { id: '__bg__', name: 'Floor plan', visible: true, locked: true, opacity: 1.0, mapMetersPerPixel: 1.0, konvaLayer: null, worldGroup: null };
          const kl = new Konva.Layer({ visible: true, opacity: 1.0 });
          kl.clip({ x: RULER_W, y: RULER_H, width: W - RULER_W, height: H - RULER_H });
          const wg = new Konva.Group({ x: tx, y: ty, scaleX: ts, scaleY: ts });
          kl.add(wg);
          bgDef.konvaLayer = kl;
          bgDef.worldGroup = wg;
          stage.add(kl);
          // Insert at end of layers[] so it sits at the bottom of the UI list (= behind everything)
          layers.push(bgDef);
          reorderKonvaLayers();
        }

        const s = bgDef.mapMetersPerPixel ?? 1.0;
        bgDef.worldGroup.destroyChildren();
        bgDef.worldGroup.add(new Konva.Image({ image: img, x: 0, y: 0, scaleX: s, scaleY: s, listening: false }));
        bgDef.konvaLayer.batchDraw();
        floorPlanBtn.classList.add('is-active');
        renderLayersUI();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  // ── Save Model ───────────────────────────────────────────────
  function buildModelXml(modelName, coordScale = 1) {
    const esc = s => String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const scX  = v => Math.round(v * coordScale);
    const scY  = v => Math.round(v * coordScale); // Y-up stored internally, matches openTCS convention

    // Map JS layer IDs → integer ordinals (skip __bg__)
    const nonBgLayers  = layers.filter(l => l.id !== '__bg__');
    const layerOrdinal = {};
    nonBgLayers.forEach((l, i) => { layerOrdinal[l.id] = i; });
    const layOrd = id => layerOrdinal[id] ?? 0;

    const lines = [];
    lines.push('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>');
    lines.push(`<model version="7.0.0" name="${esc(modelName)}">`);

    // ── Points ──────────────────────────────────────────────────
    for (const p of points) {
      const angle = isNaN(p.angle) ? 'NaN' : p.angle;
      lines.push(`    <point name="${esc(p.name)}" positionX="${scX(p.x)}" positionY="${scY(p.y)}" positionZ="0" vehicleOrientationAngle="${angle}" type="${p.type}">`);
      const bb = p.vehicleBoundingBox;
      lines.push(`        <maxVehicleBoundingBox length="${bb.length}" width="${bb.width}" height="${bb.height}" referenceOffsetX="${bb.refOffsetX}" referenceOffsetY="${bb.refOffsetY}"/>`);
      for (const env of (p.envelopes ?? [])) {
        lines.push(`        <vehicleEnvelope key="${esc(env.key)}">`);
        for (const v of env.coords) lines.push(`            <vertex x="${scX(v.x)}" y="${scY(v.y)}"/>`);
        lines.push(`        </vehicleEnvelope>`);
      }
      for (const pa of pathList.filter(pa => pa.startPointId === p.id))
        lines.push(`        <outgoingPath name="${esc(pa.name)}"/>`);
      for (const prop of (p.miscProperties ?? []))
        lines.push(`        <property name="${esc(prop.key)}" value="${esc(prop.value)}"/>`);
      lines.push(`        <pointLayout labelOffsetX="${p.labelXOffset}" labelOffsetY="${p.labelYOffset}" layerId="${layOrd(p.layerId)}"/>`);
      lines.push(`    </point>`);
    }

    // ── Paths ───────────────────────────────────────────────────
    for (const pa of pathList) {
      const sp  = getPoint(pa.startPointId);
      const ep  = getPoint(pa.endPointId);
      const rawLen = pa.length !== null ? pa.length : pathLength(pa);
      const len   = Math.round(rawLen * coordScale);
      const maxV  = Math.round(pa.maxVelocity * 1000);
      const maxRV = Math.round(pa.maxReverseVelocity * 1000);
      lines.push(`    <path name="${esc(pa.name)}" sourcePoint="${esc(sp?.name ?? '')}" destinationPoint="${esc(ep?.name ?? '')}" length="${len}" maxVelocity="${maxV}" maxReverseVelocity="${maxRV}" locked="${pa.locked}">`);
      for (const env of (pa.envelopes ?? [])) {
        lines.push(`        <vehicleEnvelope key="${esc(env.key)}">`);
        for (const v of env.coords) lines.push(`            <vertex x="${scX(v.x)}" y="${scY(v.y)}"/>`);
        lines.push(`        </vehicleEnvelope>`);
      }
      for (const op of (pa.peripheralOperations ?? []))
        lines.push(`        <peripheralOperation completionRequired="${op.completionRequired}" executionTrigger="${op.trigger}" locationName="${esc(op.location)}" name="${esc(op.operation)}"/>`);
      if (pa.connectionType === 'BEZIER' && pa.controlPoints.length === 2 && sp && ep) {
        lines.push(`        <pathLayout connectionType="BEZIER" layerId="${layOrd(pa.layerId)}">`);
        const cpF = coordScale / 50.0;
        lines.push(`            <controlPoint x="${Math.round(pa.controlPoints[0].x * cpF)}" y="${-Math.round(pa.controlPoints[0].y * cpF)}"/>`);
        lines.push(`            <controlPoint x="${Math.round(pa.controlPoints[1].x * cpF)}" y="${-Math.round(pa.controlPoints[1].y * cpF)}"/>`);
        lines.push(`        </pathLayout>`);
      } else if (pa.connectionType === 'BEZIER_Q' && pa.controlPoints.length === 1 && sp && ep) {
        // Convert quadratic to cubic: C1 = P0 + 2/3*(Q-P0), C2 = P1 + 2/3*(Q-P1)
        const q = pa.controlPoints[0];
        const c1 = { x: sp.x + 2/3*(q.x - sp.x), y: sp.y + 2/3*(q.y - sp.y) };
        const c2 = { x: ep.x + 2/3*(q.x - ep.x), y: ep.y + 2/3*(q.y - ep.y) };
        lines.push(`        <pathLayout connectionType="BEZIER" layerId="${layOrd(pa.layerId)}">`);
        const cpF = coordScale / 50.0;
        lines.push(`            <controlPoint x="${Math.round(c1.x * cpF)}" y="${-Math.round(c1.y * cpF)}"/>`);
        lines.push(`            <controlPoint x="${Math.round(c2.x * cpF)}" y="${-Math.round(c2.y * cpF)}"/>`);
        lines.push(`        </pathLayout>`);
      } else if (pa.connectionType === 'POLYLINE' && pa.controlPoints.length > 0) {
        lines.push(`        <pathLayout connectionType="POLYPATH" layerId="${layOrd(pa.layerId)}">`);
        const cpF = coordScale / 50.0;
        for (const cp of pa.controlPoints)
          lines.push(`            <controlPoint x="${Math.round(cp.x * cpF)}" y="${-Math.round(cp.y * cpF)}"/>`);
        lines.push(`        </pathLayout>`);
      } else {
        // DIRECT, or curve types with no control points → treat as DIRECT
        const ct = ['POLYLINE', 'BEZIER', 'BEZIER_Q'].includes(pa.connectionType) ? 'DIRECT' : pa.connectionType;
        lines.push(`        <pathLayout connectionType="${ct}" layerId="${layOrd(pa.layerId)}"/>`);
      }
      lines.push(`    </path>`);
    }

    // ── Vehicles ─────────────────────────────────────────────────
    for (const veh of vehicles) {
      const envAttr = veh.envelopeKey ? ` envelopeKey="${esc(veh.envelopeKey)}"` : '';
      lines.push(`    <vehicle name="${esc(veh.name)}" energyLevelCritical="${veh.energyCritical}" energyLevelGood="${veh.energyDegraded}" energyLevelFullyRecharged="${veh.energyFullyRecharged}" energyLevelSufficientlyRecharged="${veh.energySufficientlyRecharged}" maxVelocity="${veh.maxVelocity}" maxReverseVelocity="${veh.maxReverseVelocity}"${envAttr}>`);
      lines.push(`        <boundingBox length="${veh.boundingBoxLength}" width="${veh.boundingBoxWidth}" height="${veh.boundingBoxHeight}" referenceOffsetX="${veh.boundingBoxOffsetX}" referenceOffsetY="${veh.boundingBoxOffsetY}"/>`);
      for (const prop of (veh.miscProperties ?? []))
        lines.push(`        <property name="${esc(prop.key)}" value="${esc(prop.value)}"/>`);
      lines.push(`        <vehicleLayout color="${esc(veh.routeColor)}"/>`);
      lines.push(`    </vehicle>`);
    }

    // ── Location types ────────────────────────────────────────────
    for (const lt of locationTypes) {
      lines.push(`    <locationType name="${esc(lt.name)}">`);
      for (const op of (lt.supportedPeripheralOperations ?? []))
        lines.push(`        <allowedPeripheralOperation name="${esc(op)}"/>`);
      for (const op of (lt.supportedVehicleOperations ?? []))
        lines.push(`        <allowedOperation name="${esc(op)}"/>`);
      for (const prop of (lt.miscProperties ?? []))
        lines.push(`        <property name="${esc(prop.key)}" value="${esc(prop.value)}"/>`);
      lines.push(`        <locationTypeLayout locationRepresentation="${esc(lt.symbol)}"/>`);
      lines.push(`    </locationType>`);
    }

    // ── Locations ─────────────────────────────────────────────────
    for (const loc of locations) {
      const ltName = getLocationType(loc.type)?.name ?? '';
      lines.push(`    <location name="${esc(loc.name)}" positionX="${scX(loc.x)}" positionY="${scY(loc.y)}" positionZ="0" locked="${loc.locked}" type="${esc(ltName)}">`);
      for (const lk of links.filter(lk => lk.locationId === loc.id)) {
        const pt = getPoint(lk.pointId);
        if (pt) lines.push(`        <link point="${esc(pt.name)}"/>`);
      }
      for (const prop of (loc.miscProperties ?? []))
        lines.push(`        <property name="${esc(prop.key)}" value="${esc(prop.value)}"/>`);
      lines.push(`        <locationLayout labelOffsetX="${loc.labelXOffset}" labelOffsetY="${loc.labelYOffset}" locationRepresentation="${esc(loc.symbol)}" layerId="${layOrd(loc.layerId)}"/>`);
      lines.push(`    </location>`);
    }

    // ── Blocks ───────────────────────────────────────────────────
    for (const blk of blocks) {
      lines.push(`    <block name="${esc(blk.name)}" type="${blk.type}">`);
      for (const memberId of blk.members) {
        const name = getPoint(memberId)?.name ?? getPath(memberId)?.name ?? getLocation(memberId)?.name ?? memberId;
        lines.push(`        <member name="${esc(name)}"/>`);
      }
      lines.push(`        <blockLayout color="${esc(blk.color)}"/>`);
      lines.push(`    </block>`);
    }

    // ── Visual layout ─────────────────────────────────────────────
    lines.push(`    <visualLayout name="VLayout-01" scaleX="50.0" scaleY="50.0">`);
    nonBgLayers.forEach((l, i) => {
      lines.push(`        <layer id="${i}" ordinal="${i}" visible="${l.visible}" name="${esc(l.name)}" groupId="0"/>`);
    });
    lines.push(`        <layerGroup id="0" name="Default layer group" visible="true"/>`);
    lines.push(`    </visualLayout>`);

    const ts = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    lines.push(`    <property name="tcs:modelFileLastModified" value="${ts}"/>`);
    lines.push(`</model>`);

    return lines.join('\n');
  }

  function downloadXml(xml, filename) {
    const blob = new Blob([xml], { type: 'application/xml' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const COORD_SCALE = 100; // 1 canvas unit = 100 mm

  // ── Model meta state ─────────────────────────────────────────
  let currentModelName = 'New Model';
  let currentFileName  = null;
  let modelDirty       = false;
  let lastSavedTime    = null;

  function updateMetaBar() {
    const el = document.getElementById('menubar-meta');
    if (!el) return;
    const parts = [currentModelName];
    if (currentFileName) parts.push(currentFileName);
    if (modelDirty)          parts.push('modified');
    else if (lastSavedTime)  parts.push('saved ' + lastSavedTime);
    else                     parts.push('unsaved');
    el.textContent = parts.join(' · ');
  }

  function markDirty() {
    if (modelDirty) return;
    modelDirty = true;
    updateMetaBar();
  }

  function markSaved(name, filename) {
    currentModelName = name;
    currentFileName  = filename;
    modelDirty       = false;
    const now = new Date();
    lastSavedTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    updateMetaBar();
  }

  function markLoaded(name, filename) {
    currentModelName = name;
    currentFileName  = filename;
    modelDirty       = false;
    lastSavedTime    = null;
    updateMetaBar();
  }

  function promptSaveModel(defaultName) {
    const { body, foot, close } = createModal('Save Model', 340);
    body.innerHTML = `
      <table class="me-modal-table" style="width:100%">
        <tbody>
          <tr class="me-modal-row">
            <td class="me-modal-label">Model name</td>
            <td><input id="save-model-name" type="text" value="${defaultName}"
              style="width:100%;font-family:var(--font-mono);font-size:12px;border:1px solid var(--border);padding:2px 6px;"></td>
          </tr>
        </tbody>
      </table>`;
    foot.innerHTML = `
      <button class="me-modal-btn me-modal-btn--primary" id="save-ok">Save</button>
      <button class="me-modal-btn" id="save-cancel">Cancel</button>`;
    const nameInput = document.getElementById('save-model-name');
    nameInput.select();
    foot.querySelector('#save-ok').addEventListener('click', () => {
      const name = nameInput.value.trim() || defaultName;
      close();
      const filename = name + '.xml';
      downloadXml(buildModelXml(name, COORD_SCALE), filename);
      markSaved(name, filename);
    });
    foot.querySelector('#save-cancel').addEventListener('click', close);
    nameInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') foot.querySelector('#save-ok').click();
      if (e.key === 'Escape') close();
    });
  }

  function saveModelDirect() {
    const filename = currentModelName + '.xml';
    downloadXml(buildModelXml(currentModelName, COORD_SCALE), filename);
    markSaved(currentModelName, filename);
  }

  // ── Load Model ───────────────────────────────────────────────
  function loadModelXml(xmlText, filename) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    if (doc.querySelector('parsererror')) throw new Error('Invalid XML file.');
    const model = doc.querySelector('model');
    if (!model) throw new Error('No <model> element found.');

    const ga  = (el, name, def = '') => el?.getAttribute(name) ?? def;
    const gi  = (el, name, def = 0)  => { const v = parseInt(ga(el, name), 10); return isNaN(v) ? def : v; };
    const gf  = (el, name, def = 0)  => { const v = parseFloat(ga(el, name)); return isNaN(v) ? def : v; };
    const unX = v => v / COORD_SCALE;
    const unY = v => v / COORD_SCALE; // Y-up stored internally, matches openTCS convention

    // Read scale from visualLayout (default 50: 1 pixel = 50mm)
    const vlEl = doc.querySelector('visualLayout');
    const xmlScaleX = gf(vlEl, 'scaleX', 50.0);
    const xmlScaleY = gf(vlEl, 'scaleY', 50.0);
    // Control point conversion: openTCS pixel → our canvas unit
    // pixel = model_mm / xmlScale; our_unit = model_mm / COORD_SCALE → our_unit = pixel * xmlScale / COORD_SCALE
    const cpX = v =>  v * xmlScaleX / COORD_SCALE; // absolute x pixel → canvas unit
    const cpY = v => -v * xmlScaleY / COORD_SCALE; // absolute y pixel (Y-down) → canvas unit (Y-up: negate)

    // ── Clear state ────────────────────────────────────────────────
    pathStartId = null;
    clearPathPreview();
    selectedPointId = null; selectedPathId = null; selectedLocationId = null;
    selectedLinkId  = null; selectedLtId   = null; selectedBlockId    = null;
    selectedVehicleId = null; multiSelection = [];

    const userLayers = layers.filter(l => l.id !== '__bg__');
    userLayers.forEach(l => l.konvaLayer.destroy());
    const bgEntry = layers.find(l => l.id === '__bg__');
    layers.length = 0;
    if (bgEntry) layers.push(bgEntry);

    points.length = 0; pathList.length = 0; locations.length = 0;
    links.length = 0; blocks.length = 0; vehicles.length = 0; locationTypes.length = 0;
    pointCounter = 1; ltCounter = 1; locCounter = 1; blockCounter = 1; vehicleCounter = 1;
    undoStack.length = 0; redoStack.length = 0; updateUndoRedoButtons();

    // ── Layers ─────────────────────────────────────────────────────
    const layerIdMap = {}; // xmlLayerId (int) → jsLayerId (string)
    const xmlLayerEls = [...doc.querySelectorAll('visualLayout > layer')]
      .sort((a, b) => gi(a, 'ordinal') - gi(b, 'ordinal'));

    const addKonvaLayer = (def) => {
      const kl = new Konva.Layer({ visible: def.visible, opacity: def.opacity });
      kl.clip({ x: RULER_W, y: RULER_H, width: W - RULER_W, height: H - RULER_H });
      const wg = new Konva.Group({ x: tx, y: ty, scaleX: ts, scaleY: ts });
      kl.add(wg);
      def.konvaLayer = kl; def.worldGroup = wg;
      stage.add(kl);
    };

    if (xmlLayerEls.length === 0) {
      const def = { id: 'layer-' + Date.now(), name: 'Layer 1', visible: true, locked: false, opacity: 1.0, konvaLayer: null, worldGroup: null };
      layers.push(def); addKonvaLayer(def); layerIdMap[0] = def.id;
    } else {
      xmlLayerEls.forEach((el, i) => {
        const xmlId = gi(el, 'id');
        const def = {
          id: 'layer-' + Date.now() + '-' + i,
          name: ga(el, 'name') || ('Layer ' + (xmlId + 1)),
          visible: ga(el, 'visible') !== 'false',
          locked: false, opacity: 1.0, konvaLayer: null, worldGroup: null,
        };
        layers.push(def); addKonvaLayer(def); layerIdMap[xmlId] = def.id;
      });
    }
    activeLayerId = layers.find(l => l.id !== '__bg__')?.id ?? layers[0].id;
    newLayerIndex = layers.filter(l => l.id !== '__bg__').length + 1;
    reorderKonvaLayers();

    const defaultLayerId = () => layerIdMap[0] ?? activeLayerId;

    // ── Location types ─────────────────────────────────────────────
    const ltNameToId = {};
    let _ltSeq = 0;
    doc.querySelectorAll('model > locationType').forEach(el => {
      const lt = {
        id: 'lt-' + Date.now() + '-' + (_ltSeq++),
        name: ga(el, 'name') || ('LType-' + String(ltCounter).padStart(4, '0')),
        supportedVehicleOperations: [...el.querySelectorAll('allowedOperation')].map(o => ga(o, 'name')),
        supportedPeripheralOperations: [...el.querySelectorAll('allowedPeripheralOperation')].map(o => ga(o, 'name')),
        symbol: ga(el.querySelector('locationTypeLayout'), 'locationRepresentation') || 'NONE',
        miscProperties: [...el.querySelectorAll(':scope > property')].map(p => ({ key: ga(p, 'name'), value: ga(p, 'value') })),
      };
      locationTypes.push(lt); ltNameToId[lt.name] = lt.id; ltCounter++;
    });

    // ── Points ─────────────────────────────────────────────────────
    const pointNameToId = {};
    let _ptSeq = 0;
    doc.querySelectorAll('model > point').forEach(el => {
      const layoutEl = el.querySelector('pointLayout');
      const xmlLid = gi(layoutEl, 'layerId', 0);
      const bb = el.querySelector('maxVehicleBoundingBox');
      const angleStr = ga(el, 'vehicleOrientationAngle');
      const p = {
        id: 'pt-' + Date.now() + '-' + (_ptSeq++),
        name: ga(el, 'name') || ('Point-' + String(pointCounter).padStart(4, '0')),
        x: unX(gf(el, 'positionX')),
        y: unY(gf(el, 'positionY')),
        layerId: layerIdMap[xmlLid] ?? defaultLayerId(),
        konvaGroup: null,
        angle: (angleStr === 'NaN' || angleStr === '') ? NaN : parseFloat(angleStr),
        type: ga(el, 'type') || 'HALT_POSITION',
        envelopes: [...el.querySelectorAll('vehicleEnvelope')].map(env => ({
          key: ga(env, 'key'),
          coords: [...env.querySelectorAll('vertex')].map(v => ({ x: unX(gf(v, 'x')), y: unY(gf(v, 'y')) })),
        })),
        vehicleBoundingBox: {
          length: gi(bb, 'length', 1000), width: gi(bb, 'width', 1000), height: gi(bb, 'height', 1000),
          refOffsetX: gi(bb, 'referenceOffsetX', 0), refOffsetY: gi(bb, 'referenceOffsetY', 0),
        },
        miscProperties: [...el.querySelectorAll(':scope > property')].map(p => ({ key: ga(p, 'name'), value: ga(p, 'value') })),
        labelXOffset: gi(layoutEl, 'labelOffsetX', -10),
        labelYOffset: gi(layoutEl, 'labelOffsetY', -20),
        labelOrientationAngle: NaN,
      };
      points.push(p); pointNameToId[p.name] = p.id; pointCounter++;
    });

    // ── Paths ──────────────────────────────────────────────────────
    const pathNameToId = {};
    let _paSeq = 0;
    doc.querySelectorAll('model > path').forEach(el => {
      const layoutEl = el.querySelector('pathLayout');
      const xmlLid = gi(layoutEl, 'layerId', 0);
      const srcId = pointNameToId[ga(el, 'sourcePoint')];
      const dstId = pointNameToId[ga(el, 'destinationPoint')];
      if (!srcId || !dstId) return;
      const sp = points.find(p => p.id === srcId);
      const ep = points.find(p => p.id === dstId);
      const xmlType = ga(layoutEl, 'connectionType') || 'DIRECT';
      const ctrlEls = layoutEl ? [...layoutEl.querySelectorAll('controlPoint')] : [];

      let connectionType = 'DIRECT', controlPoints = [];
      if (xmlType === 'BEZIER' && ctrlEls.length === 2 && sp && ep) {
        connectionType = 'BEZIER';
        controlPoints = [
          { x: cpX(gf(ctrlEls[0], 'x')), y: cpY(gf(ctrlEls[0], 'y')) },
          { x: cpX(gf(ctrlEls[1], 'x')), y: cpY(gf(ctrlEls[1], 'y')) },
        ];
      } else if (xmlType === 'POLYPATH' && ctrlEls.length > 0 && sp) {
        connectionType = 'POLYLINE';
        controlPoints = ctrlEls.map(c => ({
          x: cpX(gf(c, 'x')),
          y: cpY(gf(c, 'y')),
        }));
      }

      const pa = {
        id: 'path-' + Date.now() + '-' + (_paSeq++),
        name: ga(el, 'name') || (sp?.name + ' --- ' + ep?.name),
        startPointId: srcId, endPointId: dstId,
        layerId: layerIdMap[xmlLid] ?? defaultLayerId(),
        length: gf(el, 'length') / COORD_SCALE,
        maxVelocity: gf(el, 'maxVelocity') / 1000,
        maxReverseVelocity: gf(el, 'maxReverseVelocity') / 1000,
        connectionType, controlPoints,
        locked: ga(el, 'locked') === 'true',
        peripheralOperations: [...el.querySelectorAll('peripheralOperation')].map(o => ({
          location: ga(o, 'locationName'), operation: ga(o, 'name'),
          trigger: ga(o, 'executionTrigger'), completionRequired: ga(o, 'completionRequired') === 'true',
        })),
        envelopes: [...el.querySelectorAll('vehicleEnvelope')].map(env => ({
          key: ga(env, 'key'),
          coords: [...env.querySelectorAll('vertex')].map(v => ({ x: unX(gf(v, 'x')), y: unY(gf(v, 'y')) })),
        })),
        miscProperties: [...el.querySelectorAll(':scope > property')].map(p => ({ key: ga(p, 'name'), value: ga(p, 'value') })),
        konvaGroup: null,
      };
      pathList.push(pa); pathNameToId[pa.name] = pa.id;
    });

    // ── Vehicles ───────────────────────────────────────────────────
    let _vSeq = 0;
    doc.querySelectorAll('model > vehicle').forEach(el => {
      const bb = el.querySelector('boundingBox');
      const layout = el.querySelector('vehicleLayout');
      vehicles.push({
        id: 'veh-' + Date.now() + '-' + (_vSeq++),
        name: ga(el, 'name') || ('Vehicle-' + String(vehicleCounter).padStart(4, '0')),
        boundingBoxLength: gi(bb, 'length', 1000), boundingBoxWidth: gi(bb, 'width', 1000), boundingBoxHeight: gi(bb, 'height', 1000),
        boundingBoxOffsetX: gi(bb, 'referenceOffsetX', 0), boundingBoxOffsetY: gi(bb, 'referenceOffsetY', 0),
        routeColor: ga(layout, 'color') || '#ff0000',
        maxVelocity: gf(el, 'maxVelocity', 1000), maxReverseVelocity: gf(el, 'maxReverseVelocity', 1000),
        energyCritical: gi(el, 'energyLevelCritical', 30), energyFullyRecharged: gi(el, 'energyLevelFullyRecharged', 90),
        energyDegraded: gi(el, 'energyLevelGood', 40), energySufficientlyRecharged: gi(el, 'energyLevelSufficientlyRecharged', 95),
        currentEnergyLevel: NaN, loaded: false, state: 'UNKNOWN', processingState: 'IDLE',
        integrationLevel: ga(el, 'integrationLevel') || 'TO_BE_RESPECTED', paused: false,
        currentPoint: '', exactPosition: 'null', vehicleOrientation: NaN,
        envelopeKey: ga(el, 'envelopeKey') || '',
        miscProperties: [...el.querySelectorAll(':scope > property')].map(p => ({ key: ga(p, 'name'), value: ga(p, 'value') })),
        currentTransportOrder: '', currentOrderSequence: '', acceptableOrderTypes: '', allocatedResources: '', claimedResources: '',
      });
      vehicleCounter++;
    });

    // ── Locations + Links ──────────────────────────────────────────
    const locNameToId = {};
    let _locSeq = 0, _lkSeq = 0;
    doc.querySelectorAll('model > location').forEach(el => {
      const layoutEl = el.querySelector('locationLayout');
      const xmlLid = gi(layoutEl, 'layerId', 0);
      const jsLayerId = layerIdMap[xmlLid] ?? defaultLayerId();
      const loc = {
        id: 'loc-' + Date.now() + '-' + (_locSeq++),
        name: ga(el, 'name') || ('Location-' + String(locCounter).padStart(4, '0')),
        x: unX(gf(el, 'positionX')), y: unY(gf(el, 'positionY')),
        layerId: jsLayerId, konvaGroup: null,
        type: ltNameToId[ga(el, 'type')] ?? null,
        locked: ga(el, 'locked') === 'true',
        symbol: ga(layoutEl, 'locationRepresentation') || 'DEFAULT',
        labelXOffset: gi(layoutEl, 'labelOffsetX', -10), labelYOffset: gi(layoutEl, 'labelOffsetY', -20),
        labelOrientationAngle: NaN, reservationToken: '', peripheralState: '', processingState: '', peripheralJob: '',
        miscProperties: [...el.querySelectorAll(':scope > property')].map(p => ({ key: ga(p, 'name'), value: ga(p, 'value') })),
      };
      locations.push(loc); locNameToId[loc.name] = loc.id; locCounter++;

      el.querySelectorAll('link').forEach(linkEl => {
        const ptId = pointNameToId[ga(linkEl, 'point')];
        if (!ptId) return;
        links.push({
          id: 'link-' + Date.now() + '-' + (_lkSeq++),
          name: ga(linkEl, 'point') + ' --- ' + loc.name,
          pointId: ptId, locationId: loc.id, layerId: jsLayerId,
          actions: [], konvaGroup: null,
        });
      });
    });

    // ── Blocks ─────────────────────────────────────────────────────
    let _blkSeq = 0;
    doc.querySelectorAll('model > block').forEach(el => {
      const blkLayout = el.querySelector('blockLayout');
      const memberNames = [...el.querySelectorAll('member')].map(m => ga(m, 'name'));
      blocks.push({
        id: 'blk-' + Date.now() + '-' + (_blkSeq++),
        name: ga(el, 'name') || ('Block-' + String(blockCounter).padStart(4, '0')),
        color: ga(blkLayout, 'color') || '#ff0000',
        type: ga(el, 'type') || 'SINGLE_VEHICLE_ONLY',
        members: memberNames.map(n => pointNameToId[n] ?? pathNameToId[n] ?? locNameToId[n]).filter(Boolean),
        miscProperties: [...el.querySelectorAll(':scope > property')].map(p => ({ key: ga(p, 'name'), value: ga(p, 'value') })),
      });
      blockCounter++;
    });

    // ── Draw ───────────────────────────────────────────────────────
    points.forEach(p => drawPoint(p));
    pathList.forEach(pa => drawPath(pa));
    locations.forEach(loc => drawLocation(loc));
    links.forEach(lk => drawLink(lk));

    renderLayersUI();
    renderComponentsTree();
    updateCounts(points.length, pathList.length, locations.length);
    fitToContent();

    const modelName = ga(model, 'name') || 'Plant-Model';
    markLoaded(modelName, filename || null);
  }

  function promptLoadModel() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.xml,application/xml,text/xml';
    input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          loadModelXml(ev.target.result, file.name);
        } catch (err) {
          alert('Failed to load model: ' + err.message);
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  function promptNewModel() {
    if (!confirm('Create a new model? Unsaved changes will be lost.')) return;
    pathStartId = null;
    clearPathPreview();
    selectedPointId = null; selectedPathId = null; selectedLocationId = null;
    selectedLinkId  = null; selectedLtId   = null; selectedBlockId    = null;
    selectedVehicleId = null; multiSelection = [];

    const userLayers = layers.filter(l => l.id !== '__bg__');
    userLayers.forEach(l => l.konvaLayer.destroy());
    const bgEntry = layers.find(l => l.id === '__bg__');
    layers.length = 0;
    if (bgEntry) layers.push(bgEntry);

    points.length = 0; pathList.length = 0; locations.length = 0;
    links.length = 0; blocks.length = 0; vehicles.length = 0; locationTypes.length = 0;
    pointCounter = 1; ltCounter = 1; locCounter = 1; blockCounter = 1; vehicleCounter = 1;
    undoStack.length = 0; redoStack.length = 0; updateUndoRedoButtons();

    const id = 'layer-' + Date.now();
    const def = { id, name: 'Layer 1', visible: true, locked: false, opacity: 1.0, konvaLayer: null, worldGroup: null };
    layers.push(def);
    const kl = new Konva.Layer({ visible: true, opacity: 1.0 });
    kl.clip({ x: RULER_W, y: RULER_H, width: W - RULER_W, height: H - RULER_H });
    const wg = new Konva.Group({ x: tx, y: ty, scaleX: ts, scaleY: ts });
    kl.add(wg); def.konvaLayer = kl; def.worldGroup = wg;
    stage.add(kl);
    reorderKonvaLayers();
    activeLayerId = id;
    newLayerIndex = 2;

    renderLayersUI();
    renderComponentsTree();
    updateCounts(0, 0, 0);
    redraw();
    markLoaded('New Model', null);
  }

  // ── File menu dropdown ────────────────────────────────────────
  const fileMenuEl     = document.getElementById('menu-file');
  const fileDropdownEl = fileMenuEl?.querySelector('.me-menu__dropdown');
  fileMenuEl?.querySelector('.me-menu__trigger').addEventListener('click', e => {
    e.stopPropagation();
    fileDropdownEl.classList.toggle('is-open');
  });
  document.addEventListener('click', () => fileDropdownEl?.classList.remove('is-open'));

  function closeFileMenu() { fileDropdownEl?.classList.remove('is-open'); }

  document.getElementById('file-new')?.addEventListener('click', () => {
    closeFileMenu(); promptNewModel();
  });
  document.getElementById('file-load')?.addEventListener('click', () => {
    closeFileMenu(); promptLoadModel();
  });
  document.getElementById('file-save')?.addEventListener('click', () => {
    closeFileMenu();
    if (currentFileName) saveModelDirect(); else promptSaveModel(currentModelName);
  });
  document.getElementById('file-save-as')?.addEventListener('click', () => {
    closeFileMenu(); promptSaveModel(currentModelName);
  });

  window.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault(); promptNewModel();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
      e.preventDefault(); promptLoadModel();
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 's') {
      e.preventDefault(); promptSaveModel(currentModelName);
    } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (currentFileName) saveModelDirect(); else promptSaveModel(currentModelName);
    }
  }, true);

  // ── About modal ──────────────────────────────────────────────
  const aboutModal = document.getElementById('about-modal');
  document.getElementById('btn-about')?.addEventListener('click', () => {
    aboutModal.style.display = 'flex';
  });
  document.getElementById('about-close')?.addEventListener('click', () => {
    aboutModal.style.display = 'none';
  });
  aboutModal?.addEventListener('click', e => {
    if (e.target === aboutModal) aboutModal.style.display = 'none';
  });

  // ── Edit menu ────────────────────────────────────────────────
  let clipboard = []; // [{ kind: 'point'|'location', data: {...} }]

  const editMenuEl     = document.getElementById('menu-edit');
  const editDropdownEl = editMenuEl?.querySelector('.me-menu__dropdown');
  editMenuEl?.querySelector('.me-menu__trigger').addEventListener('click', e => {
    e.stopPropagation();
    editDropdownEl.classList.toggle('is-open');
  });
  document.addEventListener('click', () => editDropdownEl?.classList.remove('is-open'));

  function closeEditMenu() { editDropdownEl?.classList.remove('is-open'); }

  // Select All — multi-select every point and location on unlocked layers
  function selectAll() {
    if (selectedPointId)    { setPointStyle(getPoint(selectedPointId), false); selectedPointId = null; }
    if (selectedPathId)     { const prev = getPath(selectedPathId); setPathStyle(prev, false); if (needsHandleRedraw(prev)) drawPath(prev, false); selectedPathId = null; }
    if (selectedLocationId) { setLocationStyle(getLocation(selectedLocationId), false); selectedLocationId = null; }
    if (selectedLinkId)     { setLinkStyle(getLink(selectedLinkId), false); selectedLinkId = null; }
    selectedLtId = null; selectedBlockId = null; selectedVehicleId = null;
    clearMultiSelection();
    points.forEach(p => {
      if (getLayer(p.layerId)?.locked) return;
      multiSelection.push({ id: p.id, kind: 'point' }); setPointMultiStyle(p);
    });
    locations.forEach(loc => {
      if (getLayer(loc.layerId)?.locked || loc.locked) return;
      multiSelection.push({ id: loc.id, kind: 'location' }); setLocationMultiStyle(loc);
    });
    renderPropertiesPanel(null);
  }

  // Deselect All — clear every selection
  function deselectAll() {
    clearMultiSelection();
    if (selectedPointId)    { setPointStyle(getPoint(selectedPointId), false); selectedPointId = null; }
    if (selectedPathId)     { const prev = getPath(selectedPathId); setPathStyle(prev, false); if (needsHandleRedraw(prev)) drawPath(prev, false); selectedPathId = null; }
    if (selectedLocationId) { setLocationStyle(getLocation(selectedLocationId), false); selectedLocationId = null; }
    if (selectedLinkId)     { setLinkStyle(getLink(selectedLinkId), false); selectedLinkId = null; }
    selectedLtId = null; selectedBlockId = null; selectedVehicleId = null;
    renderPropertiesPanel(null);
    renderComponentsTree();
  }

  // Delete selection — handles multi-selection with a single undo state
  function deleteSelection() {
    if (multiSelection.length > 0) {
      pushUndoState();
      const toDelete = [...multiSelection];
      multiSelection = [];
      toDelete.forEach(({ id, kind }) => {
        if (kind === 'point') {
          if (selectedPointId === id) selectedPointId = null;
          if (pathStartId === id) pathStartId = null;
          pathList.filter(pa => pa.startPointId === id || pa.endPointId === id)
                  .map(pa => pa.id).forEach(pid => deletePath(pid));
          links.filter(lk => lk.pointId === id).map(lk => lk.id).forEach(lid => deleteLink(lid));
          deletePoint(id);
        } else if (kind === 'location') {
          if (selectedLocationId === id) selectedLocationId = null;
          links.filter(lk => lk.locationId === id).map(lk => lk.id).forEach(lid => deleteLink(lid));
          deleteLocation(id);
        }
      });
      updateCounts(points.length, pathList.length, locations.length);
      renderPropertiesPanel(null);
      renderComponentsTree();
      return;
    }
    if (selectedPointId)        removePoint(selectedPointId);
    else if (selectedPathId)     removePath(selectedPathId);
    else if (selectedLocationId) removeLocation(selectedLocationId);
    else if (selectedLinkId)     removeLink(selectedLinkId);
    else if (selectedBlockId)    removeBlock(selectedBlockId);
    else if (selectedVehicleId)  removeVehicle(selectedVehicleId);
  }

  // Copy — snapshot selected points/locations + paths between them into clipboard
  function copySelection() {
    const drop = (k, v) => (k === 'konvaGroup' ? undefined : v);
    clipboard = [];
    const src = multiSelection.length > 0 ? multiSelection
              : selectedPointId    ? [{ id: selectedPointId,    kind: 'point'    }]
              : selectedLocationId ? [{ id: selectedLocationId, kind: 'location' }]
              : [];
    if (!src.length) return false;
    const srcIds = new Set(src.map(s => s.id));
    src.forEach(({ id, kind }) => {
      const el = kind === 'point' ? getPoint(id) : getLocation(id);
      if (el) clipboard.push({ kind, data: JSON.parse(JSON.stringify(el, drop)) });
    });
    // Also copy paths whose both endpoints are in the selection
    pathList.forEach(pa => {
      if (srcIds.has(pa.startPointId) && srcIds.has(pa.endPointId))
        clipboard.push({ kind: 'path', data: JSON.parse(JSON.stringify(pa, drop)) });
    });
    return clipboard.length > 0;
  }

  // Paste — recreate clipboard items offset down-right
  function pasteClipboard() {
    if (!clipboard.length) return;
    pushUndoState();
    const OX =  10; // canvas units right
    const OY = -10; // canvas units down (Y-up: negative = downward on screen)
    const placed = [];
    const idMap  = {}; // old point id → new point id (for path reconnection)

    clipboard.forEach(({ kind, data }) => {
      if (kind === 'point') {
        const p = createPoint(data.x + OX, data.y + OY, activeLayerId);
        p.angle = data.angle; p.type = data.type;
        p.vehicleBoundingBox    = { ...data.vehicleBoundingBox };
        p.miscProperties        = (data.miscProperties    || []).map(m => ({ ...m }));
        p.labelXOffset          = data.labelXOffset;
        p.labelYOffset          = data.labelYOffset;
        p.labelOrientationAngle = data.labelOrientationAngle;
        drawPoint(p);
        idMap[data.id] = p.id;
        placed.push({ id: p.id, kind: 'point' });
      } else if (kind === 'location') {
        const loc = createLocation(data.x + OX, data.y + OY, activeLayerId);
        loc.type = data.type; loc.symbol = data.symbol;
        loc.miscProperties        = (data.miscProperties || []).map(m => ({ ...m }));
        loc.labelXOffset          = data.labelXOffset;
        loc.labelYOffset          = data.labelYOffset;
        loc.labelOrientationAngle = data.labelOrientationAngle;
        drawLocation(loc);
        placed.push({ id: loc.id, kind: 'location' });
      }
    });

    // Recreate paths between pasted points
    clipboard.forEach(({ kind, data }) => {
      if (kind !== 'path') return;
      const newSrc = idMap[data.startPointId];
      const newDst = idMap[data.endPointId];
      if (!newSrc || !newDst) return;
      const pa = createPath(newSrc, newDst, activeLayerId);
      pa.length             = data.length;
      pa.maxVelocity        = data.maxVelocity;
      pa.maxReverseVelocity = data.maxReverseVelocity;
      pa.locked             = data.locked;
      pa.connectionType     = data.connectionType;
      pa.controlPoints      = (data.controlPoints || []).map(cp => ({ x: cp.x + OX, y: cp.y + OY }));
      pa.peripheralOperations = (data.peripheralOperations || []).map(o => ({ ...o }));
      pa.envelopes            = (data.envelopes || []).map(e => ({ ...e }));
      pa.miscProperties       = (data.miscProperties || []).map(m => ({ ...m }));
      drawPath(pa);
    });

    // Select all pasted nodes
    clearMultiSelection();
    if (placed.length === 1) {
      if (placed[0].kind === 'point') selectPoint(placed[0].id);
      else                            selectLocation(placed[0].id);
    } else if (placed.length > 1) {
      placed.forEach(({ id, kind }) => {
        multiSelection.push({ id, kind });
        if (kind === 'point') setPointMultiStyle(getPoint(id));
        else                  setLocationMultiStyle(getLocation(id));
      });
      renderPropertiesPanel(null);
    }
    updateCounts(points.length, pathList.length, locations.length);
    renderComponentsTree();
  }

  // Cut — copy then delete
  function cutSelection() { if (copySelection()) deleteSelection(); }

  // Duplicate — copy + paste in one step
  function duplicateSelection() { if (copySelection()) pasteClipboard(); }

  // Wire Edit menu items
  document.getElementById('edit-delete')?.addEventListener('click',      () => { closeEditMenu(); deleteSelection(); });
  document.getElementById('edit-cut')?.addEventListener('click',         () => { closeEditMenu(); cutSelection(); });
  document.getElementById('edit-copy')?.addEventListener('click',        () => { closeEditMenu(); copySelection(); });
  document.getElementById('edit-paste')?.addEventListener('click',       () => { closeEditMenu(); pasteClipboard(); });
  document.getElementById('edit-duplicate')?.addEventListener('click',   () => { closeEditMenu(); duplicateSelection(); });
  document.getElementById('edit-select-all')?.addEventListener('click',  () => { closeEditMenu(); selectAll(); });
  document.getElementById('edit-deselect-all')?.addEventListener('click',() => { closeEditMenu(); deselectAll(); });

  // Dark / light theme toggle
  const themeBtn = document.getElementById('btn-theme-toggle');
  const themeIcon = themeBtn?.querySelector('use');
  let darkMode = false;
  themeBtn?.addEventListener('click', () => {
    darkMode = !darkMode;
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : '');
    themeIcon?.setAttribute('href', darkMode ? '#icon-sun' : '#icon-moon');
    themeBtn.classList.toggle('is-active', darkMode);
    redraw();
  });

  // Snap toggle
  const snapBtn = document.querySelector('[title="Snap"]');
  snapBtn?.addEventListener('click', () => {
    snapEnabled = !snapEnabled;
    snapBtn.classList.toggle('is-active', snapEnabled);
    sb.snap.textContent = `Snap: ${snapEnabled ? 'on' : 'off'}`;
  });

  // Undo / Redo toolbar buttons
  document.querySelector('.me-toolbar .me-tool[title="Undo"]')?.addEventListener('click', performUndo);
  document.querySelector('.me-toolbar .me-tool[title="Redo"]')?.addEventListener('click', performRedo);
  updateUndoRedoButtons();

  // ── Resize ────────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    W = container.clientWidth;
    H = container.clientHeight;
    stage.width(W);
    stage.height(H);
    const clip = { x: RULER_W, y: RULER_H, width: W - RULER_W, height: H - RULER_H };
    contentLayer.clip(clip);
    overlayLayer.clip(clip);
    layers.forEach(l => l.konvaLayer?.clip(clip));
    redraw();
  });
})();
