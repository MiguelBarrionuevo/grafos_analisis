<template>
  <aside class="sidebar">
    <div class="group">
      <button class="button" @click="$emit('back-to-main')">
        ← Volver al Editor Principal
      </button>
    </div>
    <hr class="sep" />

    <!-- Método de Reconstrucción -->
    <div class="group">
      <h2>Método de Reconstrucción</h2>
      <select v-model="method" class="input">
        <option value="in-pre">In-orden + Pre-orden</option>
        <option value="in-post">In-orden + Post-orden</option>
      </select>
    </div>

    <!-- Entradas de Recorridos -->
    <div class="group">
      <h2>Recorridos (nodos separados por coma)</h2>
      <label>In-orden</label>
      <input v-model="traversals.inorder" class="input" placeholder="Ej: 4, 2, 5, 1, 3" />

      <label v-if="method === 'in-pre'">Pre-orden</label>
      <input v-if="method === 'in-pre'" v-model="traversals.preorder" class="input" placeholder="Ej: 1, 2, 4, 5, 3" />

      <label v-if="method === 'in-post'">Post-orden</label>
      <input v-if="method === 'in-post'" v-model="traversals.postorder" class="input" placeholder="Ej: 4, 5, 2, 3, 1" />
    </div>
    <hr class="sep" />

    <!-- Acciones -->
    <div class="group">
      <h2>Acciones</h2>
      <div class="row-simple">
        <button class="button" @click="onReconstruct">Reconstruir</button>
        <button class="button danger" @click="onReset">Reset</button>
      </div>
    </div>
    <hr class="sep" />

    <!-- Importar / Exportar -->
    <div class="group">
      <h2>Importar / Exportar</h2>
      <div class="row-simple">
        <button class="button" @click="$emit('import-data')">📥 Importar</button>
        <button class="button" @click="$emit('export-data')">💾 Exportar</button>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref, reactive, defineEmits } from 'vue';

const emit = defineEmits(['back-to-main', 'reconstruct', 'reset', 'import-data', 'export-data']);

const method = ref('in-pre');
const traversals = reactive({
  inorder: '',
  preorder: '',
  postorder: '',
});

function onReconstruct() {
  emit('reconstruct', { method: method.value, ...traversals });
}

function onReset() {
  traversals.inorder = '';
  traversals.preorder = '';
  traversals.postorder = '';
  emit('reset');
}
</script>

<style scoped>
.row-simple { display: flex; gap: 8px; align-items: center; }
label { display: block; margin-top: 10px; margin-bottom: 4px; font-size: 0.9em; color: var(--muted); }
</style>