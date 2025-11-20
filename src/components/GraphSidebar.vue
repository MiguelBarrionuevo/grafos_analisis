<template>
  <aside class="sidebar">
    <div class="group">
      <h2>Herramientas</h2>

      <button class="button" :class="{ active: mode === MODES.ADD_NODE }" @click="$emit('set-mode', MODES.ADD_NODE)">
        ➕ Agregar nodo
      </button>

      <button class="button" :class="{ active: mode === MODES.ADD_EDGE }" @click="$emit('set-mode', MODES.ADD_EDGE)">
        🔗 Agregar arista
      </button>

      <button class="button" :class="{ active: mode === MODES.EDIT }" @click="$emit('set-mode', MODES.EDIT)">
        ✏️ Editar (doble clic)
      </button>

      <button class="button" :class="{ active: mode === MODES.DELETE }" @click="$emit('set-mode', MODES.DELETE)">
        🗑️ Borrar
      </button>

      <button class="button danger" @click="$emit('confirm-clear')">
        ♻️ Borrar todo
      </button>
    </div>

    <hr class="sep" />

    <div class="group">
      <h2>Modo Actual</h2>
      <div style="display:flex;flex-direction:column;gap:6px;">
        <span class="badge">Modo activo: <strong>{{ modeLabel }}</strong></span>
      </div>
    </div>
    
    <hr class="sep" />

    <div class="group">
      <h2>Matriz</h2>
      <button class="button" @click="$emit('open-matrix')">📊 Matriz de adyacencia</button>
    </div>

    <hr class="sep" />

    <div class="group">
      <h2>Exportar o Importar</h2>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="button" @click="$emit('export-graph')">💾 Exportar</button>
        <button class="button" @click="$emit('import-graph')">📥 Importar</button>
      </div>
    </div>

    <hr class="sep" />

    <div class="group">
      <h2>Algoritmos</h2>
      <div class="subgroup">
        <h2>Johnson y Kruskal</h2>
        <div class="toggle-wrap">
          <label class="switch">
            <input type="checkbox" v-model="johnsonMode" @change="$emit('toggle-johnson-mode', johnsonMode)" />
            <span class="slider round"></span>
          </label>
          <span class="toggle-label">{{ johnsonMode ? 'Modo Johnson' : 'Modo Kruskal' }}</span>
        </div>
        <button class="button" 
          :disabled="johnsonDisabled"
          :title="johnsonDisabled ? 'Hay aristas sin dirección. Edítalas para habilitar.' : ''"
          @click="$emit('run-johnson')">🧭 Johnson (Ruta crítica)</button>
        <button class="button" 
          :disabled="kruskalDisabled"
          :title="kruskalDisabled ? 'Hay aristas dirigidas. Convierte o edítalas para habilitar.' : ''"
          @click="$emit('run-kruskal')">🌲 Kruskal (MST)</button>
        <button class="button" @click="$emit('clear-highlight')">✨ Quitar resaltado</button>
      </div>
      <div class="subgroup" style="margin-top: 10px;">
        <h2>Asignación</h2>
        <button class="button" @click="$emit('run-assignment')">⚖️ Asignación</button>
      </div>
      <div class="subgroup" style="margin-top: 10px;">
        <h2>Ordenamiento</h2>
        <button class="button" @click="$emit('open-sort')">
          🔀 Sort
        </button>
        <button class="button" style="margin-top:6px;" @click="$emit('open-dijkstra')">
          🧭 Dijkstra (Ruta mínima)
        </button>
      </div>
      <div class="subgroup" style="margin-top: 10px;">
        <h2>Transporte</h2>
        <button class="button" @click="$emit('open-northwest')">
          🚚 Algoritmo Northwest
        </button>
      </div>
    </div>
    <hr class="sep" />

    <div class="group">
      <h2>Arboles Binarios de Busqueda</h2>
      <button class="button" @click="$emit('open-build-tree')">🌳 Construir Arboles</button>
      <button class="button" @click="$emit('open-reconstruct-tree')">🌿 Reconstruir Arboles</button>
    </div>
    <hr class="sep" />

    <div class="group">
      <button class="button" @click="$emit('open-help')">❓ Ayuda</button>
    </div>
  </aside>
</template>


<script setup>
// @ts-nocheck
/* eslint-disable no-undef */
/* global defineProps */
import { computed } from 'vue';
const emit = defineEmits(['toggle-johnson-mode','set-mode','confirm-clear','open-matrix','export-graph','import-graph','open-sort','open-help','run-johnson','run-kruskal','clear-highlight','run-assignment','open-build-tree','open-reconstruct-tree','open-northwest','open-dijkstra']);
import { MODES } from '../constants/modes';

const props = defineProps({
  mode: { type: String, default: MODES.ADD_NODE },
  johnsonDisabled: { type: Boolean, default: false },
  kruskalDisabled: { type: Boolean, default: false },
  johnsonStrict: { type: Boolean, default: false }
});

// Computed proxy so v-model on the toggle reflects the prop and emits changes xdxd
const johnsonMode = computed({
  get: () => props.johnsonStrict,
  set: (v) => emit('toggle-johnson-mode', v)
});

const modeLabel = computed(() => {
  switch (props.mode) {
    case MODES.NONE:     return 'Ninguno';
    case MODES.ADD_NODE: return 'Agregar nodo';
    case MODES.ADD_EDGE: return 'Agregar arista';
    case MODES.EDIT:     return 'Editar';
    case MODES.DELETE:   return 'Borrar';
    default:             return 'Ninguno';
  }
});
</script>


