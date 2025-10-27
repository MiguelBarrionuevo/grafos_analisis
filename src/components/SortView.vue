<!-- src/views/SortView.vue -->
<template>
  <div class="app-layout">
    <header class="header">
      <h1>Visualizador de Ordenamiento - Sort</h1>
    </header>
    <aside class="sidebar">
      <div class="group">
        <button class="button" @click="$emit('back-to-main')">← Volver al Editor Principal</button>
      </div>

      <hr class="sep" />

      <div class="group">
        <h2>Modo</h2>
        <div style="display:flex;gap:8px">
          <button :class="['button', { active: mode === 'random' }]" @click="mode = 'random'">Aleatorio</button>
          <button :class="['button', { active: mode === 'manual' }]" @click="mode = 'manual'">Manual</button>
        </div>
      </div>

      <hr class="sep" />

      <div class="group" v-if="mode === 'random'">
        <h2>Aleatorio</h2>
        <label class="label">Cantidad</label>
        <input class="input" v-model.number="random.count" type="number" min="1" max="200" />
        <label class="label">Mínimo</label>
        <input class="input" v-model.number="random.min" type="number" />
        <label class="label">Máximo</label>
        <input class="input" v-model.number="random.max" type="number" />
      </div>

      <div class="group" v-else>
        <h2>Manual</h2>
        <label class="label">Números (separados por coma)</label>
        <textarea class="input" rows="4" v-model="manualText" placeholder="Ej: 15,20,25,5,6,2,3,89,90"></textarea>
      </div>

      <hr class="sep" />

      <div class="group">
        <h2>Controles</h2>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="button" @click="onGenerate">🟦 Generar</button>
          <button class="button" :disabled="!lastSteps.length" @click="replay">🔁 Repetir</button>
          <div style="display:flex;gap:8px">
            <button class="button" @click="sortAsc">⬆️ Ascendente</button>
            <button class="button" @click="sortDesc">⬇️ Descendente</button>
          </div>
          <div style="display:flex;gap:8px">
            <button class="button" @click="onImportClick">📥 Importar</button>
            <button class="button" @click="onExport">💾 Exportar</button>
            <input ref="fileInput" type="file" accept="application/json" style="display:none" @change="onFilePicked" />
          </div>
        </div>
      </div>

      <hr class="sep" />

      <div class="group">
        <h2>Algoritmos</h2>
        <div class="algorithms">
          <button :class="['button', { active: algorithm === 'selection' }]" @click="algorithm='selection'">Selection Sort</button>
          <button :class="['button', { active: algorithm === 'insertion' }]" @click="algorithm='insertion'">Insertion Sort</button>
          <button :class="['button', { active: algorithm === 'merge' }]" @click="algorithm='merge'">Merge Sort</button>
          <button :class="['button', { active: algorithm === 'shell' }]" @click="algorithm='shell'">Shell Sort</button>
        </div>
      </div>

      <hr class="sep" />

      <div class="group">
        <h2>Velocidad</h2>
        <input type="range" min="30" max="1000" v-model.number="stepDelay" />
        <small>Delay por paso: {{stepDelay}} ms</small>
      </div>
      
      <hr class="sep" />

      <div class="group">
        <button class="button" @click="helpVisible = true">❓ Ayuda</button>
      </div>
    </aside>

    <main class="main">
      <!-- CAMBIO: usar sort-canvas-wrap para no heredar estilos del editor de grafos -->
      <div class="sort-canvas-wrap">
        <div ref="canvas" class="bubble-canvas">
          <div
            v-for="(v, i) in currentArray"
            :key="bubbleKey(i, v)"
            class="bubble"
            :style="bubbleStyle(i, v)"
            :class="{ active: isActive(i) }"
          >
            <div class="bubble-label">{{ v }}</div>
          </div>
        </div>
      </div>
      <hr class="sep" />
      <div class="info-panel">
        <div class="box">
          <h3>Antes:</h3>
          <pre>{{ pretty(originalArray) }}</pre>
        </div>
        <div class="box">
          <h3>Después:</h3>
          <pre>{{ pretty(sortedArray) }}</pre>
        </div>
      </div>
    </main>

    <!-- Help modal (mejorado) -->
    <div v-if="helpVisible" class="help-overlay" role="dialog" aria-modal="true" @click.self="helpVisible = false">
      <aside class="help-modal" role="document" aria-labelledby="help-title">
        <div class="help-header">
          <h3 id="help-title">Ayuda — Pantalla Sort</h3>
          <button ref="helpCloseBtn" class="help-close" @click="helpVisible = false" aria-label="Cerrar ayuda">✕</button>
        </div>

        <div class="help-content">
          <p class="lead">Visualiza algoritmos de ordenamiento paso a paso con animaciones tipo burbuja y control total sobre velocidad y entrada de datos.</p>

          <div class="help-grid">
            <div class="help-item">
              <h4>Modo</h4>
              <p>Selecciona <em>Aleatorio</em> para generar un arreglo por parámetros o <em>Manual</em> para escribir los números separados por comas.</p>
            </div>
            <div class="help-item">
              <h4>Generar</h4>
              <p>Crea el arreglo actual según el modo seleccionado. Útil para volver a reiniciar la visualización.</p>
            </div>
            <div class="help-item">
              <h4>Repetir</h4>
              <p>Reproduce la última secuencia de pasos que generó el algoritmo (si existe).</p>
            </div>
            <div class="help-item">
              <h4>Ascendente / Descendente</h4>
              <p>Ejecuta el algoritmo seleccionado en el sentido elegido y anima cada paso con el delay configurado.</p>
            </div>
            <div class="help-item">
              <h4>Importar / Exportar</h4>
              <p>Importa o exporta arreglos en formato JSON. Soporta tanto un array simple como un objeto { numbers: [...] }.</p>
            </div>
            <div class="help-item">
              <h4>Algoritmos</h4>
              <p>Elige entre <strong>Selection</strong>, <strong>Insertion</strong>, <strong>Merge</strong> o <strong>Shell</strong>. Cada uno genera una secuencia de snapshots que se reproducen.</p>
            </div>
            <div class="help-item">
              <h4>Velocidad</h4>
              <p>Controla el delay (ms) entre pasos. Ajusta para obtener una reproducción más lenta o más rápida.</p>
            </div>
            <div class="help-item">
              <h4>Área principal</h4>
              <p>Las burbujas representan valores; su tamaño es proporcional al valor. Se reposicionan y animan durante los pasos.</p>
            </div>
          </div>

          <div class="help-footer">
            <h4>Consejos</h4>
            <ul>
              <li>Para probar un arreglo concreto, usa <em>Manual</em> y pega los números separados por comas.</li>
              <li>Si el arreglo es muy grande, reduce la cantidad o aumenta el delay para apreciar mejor cada paso.</li>
            </ul>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';

