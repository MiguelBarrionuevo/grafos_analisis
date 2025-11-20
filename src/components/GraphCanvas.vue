<template>
  <div class="canvas-wrap" style="position:relative;height:100%;width:100%">
    <div ref="container" class="canvas"></div>
    <div ref="mstOverlay" class="mst-overlay" aria-hidden="true">
      <div class="mst-content">
        <span class="mst-label">MST: <span class="mst-value">0</span></span>
        <button class="mst-close" title="Cerrar" @click="clearMST">✕</button>
      </div>
    </div>
  </div>
</template>

<script setup>
// @ts-nocheck
/* eslint-disable no-undef */
/* global defineProps, defineExpose */
import { onMounted, onBeforeUnmount, ref, getCurrentInstance } from 'vue';
import cytoscape from 'cytoscape';
import { MODES } from '../constants/modes';

const props = defineProps({
  mode: { type: String, default: MODES.ADD_NODE }
});

const container = ref(null);
const mstOverlay = ref(null);
let cy = null;

// ===== Estado para Johnson/CPM =====
let criticalMode = false;
let lastNodesTimes = null;      // { [nodeId]: {E, L, slack} }
let lastEdgeSlack = new Map();  // edgeId -> slack

// ===== Modo estricto Johnson (toggle desde Sidebar/App) =====
let johnsonStrict = false;
function setJohnsonStrictMode(v) {
  johnsonStrict = !!v;
}

function randomColor() {
  const h = Math.floor(Math.random() * 360);
  return `hsl(${h} 70% 60%)`;
}
function fmtSlack(x) {
  const v = Number(x);
  if (!isFinite(v)) return 'h=';
  const val = Math.abs(v) < 1e-9 ? 0 : v;
  return `h=${val}`;
}

onMounted(() => {
  cy = cytoscape({
    container: container.value,
    wheelSensitivity: 0.4,
    minZoom: 0.1,
    maxZoom: 5,
    style: [
      // ====== NODOS ======
      {
        selector: 'node',
        style: {
          'background-color': ele => ele.data('color') || '#66ccff',
          'label': 'data(labelDisplay)',
          'font-size': 10,
          'color': '#e5e7eb',
          'text-wrap': 'wrap',
          'text-max-width': 120,
          'text-valign': 'center',
          'text-halign': 'center',
          'text-background-opacity': 0,
          'text-outline-width': 1.5,
          'text-outline-color': '#0b1020',
          'border-width': 2,
          'border-color': '#0b1020'
        }
      },

      // ====== ARISTAS (normales) ======
      {
        selector: 'edge',
        style: {
          'width': 3,
          'line-color': '#102d85',
          'curve-style': 'bezier',
          'label': 'data(labelText)',
          'font-size': 10,
          'color': '#ffffff',
          'text-background-opacity': 0,
          'text-outline-width': 1.5,
          'text-outline-color': '#000000',
          'edge-text-rotation': 'autorotate',
          'text-rotation': 'autorotate',
          'text-margin-y': 12
        }
      },
      {
        selector: 'edge[directed = 1]',
        style: {
          'target-arrow-shape': 'triangle',
          'arrow-scale': 1.1,
          'target-arrow-color': '#102d85'
        }
      },

      // ====== ATENUADOS CUANDO SE MUESTRA LA RUTA CRÍTICA ======
      { selector: 'node.dim', style: { 'opacity': 0.35 } },
      { selector: 'edge.dim', style: { 'opacity': 0.20 } },

      // ====== RESALTADO DE RUTA CRÍTICA ======
      {
        selector: 'edge.critical',
        style: {
          'line-color': '#ef4444',
          'width': 3,
          'arrow-scale': 1.1,
          'color': '#ef4444',
          'text-outline-color': '#0b1020',
          'text-outline-width': 1.5,
          'target-arrow-color': '#ef4444'
        }
      },
      {
        selector: 'node.critical',
        style: {
          'border-width': 2,
          'border-color': '#ef4444',
        }
      }
      ,
      // ====== RESALTADO DE MST (KRUSKAL) ======
      {
        selector: 'edge.mst',
        style: {
          'line-color': '#10b981',
          'width': 3,
          'arrow-scale': 1.1,
          'color': '#10b981',
          'text-outline-color': '#0b1020',
          'text-outline-width': 1.5,
          'target-arrow-color': '#10b981'
        }
      },
        {
          selector: 'edge.dijkstra',
          style: {
            'line-color': '#f59e0b',
            'width': 4,
            'target-arrow-color': '#f59e0b'
          }
        },
        {
          selector: 'node.dijkstra',
          style: {
            'border-width': 3,
            'border-color': '#f59e0b'
          }
        },
      {
        selector: 'node.mst',
        style: {
          'border-width': 2,
          'border-color': '#10b981'
        }
      }
    ],
    layout: { name: 'preset' }
  });

  bindInteractions();

});

