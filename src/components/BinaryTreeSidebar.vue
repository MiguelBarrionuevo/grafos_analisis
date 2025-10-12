<template>
  <aside class="sidebar">
    <div class="group">
      <button class="button" @click="$emit('back-to-main')">
        ← Volver al Editor Principal
      </button>
    </div>
    <hr class="sep" />

    <!-- Insertar Nodo -->
    <div class="group">
      <h2>Insertar Nodo</h2>
      <div class="row-simple">
        <input type="number" v-model.number="insertValue" class="input" placeholder="Valor" :disabled="isRandomMode" />
      </div>
      <div class="row-simple">
        <button class="button" @click="onInsert" :disabled="isRandomMode">Insertar</button>
        <button class="button danger" @click="$emit('reset-tree')">Limpiar</button>
      </div>
    </div>
    <hr class="sep" />

    <!-- Generar Aleatorio -->
    <div class="group">
        <h2>Generar Aleatorio</h2>
        <div class="row-simple">
            <label>Nodos</label>
            <input type="number" v-model.number="randomParams.count" class="input" min="1" :disabled="nodeCount > 0 && !isRandomMode" />
        </div>
        <div class="row-simple">
            <label>Min</label>
            <input type="number" v-model.number="randomParams.min" class="input" :disabled="nodeCount > 0 && !isRandomMode" />
            <label>Max</label>
            <input type="number" v-model.number="randomParams.max" class="input" :disabled="nodeCount > 0 && !isRandomMode" />
        </div>
        <div class="row-simple">
            <button class="button" @click="$emit('generate-random', randomParams)" :disabled="nodeCount > 0 && !isRandomMode">Generar</button>
            <button class="button danger" @click="$emit('reset-tree')">Limpiar</button>
        </div>
    </div>
    <hr class="sep" />

    <!-- Recorridos -->
    <div class="group">
      <h2>Recorridos</h2>
      <select v-model="traversalType" class="input">
        <option value="in-order">In-orden</option>
        <option value="pre-order">Pre-orden</option>
        <option value="post-order">Post-orden</option>
      </select>
      <div class="row-simple">
        <button class="button" @click="$emit('run-traversal', traversalType)">Iniciar Animación</button>
        <button class="button" @click="$emit('stop-traversal')">Detener</button>
      </div>
    </div>
    <hr class="sep" />

    <!-- Información -->
    <div class="group">
        <h2>Información</h2>
        <!-- Estos valores vendrían como props desde el componente padre -->
        <p>Número de nodos: <strong>{{ nodeCount }}</strong></p>
        <p>Altura del árbol: <strong>{{ treeHeight }}</strong></p>
    </div>
    <hr class="sep" />

    <!-- Importar / Exportar -->
    <div class="group">
        <h2>Importar / Exportar</h2>
        <div class="row-simple">
            <button class="button" @click="$emit('import-tree')">📥 Importar</button>
            <button class="button" @click="$emit('export-tree')">💾 Exportar</button>
        </div>
    </div>

  </aside>
</template>

<script setup>
import { ref, reactive, defineEmits } from 'vue';
/* global defineProps */

const emit = defineEmits(['back-to-main', 'insert-node', 'reset-tree', 'generate-random', 'run-traversal', 'stop-traversal', 'import-tree', 'export-tree']);

const props = defineProps({
    nodeCount: { type: Number, default: 0 },
    treeHeight: { type: Number, default: 0 },
    isRandomMode: { type: Boolean, default: false },
});

const insertValue = ref(null);
const traversalType = ref('in-order');
const randomParams = reactive({
    count: 10,
    min: 1,
    max: 100,
});

function onInsert() {
    if (!props.isRandomMode && insertValue.value !== null && !isNaN(insertValue.value)) {
        emit('insert-node', insertValue.value);
        insertValue.value = null; // Limpiar input
    }
}
</script>

<style scoped>
.row-simple { display: flex; gap: 8px; align-items: center; margin-top: 8px; }
.row-simple .input { flex-grow: 1; }
</style>