// State
const mode = ref('random'); // 'random' | 'manual'
const random = reactive({ count: 12, min: 1, max: 100 });
const manualText = ref('15,20,25,5,6,2,3,89,90');
const algorithm = ref('merge');
const stepDelay = ref(200);

const originalArray = ref([]);
const currentArray = ref([]);
const sortedArray = ref([]);
const lastSteps = ref([]); // array of snapshots

const isPlaying = ref(false);
const playAbort = { aborted: false };
const helpVisible = ref(false);
const helpCloseBtn = ref(null);

// 1) Estado para índices activos en el paso actual
const activeIndices = ref(new Set());

// 2) Helper para el binding de clase
function isActive(i) {
  return activeIndices.value.has(i);
}

// 3) Detección simple de posiciones cambiadas entre dos snapshots
function diffIndices(a, b) {
  const n = Math.max(a.length, b.length);
  const set = new Set();
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) set.add(i);
  }
  return set;
}

function onKeydown(e){ if (e.key === 'Escape' && helpVisible.value) { helpVisible.value = false; } }

watch(helpVisible, async (v)=>{
  if (v) {
    await nextTick();
    if (helpCloseBtn.value && helpCloseBtn.value.focus) helpCloseBtn.value.focus();
    window.addEventListener('keydown', onKeydown);
  } else { window.removeEventListener('keydown', onKeydown); }
});

const canvas = ref(null);
let resizeObserver = null;
const canvasSize = reactive({ width: 800, height: 360 });

function updateCanvasSize() {
  if (!canvas.value) return;
  const r = canvas.value.getBoundingClientRect();
  canvasSize.width = r.width; canvasSize.height = r.height;
}

onMounted(()=>{
  nextTick(updateCanvasSize);
  resizeObserver = new ResizeObserver(updateCanvasSize);
  if (canvas.value) resizeObserver.observe(canvas.value);
});
onBeforeUnmount(()=>{ if (resizeObserver && canvas.value) resizeObserver.unobserve(canvas.value); });

function bubbleKey(i, v) { return `${i}-${v}-${Math.floor(Math.random()*100000)}`; }

function pretty(arr) { return JSON.stringify(arr); }

function bubbleStyle(i, v) {
  const n = currentArray.value.length || 1;
  const gap = canvasSize.width / Math.max(n, 1); // ancho de celda por burbuja

  // radios base
  const MIN_R = 14;
  const MAX_R = 36;

  // El radio máximo no puede exceder ~45% del ancho de su celda (evita solape)
  const MAX_R_FIT = Math.min(MAX_R, gap * 0.45);

  // mapeo lineal valor → radio dentro [MIN_R, MAX_R_FIT]
  const minVal = Math.min(...currentArray.value, 0);
  const maxVal = Math.max(...currentArray.value, 1);
  const range = Math.max(1, maxVal - minVal);
  let r = MIN_R + ((v - minVal) / range) * (MAX_R_FIT - MIN_R);

  const x = gap * i + gap / 2;
  const y = canvasSize.height / 2;

  return {
    width: `${r * 2}px`,
    height: `${r * 2}px`,
    transform: `translate(${x - r}px, ${y - r}px)`
  };
}