onBeforeUnmount(() => { if (cy) { cy.destroy(); cy = null; } });



function bindInteractions() {
  // fondo → agregar nodo
  cy.on('tap', (evt) => {
    if (evt.target !== cy) return;
    console.log('[GraphCanvas] tap en fondo, modo actual:', props.mode, 'esperado:', MODES.ADD_NODE)
    if (props.mode === MODES.ADD_NODE) {
      console.log('[GraphCanvas] Emitiendo addNode con posición:', evt.position)
      emitAddNode(evt.position);
    }
  });

  // agregar arista: origen → destino
  let pendingSource = null;
  cy.on('tap', 'node', (evt) => {
    const node = evt.target;
    if (props.mode === MODES.ADD_EDGE) {
      if (!pendingSource) {
        pendingSource = node; node.addClass('selected');
      } else {
        const s = pendingSource; const t = node;
        s.removeClass('selected'); pendingSource = null;
        emitAddEdge(s.id(), t.id());
      }
    } else if (props.mode === MODES.DELETE) {
      emitDelete(node.id(), 'node');
    }
  });

  cy.on('tap', 'edge', (evt) => {
    if (props.mode === MODES.DELETE) {
      emitDelete(evt.target.id(), 'edge');
    }
  });

  // doble clic → editar
  cy.on('dbltap', 'node', (evt) => {
    if (props.mode === MODES.EDIT) {
      const n = evt.target;
      emitEditNode(n.id(), n.data('label') || '', n.data('color') || '#66ccff');
    }
  });
  cy.on('dbltap', 'edge', (evt) => {
    if (props.mode === MODES.EDIT) {
      const e = evt.target;
      const w = Number(e.data('weight'));
      const directed = !!e.data('directed');
      emitEditEdge(e.id(), isFinite(w) ? w : 0, directed);
    }
  });
}

// ====== Visual MST (Kruskal) ======
function showMST(result, mode) {
  const mst = result?.mstEdgeIds || result?.mstEdges || [];
  // reset labels to weights by default
  cy.edges().forEach(e => {
    const w = Number(e.data('weight'));
    e.data('labelText', String(isFinite(w) ? w : 0));
  });

  cy.nodes().addClass('dim');
  cy.edges().addClass('dim');

  mst.forEach(id => {
    const e = cy.getElementById(id);
    if (e && e.nonempty()) {
      e.removeClass('dim').addClass('mst');
      e.source().removeClass('dim').addClass('mst');
      e.target().removeClass('dim').addClass('mst');
    }
  });
  // show overlay with total weight
  try {
    const overlay = mstOverlay.value;
      if (overlay) {
      const w = Number(result?.totalWeight ?? 0);
      const label = mode === 'max' ? 'Total Maximizacion' : 'Total Minimización';
      // update structured content
      const val = overlay.querySelector('.mst-value');
      const labelNode = overlay.querySelector('.mst-label');
      if (val) val.textContent = String(w);
      if (labelNode) labelNode.firstChild && (labelNode.firstChild.textContent = `${label}: `);
      overlay.style.display = 'block';
    }
  } catch (err) { console.error('showMST overlay error', err); }
}

