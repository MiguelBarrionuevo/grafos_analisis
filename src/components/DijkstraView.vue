<template>
  <div class="dijkstra-view app-layout">
    <header class="header" style="display:flex;align-items:center;justify-content:space-between">
      <h1 style="margin:0">Dijkstra — Ruta mínima</h1>
      <div>
        <button class="button" @click="$emit('back-to-main')">← Volver</button>
      </div>
    </header>

    <aside class="sidebar">
      <div class="group">
        <h2>Parámetros</h2>
        <label class="label">Origen</label>
        <select v-model="source" class="input">
          <option v-for="n in nodes" :key="n.id" :value="n.id">{{ n.label || n.id }}</option>
        </select>

        <label class="label">Destino</label>
        <select v-model="target" class="input">
          <option v-for="n in nodes" :key="n.id" :value="n.id">{{ n.label || n.id }}</option>
        </select>

        <div style="margin-top:10px; display:flex; gap:8px;">
          <button class="button" @click="runDijkstra">Calcular</button>
          <button class="button" @click="clear">Limpiar</button>
        </div>
      </div>

      <hr class="sep" />

      <div class="group">
        <h2>Resultado</h2>
        <div v-if="error" class="error-text">{{ error }}</div>
        <div v-else>
          <div v-if="distStr !== null">
            <div>Distancia: <strong>{{ distStr }}</strong></div>
            <div style="margin-top:8px">Camino: <code>{{ path.join(' → ') }}</code></div>
          </div>
          <div v-else style="color:var(--muted)">Ejecuta el algoritmo para ver resultado.</div>
        </div>
      </div>
    </aside>

    <main class="main">
      <div style="padding:12px">
        <h3>Nodos en el grafo ({{ nodes.length }})</h3>
        <ul>
          <li v-for="n in nodes" :key="n.id">{{ n.id }} — {{ n.label }}</li>
        </ul>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { dijkstraAdj, reconstructPath } from '../utils/dijkstra';

const props = defineProps({
  // función que devuelve el graphData { nodes, edges }
  getGraphData: { type: Function, required: true },
  graphApi: { type: Object, required: false }
});

const nodes = ref([]);
const source = ref(null);
const target = ref(null);
const path = ref([]);
const distStr = ref(null);
const error = ref('');

function loadNodes(){
  const data = props.getGraphData();
  nodes.value = (data?.nodes || []).map(n => ({ id: n.id, label: n.label || n.id }));
  if(nodes.value.length){ source.value = source.value || nodes.value[0].id; target.value = target.value || nodes.value[0].id; }
}

onMounted(()=> loadNodes());

function buildAdj(){
  const data = props.getGraphData();
  const adj = {};
  (data.nodes || []).forEach(n => adj[n.id] = []);
  (data.edges || []).forEach(e => {
    const u = e.source; const v = e.target; const w = Number(e.weight) || 0;
    if(!(u in adj)) adj[u]=[];
    if(!(v in adj)) adj[v]=[];
    adj[u].push([v, w]);
    if(!e.directed){ adj[v].push([u, w]); }
  });
  return adj;
}

function formatDist(d){ if(d === Infinity) return '∞'; return String(d); }

async function runDijkstra(){
  error.value = '';
  distStr.value = null; path.value = [];
  try{
    const data = props.getGraphData();
    if(!data || !data.nodes.length){ error.value='El grafo está vacío.'; return; }
    if(!source.value || !target.value){ error.value='Selecciona origen y destino.'; return; }
    const adj = buildAdj();
    const res = dijkstraAdj(adj, source.value);
    const d = res.dist.get(target.value);
    distStr.value = formatDist(d);
    path.value = reconstructPath(res.prev, source.value, target.value);

    // resaltar en el canvas si se pasa graphApi
    try{
      if(props.graphApi && props.graphApi.showPath){
        props.graphApi.clearPath?.();
        props.graphApi.showPath(path.value);
      }
    }catch(err){ /* no crítico */ }

  }catch(err){ console.error(err); error.value = String(err.message || err); }
}

function clear(){ path.value = []; distStr.value = null; error.value = ''; props.graphApi?.clearPath?.(); }

// Expose a reload method so App.vue can request update when graph changes
defineExpose({ loadNodes });
</script>

<style scoped>
.error-text{ color: #c2410c; }
.dijkstra-view .sidebar { width:320px; padding:12px }
.dijkstra-view .main { padding:12px }
</style>