// Utilities
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function generateRandomArray() {
  const c = clamp(Math.floor(random.count)||0, 1, 200);
  const mn = Number(random.min) || 0; const mx = Number(random.max) || 100;
  const a = [];
  for (let i=0;i<c;i++) {
    const val = Math.floor(Math.random()*(mx - mn + 1)) + mn;
    a.push(val);
  }
  return a;
}

function parseManual() {
  try {
    const parts = manualText.value.split(',').map(s=>s.trim()).filter(s=>s.length);
    const a = parts.map(s=>Number(s)).filter(n=>!Number.isNaN(n));
    return a;
  } catch(e) { return []; }
}

// Sorting algorithms that produce snapshots (arrays) after notable steps
function snapshotsSelection(arr, asc=true) {
  const a = arr.slice();
  const steps = [a.slice()];
  const n = a.length;
  for (let i=0;i<n-1;i++){
    let best = i;
    for (let j=i+1;j<n;j++){
      if (asc ? a[j] < a[best] : a[j] > a[best]) best = j;
    }
    if (best !== i) { [a[i], a[best]] = [a[best], a[i]]; steps.push(a.slice()); }
  }
  return steps;
}

function snapshotsInsertion(arr, asc=true) {
  const a = arr.slice(); const steps = [a.slice()];
  for (let i=1;i<a.length;i++){
    const key = a[i]; let j = i-1;
    while (j>=0 && (asc ? a[j] > key : a[j] < key)){
      a[j+1] = a[j]; j--; steps.push(a.slice());
    }
    a[j+1] = key; steps.push(a.slice());
  }
  return steps;
}

function snapshotsMerge(arr, asc=true) {
  const a = arr.slice(); const steps = [a.slice()];
  function mergeSortHelper(l, r){
    if (r - l <= 1) return;
    const m = Math.floor((l + r)/2);
    mergeSortHelper(l,m); mergeSortHelper(m,r);
    const tmp = []; let i=l, j=m;
    while(i<m || j<r){
      if (i<m && (j>=r || (asc ? a[i] <= a[j] : a[i] >= a[j]))){ tmp.push(a[i++]); }
      else { tmp.push(a[j++]); }
    }
    for (let k=0;k<tmp.length;k++){ a[l+k] = tmp[k]; steps.push(a.slice()); }
  }
  mergeSortHelper(0,a.length); return steps;
}

function snapshotsShell(arr, asc=true){
  const a = arr.slice(); const steps=[a.slice()];
  let n=a.length; let gap=Math.floor(n/2);
  while(gap>0){
    for(let i=gap;i<n;i++){
      const temp=a[i]; let j=i;
      while(j>=gap && (asc? a[j-gap] > temp : a[j-gap] < temp)){
        a[j]=a[j-gap]; j-=gap; steps.push(a.slice());
      }
      a[j]=temp; steps.push(a.slice());
    }
    gap=Math.floor(gap/2);
  }
  return steps;
}

async function playSteps(steps){
  if (!steps || !steps.length) return;
  isPlaying.value = true; playAbort.aborted = false;

  let prev = currentArray.value.slice(); // snapshot previo para comparar

  for (let i=0;i<steps.length;i++){
    if (playAbort.aborted) break;
    const next = steps[i].slice();
    currentArray.value = steps[i].slice();
    await new Promise(r=>setTimeout(r, stepDelay.value));
    activeIndices.value = diffIndices(prev, next);
    currentArray.value = next;
    await new Promise(r => setTimeout(r, stepDelay.value));

    prev = next;

  }
  isPlaying.value = false; sortedArray.value = currentArray.value.slice();
  // limpiar resaltado al terminar
  activeIndices.value = new Set();
  isPlaying.value = false;
  sortedArray.value = currentArray.value.slice();
}

function stopPlay(){ playAbort.aborted = true; isPlaying.value = false; }

function computeAndPlay(arr, algo, asc=true){
  if (!arr || !arr.length) return;
  let steps = [];
  if (algo === 'selection') steps = snapshotsSelection(arr, asc);
  else if (algo === 'insertion') steps = snapshotsInsertion(arr, asc);
  else if (algo === 'merge') steps = snapshotsMerge(arr, asc);
  else if (algo === 'shell') steps = snapshotsShell(arr, asc);
  lastSteps.value = steps.slice();
  sortedArray.value = steps[steps.length-1].slice();
  playSteps(steps);
}