function clearMST() {
  cy.elements().removeClass('mst').removeClass('dim');
  try {
    const overlay = mstOverlay.value;
    if (overlay) overlay.style.display = 'none';
  } catch (err) { console.error('clearMST overlay error', err); }
}

// ====== Highlight Dijkstra path ======
function showPath(nodeIds){
  try{
    cy.elements().removeClass('dijkstra').addClass('dim');
    nodeIds.forEach((id, idx)=>{
      const n = cy.getElementById(id);
      if(n && n.nonempty()){ n.removeClass('dim').addClass('dijkstra'); }
      if(idx < nodeIds.length - 1){
        // find edge between id -> next
        const next = nodeIds[idx+1];
        const e = cy.edges().filter(ele => (ele.data('source')===id && ele.data('target')===next) || (!ele.data('directed') && ele.data('source')===next && ele.data('target')===id));
        if(e && e.nonempty()){ e.removeClass('dim').addClass('dijkstra'); e.source().removeClass('dim').addClass('dijkstra'); e.target().removeClass('dim').addClass('dijkstra'); }
      }
    });
  }catch(err){ console.error('showPath error', err); }
}

function clearPath(){
  cy.elements().removeClass('dijkstra').removeClass('dim');
}

// ====== Emits a App.vue ======
const { emit } = getCurrentInstance();
function emitAddNode(position) { emit('request-add-node', { position }); }
function emitAddEdge(sourceId, targetId) { emit('request-add-edge', { sourceId, targetId }); }
function emitEditNode(id, label, color) { emit('request-edit-node', { id, label, color }); }
function emitEditEdge(id, weight, directed) { emit('request-edit-edge', { id, weight, directed }); }
function emitDelete(id, kind) { emit('request-delete', { id, kind }); }

// ====== Helpers de validación (modo estricto) ======
function hasReverseEdge(u, v) {
  // ¿Existe v -> u dirigida?
  const sel = cy.$(`edge[directed = 1][source = "${v}"][target = "${u}"]`);
  return sel && sel.nonempty();
}
function isSelfLoop(u, v) {
  return u === v;
}

// ====== API expuesta ======
function ensureNodeLabelDisplay(n) {
  const base = n.data('label') || n.id();
  if (!n.data('labelDisplay')) n.data('labelDisplay', base);
}

function addNode(label, position, color) {
  const id = `n${Date.now()}${Math.floor(Math.random()*1000)}`;
  const baseLabel = (label || id);
  cy.add({
    group: 'nodes',
    data: { id, label: baseLabel, labelDisplay: baseLabel, color: color || randomColor() },
    position
  });
}

function addEdge({ sourceId, targetId, weight, directed }) {
  // === Validaciones modo Johnson estricto ===
  if (johnsonStrict) {
    if (isSelfLoop(sourceId, targetId)) {
      alert('Modo Johnson: no se permiten bucles (A → A).');
      return { ok: false, message: 'Modo Johnson: no se permiten bucles (A → A).' };
    }
    if (hasReverseEdge(sourceId, targetId)) {
      alert('Modo Johnson: no se permiten pares opuestos (ya existe la arista destino → origen).');
      return { ok: false, message: 'Modo Johnson: no se permiten pares opuestos (ya existe la arista destino → origen).' };
    }
  }

  const id = `e${Date.now()}${Math.floor(Math.random()*1000)}`;
  const w = Number(weight);
  const dir = johnsonStrict ? 1 : (directed ? 1 : 0);

  cy.add({
    group: 'edges',
    data: {
      id, source: sourceId, target: targetId,
      weight: w,
      directed: dir,
      labelText: String(isFinite(w) ? w : 0) // por defecto: muestra el peso
    }
  });

  return { ok: true, id };
}

