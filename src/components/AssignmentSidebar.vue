<template>
  <aside class="sidebar">
    <div class="group">
      <button class="button" @click="$emit('back-to-main')">
        ← Volver al Editor Principal
        
      </button>
    </div>
    <hr class="sep" />
    <div class="group">
      <h2>Herramientas (Bipartito)</h2>
      <button class="button" :class="{ active: mode === MODES.ADD_NODE_U }" @click="$emit('set-mode', MODES.ADD_NODE_U)">
        <span style="color:#66ccff">■</span> Agregar Nodo U
      </button>
      <button class="button" :class="{ active: mode === MODES.ADD_NODE_V }" @click="$emit('set-mode', MODES.ADD_NODE_V)">
        <span style="color:#ffab73">■</span> Agregar Nodo V
      </button>
      <button class="button" :class="{ active: mode === MODES.ADD_EDGE }" @click="$emit('set-mode', MODES.ADD_EDGE)">
        🔗 Agregar Arista (Costo)
      </button>
      <button class="button" :class="{ active: mode === MODES.EDIT }" @click="$emit('set-mode', MODES.EDIT)">
        ✏️ Editar (doble clic)
      </button>
      <button class="button" :class="{ active: mode === MODES.DELETE }" @click="$emit('set-mode', MODES.DELETE)">
        🗑️ Borrar
      </button>
      <button class="button danger" @click="$emit('clear-all')">
        ♻️ Borrar todo
      </button>
    </div>

    <hr class="sep" />

    <div class="group">
      <h2>Matriz</h2>
      <button class="button" @click="$emit('open-matrix')">📊 Matriz de Costos</button>
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
      <h2>Modo Actual</h2>
      <span class="badge">Modo activo: <strong>{{ modeLabel }}</strong></span>
    </div>

    <hr class="sep" />

    <div class="group">
      <h2>Algoritmo de Asignación</h2>
      <div class="subgroup">
        <button class="button" @click="$emit('run-assignment', 'min')">⬇️ Asignación (Minimizar)</button>
        <button class="button" @click="$emit('run-assignment', 'max')">⬆️ Asignación (Maximizar)</button>
        <button class="button" @click="$emit('clear-highlight')">✨ Quitar resaltado</button>
      </div>
    </div>

    <hr class="sep" />
    <!-- Ayuda -->
    <div class="group">
        <h2>Ayuda</h2>
        <button class="button" @click="$emit('open-help')">
            <i class="fas fa-question-circle"></i> Guía de Funcionamiento
        </button>
    </div>
  </aside>
</template>

<script setup>
/* global defineProps, defineEmits */
import { computed } from 'vue';
import { ASSIGNMENT_MODES as MODES } from '../constants/assignmentModes';

const props = defineProps({
  mode: { type: String, default: MODES.ADD_NODE_U },
});

defineEmits(['set-mode', 'run-assignment', 'clear-highlight', 'clear-all', 'back-to-main', 'open-matrix', 'export-graph', 'import-graph', 'open-help']);

const modeLabel = computed(() => {
  switch (props.mode) {
    case MODES.NONE: return 'Ninguno';
    case MODES.ADD_NODE_U: return 'Agregar Nodo U';
    case MODES.ADD_NODE_V: return 'Agregar Nodo V';
    case MODES.ADD_EDGE: return 'Agregar Arista';
    case MODES.EDIT: return 'Editar';
    case MODES.DELETE: return 'Borrar';
    default: return 'Ninguno';
  }
});
</script>

<style scoped>
span[style*="color"] { font-size: 1.2em; line-height: 0; vertical-align: middle; }
</style>