function onGenerate(){
  stopPlay();
  let a = mode.value === 'random' ? generateRandomArray() : parseManual();
  originalArray.value = a.slice(); currentArray.value = a.slice(); sortedArray.value = [];
  lastSteps.value = [];
}

function replay(){ if (lastSteps.value.length) { playSteps(lastSteps.value); } }

function sortAsc(){ if (!originalArray.value.length) { onGenerate(); }
  computeAndPlay(currentArray.value.slice(), algorithm.value, true);
}
function sortDesc(){ if (!originalArray.value.length) { onGenerate(); }
  computeAndPlay(currentArray.value.slice(), algorithm.value, false);
}

function onImportClick(){ fileInput.value.click(); }
const fileInput = ref(null);
function onFilePicked(e){
  const f = e.target.files?.[0]; if (!f) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const json = JSON.parse(String(reader.result || '[]'));
      if (Array.isArray(json)){
        manualText.value = json.join(','); mode.value='manual'; onGenerate();
      } else if (json && Array.isArray(json.numbers)){
        manualText.value = json.numbers.join(','); mode.value='manual'; onGenerate();
      } else { alert('Archivo inválido: se espera un array de números o { numbers: [...] }.'); }
    }catch(err){ alert('No se pudo leer el archivo.'); }
  };
  reader.readAsText(f);
  e.target.value = '';
}

function onExport(){
  const data = currentArray.value.slice();
  const blob = new Blob([JSON.stringify(data,null,2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='numbers.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

// watch manualText changes to keep original updated
watch(manualText, ()=>{ /* no-op */ });

// Initialize
onGenerate();

</script>

<style scoped>
/* Wrapper específico para Sort: evita colisión con .canvas-wrap global del editor de grafos */
.sort-canvas-wrap{
  position: relative;  /* NO absolute */
  padding: 0;         /* sin padding extra */
}

/* Lienzo/burbujas */
.bubble-canvas {
  position: relative;
  width: 100%;
  height: 360px;
  background: linear-gradient(180deg,#fff,#f7fbff);
  border-radius: 8px;
  border:1px solid #e6eef9;
  overflow: hidden;
}
.bubble {
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(180deg,#7dd3fc,#38bdf8);
  display:flex;
  align-items:center;
  justify-content:center;
  color:#04263b;
  font-weight:700;
  transition: transform 300ms cubic-bezier(.2,.9,.3,1), width 300ms, height 300ms, filter 200ms;
  box-shadow: 0 6px 18px rgba(3,105,161,0.12);
}
.bubble-label { font-size: 12px; padding: 2px 6px; }

.bubble.active {
  /* aro externo + sombra más marcada */
  box-shadow:
    0 0 0 6px rgba(59,130,246,0.30),
    0 16px 36px rgba(2,6,23,0.45);
  filter: brightness(1.05);
}

/* Panel inferior */
.info-panel { display:flex; gap:12px; }
.info-panel .box { background:#fff; border:1px solid #e6eef9; padding:12px; border-radius:8px; width:100%;}

/* Sidebar helpers */
.algorithms .button { display:block; margin-bottom:8px; width:100%; text-align:left;}
.info-panel .box h3 {
  color: #0369a1; /* azul más intenso */
}
.info-panel .box pre {
  color: #334e5a;
  font-weight: 500;
}


/* Help modal */
.help-overlay { position: fixed; inset: 0; background: rgba(2,6,23,0.55); display:flex; align-items:center; justify-content:center; z-index:1200; padding:24px; }
.help-modal { background: linear-gradient(180deg,#ffffff,#fbfdff); width: min(900px, 96%); max-height: 86vh; overflow:auto; padding:20px; border-radius:12px; box-shadow:0 20px 60px rgba(2,6,23,0.35); border: 1px solid rgba(3,102,161,0.06); }
.help-header { display:flex; align-items:center; justify-content:space-between; gap:12px; border-bottom:1px solid #eef6fb; padding-bottom:12px; margin-bottom:12px; }
.help-header h3 { margin:0; font-size:18px; color:#052030; }
.help-close { background:#071727; color:#fff; border:none; padding:8px 12px; border-radius:8px; cursor:pointer; font-weight:700; }
.help-close:focus { outline:2px solid #90cdf4; }
.help-content .lead { color:#0b3745; margin-bottom:12px; }
.help-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }
.help-item { background: #fff; border:1px solid #eef6fb; padding:12px; border-radius:8px; }
.help-item h4 { margin:0 0 6px 0; font-size:15px; }
.help-item p { margin:0; color:#334e5a; font-size:13px; }
.help-footer { margin-top:14px; padding-top:8px; border-top:1px dashed #eef6fb; }
.help-footer ul { margin:8px 0 0 18px; }

@media (max-width:720px){
  .help-grid { grid-template-columns:1fr; }
  .help-modal{ padding:14px; }
}
</style>