function updateNode({ id, label, color }) {
  const n = cy.getElementById(id);
  if (n && n.nonempty()) {
    if (label != null) n.data('label', label);
    if (color != null) n.data('color', color);

    const displayBase = n.data('label') || n.id();
    if (criticalMode && lastNodesTimes?.[id]) {
      const { E, L } = lastNodesTimes[id];
      n.data('labelDisplay', `${displayBase}\n${E}|${L}`);
    } else {
      n.data('labelDisplay', displayBase);
    }
  }
}

function updateEdge({ id, weight, directed }) {
  const e = cy.getElementById(id);
  if (!e || e.empty()) return { ok: false, message: 'Arista no encontrada.' };

  // En modo estricto, siempre dirigida
  const dir = johnsonStrict ? 1 : (directed ? 1 : 0);

  // Si se intenta “invertir” con otra arista opuesta presente, lo mantenemos simple:
  // (updateEdge aquí no cambia source/target, sólo peso y dir)
  if (johnsonStrict && dir === 1) {
    const u = e.data('source') || e.source().id();
    const v = e.data('target') || e.target().id();
    if (isSelfLoop(u, v)) {
      alert('Modo Johnson: no se permiten bucles (A → A).');
      return { ok: false, message: 'Modo Johnson: no se permiten bucles (A → A).' };
      
    }
    if (hasReverseEdge(u, v) && !e.same(cy.$(`edge[directed = 1][source = "${v}"][target = "${u}"]`))) {
      alert('Modo Johnson: no se permiten pares opuestos (ya existe la arista destino → origen).');
      return { ok: false, message: 'Modo Johnson: no se permiten pares opuestos (ya existe la arista destino → origen).' };
    }
  }

  if (weight != null) {
    const w = Number(weight);
    e.data('weight', w);
    if (!criticalMode) {
      e.data('labelText', String(isFinite(w) ? w : 0));
    } else {
      const s = lastEdgeSlack.get(id);
      e.data('labelText', s != null ? fmtSlack(s) : String(isFinite(w) ? w : 0));
    }
  }
  e.data('directed', dir);

  return { ok: true };
}

function deleteElement(id) { cy.getElementById(id).remove(); }
function clearAll() { cy.elements().remove(); lastNodesTimes = null; lastEdgeSlack.clear(); }
function resetEdgeSelection() { cy.elements('node.selected').removeClass('selected'); }

function getGraphData() {
  const nodes = cy.nodes().map(n => ({
    id: n.id(),
    label: n.data('label') || '',
    color: n.data('color') || '#66ccff',
    position: n.position()
  }));
  const edges = cy.edges().map(e => ({
    id: e.id(),
    source: e.data('source') || e.source().id(),
    target: e.data('target') || e.target().id(),
    weight: Number(e.data('weight') ?? 0),
    directed: !!(e.data('directed') ?? (e.data('target') ? 1 : 0))
  }));
  return { nodes, edges };
}

function loadGraphData(json, { replace = false } = {}) {
  if (replace) cy.elements().remove();
  const els = [];
  (json.nodes || []).forEach(n => {
    const base = n.label || n.id;
    els.push({
      group: 'nodes',
      data: { id: n.id, label: base, labelDisplay: base, color: n.color || '#66ccff' },
      position: n.position
    });
  });
  (json.edges || []).forEach(e => {
    const w = Number(e.weight) || 0;
    // Si johnsonStrict está activo al importar, forzamos dirigidas; no reparamos pares/ciclos aquí.
    els.push({
      group: 'edges',
      data: {
        id: e.id, source: e.source, target: e.target,
        weight: w, directed: johnsonStrict ? 1 : (e.directed ? 1 : 0),
        labelText: String(w)
      }
    });
  });
  cy.add(els);
  cy.fit(undefined, 40);
}

