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
        <h2>Herramientas</h2>
        <button class="button" :class="{ active: mode === 'ADD_NODE' }" @click="setMode('ADD_NODE')">
          ➕ Agregar nodo
        </button>
        <button class="button" :class="{ active: mode === 'ADD_EDGE' }" @click="setMode('ADD_EDGE')">
          🔗 Agregar arista
        </button>
        <button class="button" :class="{ active: mode === 'EDIT' }" @click="setMode('EDIT')">
          ✏️ Editar (doble clic)
        </button>
        <button class="button" :class="{ active: mode === 'DELETE' }" @click="setMode('DELETE')">
          🗑️ Borrar
        </button>
        <button class="button danger" @click="confirmClear">
          ♻️ Borrar todo
        </button>
      </div>

      <hr class="sep" />

      <div class="group">
        <h2>Archivo</h2>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="button" @click="exportGraph">💾 Exportar</button>
          <button class="button" @click="importGraph">📥 Importar</button>
          <input ref="fileInput" type="file" accept="application/json" style="display:none" @change="onFileSelected" />
        </div>
      </div>

      <hr class="sep" />

      <div class="group">
        <h2>Dijkstra</h2>
        <label class="label">Origen</label>
        <select v-model="source" class="input">
          <option value="">-- Seleccionar --</option>
          <option v-for="n in nodes" :key="n.id" :value="n.id">{{ n.label || n.id }}</option>
        </select>

        <label class="label">Destino</label>
        <select v-model="target" class="input">
          <option value="">-- Seleccionar --</option>
          <option v-for="n in nodes" :key="n.id" :value="n.id">{{ n.label || n.id }}</option>
        </select>

        <div style="margin-top:10px; display:flex; gap:8px;">
          <button class="button" @click="runDijkstra" :disabled="!source || !target">🧭 Calcular</button>
          <button class="button" @click="clearPath">🧹 Limpiar ruta</button>
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
            <div style="margin-top:6px;font-size:12px;color:var(--muted)">{{ path.length }} nodos en la ruta</div>
          </div>
          <div v-else style="color:var(--muted)">Selecciona origen y destino, luego calcula.</div>
        </div>
      </div>

      <hr class="sep" />

      <div class="group">
        <button class="button" @click="showHelp">❓ Ayuda</button>
      </div>
    </aside>

    <main class="main">
      <GraphCanvas
        ref="canvasRef"
        :mode="mode"
        @request-add-node="onRequestAddNode"
        @request-add-edge="onRequestAddEdge"
        @request-edit-node="onRequestEditNode"
        @request-edit-edge="onRequestEditEdge"
        @request-delete="onRequestDelete"
      />
    </main>

    <!-- Modales -->
    <GraphModal
      :visible="modals.addNode.visible"
      title="Agregar nodo"
      submit-text="Crear"
      @cancel="closeAddNode"
      @submit="submitAddNode"
    >
      <div class="row">
        <div>
          <label class="label">Nombre del nodo</label>
          <input v-model.trim="forms.addNode.label" class="input" placeholder="Ej: A, Ciudad1, etc." />
        </div>
        <div>
          <label class="label">Color</label>
          <input v-model="forms.addNode.color" type="color" class="input color-input" />
        </div>
      </div>
    </GraphModal>

    <GraphModal
      :visible="modals.addEdge.visible"
      title="Agregar arista"
      submit-text="Crear"
      @cancel="closeAddEdge"
      @submit="submitAddEdge"
    >
      <div class="row">
        <div>
          <label class="label">Peso</label>
          <input
            v-model.number="forms.addEdge.weight"
            type="number"
            step="any"
            min="0"
            class="input"
            :class="{ error: !!forms.addEdge.error }"
            placeholder="Ej: 1, 2.5, 10..."
            @input="forms.addEdge.error = ''"
          />
          <div v-if="forms.addEdge.error" class="error-text">{{ forms.addEdge.error }}</div>
        </div>
        <div style="display:flex;align-items:flex-end;">
          <label class="checkbox">
            <input type="checkbox" v-model="forms.addEdge.directed" />
            ¿Dirigida?
          </label>
        </div>
      </div>
      <div style="margin-top:8px;color:var(--muted)">
        Origen: <span class="kbd">{{ forms.addEdge.sourceId }}</span> → Destino: <span class="kbd">{{ forms.addEdge.targetId }}</span>
      </div>
    </GraphModal>

    <GraphModal
      :visible="modals.editNode.visible"
      title="Editar nodo"
      submit-text="Guardar"
      @cancel="closeEditNode"
      @submit="submitEditNode"
    >
      <div class="row">
        <div>
          <label class="label">Nombre</label>
          <input v-model.trim="forms.editNode.label" class="input" />
        </div>
        <div>
          <label class="label">Color</label>
          <input v-model="forms.editNode.color" type="color" class="input color-input" />
        </div>
      </div>
    </GraphModal>

    <GraphModal
      :visible="modals.editEdge.visible"
      title="Editar arista"
      submit-text="Guardar"
      @cancel="closeEditEdge"
      @submit="submitEditEdge"
    >
      <div class="row">
        <div>
          <label class="label">Peso</label>
          <input
            v-model.number="forms.editEdge.weight"
            type="number"
            step="any"
            min="0"
            class="input"
            :class="{ error: !!forms.editEdge.error }"
            @input="forms.editEdge.error = ''"
          />
          <div v-if="forms.editEdge.error" class="error-text">{{ forms.editEdge.error }}</div>
        </div>
        <div style="display:flex;align-items:flex-end;">
          <label class="checkbox">
            <input type="checkbox" v-model="forms.editEdge.directed" />
            ¿Dirigida?
          </label>
        </div>
      </div>
    </GraphModal>

    <GraphModal
      :visible="modals.confirmDelete.visible"
      :title="forms.delete.kind === 'node' ? 'Eliminar nodo' : 'Eliminar arista'"
      submit-text="Eliminar"
      @cancel="closeConfirmDelete"
      @submit="submitConfirmDelete"
    >
      <p>¿Seguro que quieres eliminar este {{ forms.delete.kind === 'node' ? 'nodo' : 'arista' }}?</p>
    </GraphModal>

    <GraphModal
      :visible="modals.confirmClear.visible"
      title="Borrar todo"
      submit-text="Limpiar"
      @cancel="closeConfirmClear"
      @submit="submitConfirmClear"
    >
      <p>Se eliminarán <strong>todos</strong> los nodos y aristas. ¿Deseas continuar?</p>
    </GraphModal>

    <GraphModal
      :visible="modals.help.visible"
      title="Ayuda — Dijkstra"
      :hide-submit="true"
      @cancel="closeHelp"
    >
      <div style="line-height:1.5">
        <h3 style="margin:0">¿Qué es Dijkstra?</h3>
        <p>Dijkstra es un algoritmo que encuentra la <strong>ruta más corta</strong> entre dos nodos en un grafo con pesos no negativos.</p>
        
        <h3 style="margin:16px 0 8px 0">¿Cómo usar esta vista?</h3>
        <ol style="padding-left:20px;margin:8px 0;">
          <li><strong>Crear el grafo:</strong> Usa las herramientas para agregar nodos y aristas con pesos ≥ 0.</li>
          <li><strong>Elegir origen y destino:</strong> Selecciona los nodos en los selectores.</li>
          <li><strong>Calcular:</strong> Haz clic en "🧭 Calcular" para ver la ruta más corta.</li>
          <li><strong>Ver resultado:</strong> La ruta se resalta en el canvas y se muestra la distancia total.</li>
        </ol>

        <h3 style="margin:16px 0 8px 0">Tipos de aristas</h3>
        <ul style="padding-left:20px;margin:8px 0;">
          <li><strong>No dirigidas:</strong> Se puede ir en ambas direcciones (A ↔ B). Ideal para distancias, carreteras bidireccionales.</li>
          <li><strong>Dirigidas:</strong> Solo se puede ir en una dirección (A → B). Ideal para calles de una sola vía, flujos.</li>
        </ul>

        <h3 style="margin:16px 0 8px 0">Consejos</h3>
        <ul style="padding-left:20px;margin:8px 0;">
          <li>Los pesos deben ser <strong>≥ 0</strong> (Dijkstra no funciona con pesos negativos).</li>
          <li>Si no hay camino entre origen y destino, la distancia será "∞".</li>
          <li>Puedes exportar/importar grafos para reutilizar o compartir.</li>
        </ul>

        <p style="margin-top:16px;color:var(--muted);font-size:13px;">
          <strong>Nota:</strong> Este algoritmo es útil para encontrar rutas en mapas, redes de comunicación, y muchos otros problemas de optimización.
        </p>
      </div>
    </GraphModal>
  </div>