/** Matriz de adyacencia */
function getAdjacency({ weighted = true, sortByLabel = true } = {}) {
  let nodes = cy.nodes().map(n => ({ id: n.id(), label: n.data('label') || n.id() }));
  if (sortByLabel) {
    nodes.sort((a,b) => (a.label||'').localeCompare(b.label||'') || a.id.localeCompare(b.id));
  }
  const idx = new Map(nodes.map((n,i)=>[n.id,i]));
  const m = Array.from({length:nodes.length},()=>Array(nodes.length).fill(0));
  cy.edges().forEach(e=>{
    const i = idx.get(e.data('source') || e.source().id());
    const j = idx.get(e.data('target') || e.target().id());
    if (i==null || j==null) return;
    let val = weighted ? Number(e.data('weight')) : 1;
    if (!Number.isFinite(val)) val = weighted ? 0 : 1;
    m[i][j] += val;
    if (!e.data('directed')) m[j][i] += val;
  });
  return { nodes, matrix: m };
}

// ====== Visual CPM ======
function showCriticalCPM(result) {
  criticalMode = true;
  lastNodesTimes = result.nodesTimes || null;
  lastEdgeSlack = new Map();
  (result.edgesTable || []).forEach(r => lastEdgeSlack.set(r.id, r.slack));

  cy.nodes().forEach(n => {
    ensureNodeLabelDisplay(n);
    const id = n.id();
    const base = n.data('label') || id;
    const t = lastNodesTimes?.[id];
    n.data('labelDisplay', t ? `${base}\n${t.E}|${t.L}` : base);
  });
  cy.edges().forEach(e => {
    const s = lastEdgeSlack.get(e.id());
    if (s == null) {
      const w = Number(e.data('weight'));
      e.data('labelText', String(isFinite(w) ? w : 0));
    } else {
      e.data('labelText', fmtSlack(s));
    }
  });

  cy.nodes().addClass('dim');
  cy.edges().addClass('dim');

  (result.criticalEdges || []).forEach(id => {
    const e = cy.getElementById(id);
    if (e && e.nonempty()) {
      e.removeClass('dim').addClass('critical');
      e.source().removeClass('dim').addClass('critical');
      e.target().removeClass('dim').addClass('critical');
    }
  });
}

function clearCriticalCPM() {
  criticalMode = false;
  lastNodesTimes = null;
  lastEdgeSlack.clear();

  cy.nodes().forEach(n => {
    const base = n.data('label') || n.id();
    n.data('labelDisplay', base);
  });
  cy.edges().forEach(e => {
    const w = Number(e.data('weight'));
    e.data('labelText', String(isFinite(w) ? w : 0));
  });

  cy.elements().removeClass('critical').removeClass('dim');
}

defineExpose({
  // Johnson strict toggle
  setJohnsonStrictMode,

  addNode,
  addEdge,
  updateNode,
  updateEdge,
  deleteElement,
  clearAll,
  resetEdgeSelection,
  getGraphData,
  loadGraphData,
  getAdjacency,
  showCriticalCPM,
  clearCriticalCPM
  ,
  showMST,
  clearMST
  ,showPath, clearPath
});
</script>

<style scoped>
.canvas { width: 100%; height: 100%; }

/* MST overlay styling */
.mst-overlay {
  position: absolute;
  left: 16px;
  top: 16px;
  display: none; /* shown via JS */
  z-index: 1200;
}
.mst-overlay .mst-content {
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(180deg, rgba(6,95,70,0.12), rgba(6,95,70,0.06));
  backdrop-filter: blur(6px);
  border: 1px solid rgba(34,197,94,0.18);
  border-left: 6px solid var(--accent);
  color: var(--text);
  padding: 14px 18px;
  border-radius: 12px;
  min-width: 260px;
  box-shadow: 0 10px 36px rgba(2,6,23,0.6);
  font-size: 60px;
  font-weight: 700;
}
.mst-overlay .mst-label { color: var(--primary); font-size:16px }
.mst-overlay .mst-value { color: var(--primary); margin-left:6px; font-size:18px; font-weight:800 }
.mst-overlay .mst-close {
  margin-left: auto;
  background: transparent;
  border: none;
  color: var(--muted);
  cursor: pointer;
  font-size: 14px;
  padding: 6px;
  border-radius: 6px;
}
.mst-overlay .mst-close:hover { background: rgba(255,255,255,0.03); color: var(--text); }

</style>