</template>

<script>
import GraphCanvas from './GraphCanvas.vue'
import GraphModal from './GraphModal.vue'
import { dijkstraAdj } from '../utils/dijkstra.js'
import { modes } from '../constants/modes.js'

export default {
  name: 'DijkstraView',
  
  components: {
    GraphCanvas,
    GraphModal
  },
  
  emits: ['back-to-main'],

  data() {
    return {
      mode: modes.SELECT,
      
      nodes: [],
      edges: [],
      
      // Dijkstra
      source: '',
      target: '',
      distStr: null,
      path: [],
      error: '',

      // Modales
      modals: {
        addNode: { visible: false },
        addEdge: { visible: false },
        editNode: { visible: false },
        editEdge: { visible: false },
        confirmDelete: { visible: false },
        confirmClear: { visible: false },
        help: { visible: false }
      },

      // Formularios
      forms: {
        addNode: {
          label: '',
          color: '#2196F3',
          position: null
        },
        addEdge: {
          sourceId: '',
          targetId: '',
          weight: 1,
          directed: false,
          error: ''
        },
        editNode: {
          id: '',
          label: '',
          color: ''
        },
        editEdge: {
          id: '',
          weight: 1,
          directed: false,
          error: ''
        },
        delete: {
          kind: '',
          id: ''
        }
      }
    }
  },

  mounted() {
    this.loadGraph()
  },

  methods: {
    // ===== GESTIÓN DE MODOS =====
    setMode(newMode) {
      this.mode = newMode
    },

    // ===== CARGA DE DATOS =====
    loadGraph() {
      try {
        const graph = this.$parent?.getGraphDataSafe ? this.$parent.getGraphDataSafe() : null
        if (graph?.nodes) {
          this.nodes = [...graph.nodes]
          this.edges = [...graph.edges || []]
        }
        this.updateCanvas()
      } catch (err) {
        console.warn('[DijkstraView] Error loading graph:', err)
      }
    },

    updateCanvas() {
      this.$nextTick(() => {
        if (this.$refs.canvasRef) {
          this.$refs.canvasRef.updateGraph({ nodes: this.nodes, edges: this.edges })
        }
      })
    },

    // ===== GESTIÓN DE NODOS =====
    onRequestAddNode(position) {
      this.forms.addNode.position = position
      this.forms.addNode.label = `Nodo${this.nodes.length + 1}`
      this.forms.addNode.color = '#2196F3'
      this.modals.addNode.visible = true
    },

    closeAddNode() {
      this.modals.addNode.visible = false
    },

    submitAddNode() {
      const label = this.forms.addNode.label || `Nodo${this.nodes.length + 1}`
      const newId = this.generateNodeId()
      
      const newNode = {
        id: newId,
        label: label,
        color: this.forms.addNode.color,
        x: this.forms.addNode.position?.x || Math.random() * 400 + 100,
        y: this.forms.addNode.position?.y || Math.random() * 300 + 100
      }

      this.nodes.push(newNode)
      this.updateCanvas()
      this.closeAddNode()
    },

    generateNodeId() {
      const existing = this.nodes.map(n => n.id)
      for (let i = 1; i <= 999; i++) {
        const candidate = `n${i}`
        if (!existing.includes(candidate)) return candidate
      }
      return `n${Date.now()}`
    },

    onRequestEditNode(nodeId) {
      const node = this.nodes.find(n => n.id === nodeId)
      if (node) {
        this.forms.editNode.id = node.id
        this.forms.editNode.label = node.label
        this.forms.editNode.color = node.color
        this.modals.editNode.visible = true
      }
    },

    closeEditNode() {
      this.modals.editNode.visible = false
    },

    submitEditNode() {
      const node = this.nodes.find(n => n.id === this.forms.editNode.id)
      if (node) {
        node.label = this.forms.editNode.label
        node.color = this.forms.editNode.color
        this.updateCanvas()
      }
      this.closeEditNode()
    },

    // ===== GESTIÓN DE ARISTAS =====
    onRequestAddEdge(sourceId, targetId) {
      this.forms.addEdge.sourceId = sourceId
      this.forms.addEdge.targetId = targetId
      this.forms.addEdge.weight = 1
      this.forms.addEdge.directed = false
      this.forms.addEdge.error = ''
      this.modals.addEdge.visible = true
    },

    closeAddEdge() {
      this.modals.addEdge.visible = false
    },

    submitAddEdge() {
      const weight = parseFloat(this.forms.addEdge.weight)
      if (isNaN(weight) || weight < 0) {
        this.forms.addEdge.error = 'El peso debe ser un número ≥ 0'
        return
      }

      const newId = this.generateEdgeId()
      const newEdge = {
        id: newId,
        source: this.forms.addEdge.sourceId,
        target: this.forms.addEdge.targetId,
        weight: weight,
        directed: this.forms.addEdge.directed
      }

      this.edges.push(newEdge)
      this.updateCanvas()
      this.closeAddEdge()
    },

    generateEdgeId() {
      const existing = this.edges.map(e => e.id)
      for (let i = 1; i <= 999; i++) {
        const candidate = `e${i}`
        if (!existing.includes(candidate)) return candidate
      }
      return `e${Date.now()}`
    },

    onRequestEditEdge(edgeId) {
      const edge = this.edges.find(e => e.id === edgeId)
      if (edge) {
        this.forms.editEdge.id = edge.id
        this.forms.editEdge.weight = edge.weight
        this.forms.editEdge.directed = edge.directed
        this.forms.editEdge.error = ''
        this.modals.editEdge.visible = true
      }
    },

    closeEditEdge() {
      this.modals.editEdge.visible = false
    },

    submitEditEdge() {
      const weight = parseFloat(this.forms.editEdge.weight)
      if (isNaN(weight) || weight < 0) {
        this.forms.editEdge.error = 'El peso debe ser un número ≥ 0'
        return
      }

      const edge = this.edges.find(e => e.id === this.forms.editEdge.id)
      if (edge) {
        edge.weight = weight
        edge.directed = this.forms.editEdge.directed
        this.updateCanvas()
      }
      this.closeEditEdge()
    },

    // ===== ELIMINAR =====
    onRequestDelete(kind, id) {
      this.forms.delete.kind = kind
      this.forms.delete.id = id
      this.modals.confirmDelete.visible = true
    },

    closeConfirmDelete() {
      this.modals.confirmDelete.visible = false
    },

    submitConfirmDelete() {
      const { kind, id } = this.forms.delete
      if (kind === 'node') {
        this.nodes = this.nodes.filter(n => n.id !== id)
        this.edges = this.edges.filter(e => e.source !== id && e.target !== id)
      } else if (kind === 'edge') {
        this.edges = this.edges.filter(e => e.id !== id)
      }
      this.updateCanvas()
      this.closeConfirmDelete()
    },

    confirmClear() {
      this.modals.confirmClear.visible = true
    },

    closeConfirmClear() {
      this.modals.confirmClear.visible = false
    },

    submitConfirmClear() {
      this.nodes = []
      this.edges = []
      this.clearPath()
      this.updateCanvas()
      this.closeConfirmClear()
    },

    // ===== EXPORTAR/IMPORTAR =====
    exportGraph() {
      const data = {
        nodes: this.nodes,
        edges: this.edges,
        algorithm: 'dijkstra',
        exportedAt: new Date().toISOString()
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dijkstra-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    },

    importGraph() {
      this.$refs.fileInput.click()
    },

    onFileSelected(event) {
      const file = event.target.files[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result)
          if (data.nodes && Array.isArray(data.nodes)) {
            this.nodes = data.nodes
            this.edges = data.edges || []
            this.clearPath()
            this.updateCanvas()
          } else {
            alert('Archivo no válido')
          }
        } catch (err) {
          console.error('Error importing:', err)
          alert('Error al importar archivo')
        }
      }
      reader.readAsText(file)
      
      // Reset input
      event.target.value = ''
    },

    // ===== DIJKSTRA =====
    buildAdj() {
      const adj = {}
      this.nodes.forEach(n => {
        adj[n.id] = []
      })
      
      this.edges.forEach(e => {
        const weight = parseFloat(e.weight) || 1
        adj[e.source].push({ node: e.target, weight })
        if (!e.directed) {
          adj[e.target].push({ node: e.source, weight })
        }
      })
      
      return adj
    },

    runDijkstra() {
      this.error = ''
      this.distStr = null
      this.path = []

      if (!this.source || !this.target) {
        this.error = 'Selecciona origen y destino.'
        return
      }

      if (this.source === this.target) {
        this.distStr = '0'
        this.path = [this.source]
        this.showPath()
        return
      }

      try {
        const adj = this.buildAdj()
        const result = dijkstraAdj(adj, this.source, this.target)
        
        if (result.distance === Infinity) {
          this.error = 'No hay camino entre los nodos seleccionados.'
          this.clearPath()
        } else {
          this.distStr = result.distance.toString()
          this.path = result.path
          this.showPath()
        }
      } catch (err) {
        console.error('[DijkstraView] Error en Dijkstra:', err)
        this.error = 'Error al ejecutar Dijkstra: ' + err.message
        this.clearPath()
      }
    },

    showPath() {
      this.$nextTick(() => {
        if (this.$refs.canvasRef && this.path.length > 0) {
          this.$refs.canvasRef.showPath(this.path)
        }
      })
    },

    clearPath() {
      this.source = ''
      this.target = ''
      this.distStr = null
      this.path = []
      this.error = ''
      
      this.$nextTick(() => {
        if (this.$refs.canvasRef) {
          this.$refs.canvasRef.clearPath()
        }
      })
    },

    // ===== AYUDA =====
    showHelp() {
      this.modals.help.visible = true
    },

    closeHelp() {
      this.modals.help.visible = false
    }
  }
}
</script>

<style scoped>
.dijkstra-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.header {
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  padding: 12px 16px;
}

.app-layout {
  display: flex;
  height: 100%;
}

.sidebar {
  width: 320px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  overflow-y: auto;
  padding: 16px;
}

.main {
  flex: 1;
  background: var(--bg-primary);
  position: relative;
}

.group {
  margin-bottom: 20px;
}

.group h2 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: var(--text-primary);
}

.button {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  color: var(--text-primary);
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  margin-bottom: 6px;
  width: 100%;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 8px;
}

.button:hover {
  background: var(--bg-hover);
}

.button.active {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}

.button.danger {
  color: #dc2626;
  border-color: #dc2626;
}

.button.danger:hover {
  background: #fef2f2;
}

.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.label {
  display: block;
  margin: 8px 0 4px 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 13px;
}

.input:focus {
  outline: none;
  border-color: var(--accent);
}

.input.error {
  border-color: #dc2626;
}

.color-input {
  width: 50px;
  height: 32px;
  padding: 1px;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
}

.sep {
  border: none;
  border-top: 1px solid var(--border);
  margin: 16px 0;
}

.error-text {
  color: #dc2626;
  font-size: 12px;
  margin-top: 4px;
}

.row {
  display: flex;
  gap: 12px;
}

.row > div {
  flex: 1;
}

.kbd {
  background: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 12px;
}
</style>
