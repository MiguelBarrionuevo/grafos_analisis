<template>
  <div class="dijkstra-view app-layout">
    <header class="header" style="display:flex;align-items:center;justify-content:space-between">
      <h1 style="margin:0">Dijkstra — Ruta mínima</h1>
      <div>
        <button class="button" @click="$emit('back-to-main')">← Volver</button>
      </div>
    </header>

    <aside class="sidebar">
      <!-- Algoritmo Dijkstra (prioridad máxima) -->
      <div class="group priority">
        <h2>🧭 Algoritmo Dijkstra</h2>
        
        <div class="dijkstra-controls">
          <label class="label">Nodo origen</label>
          <select v-model="source" class="input">
            <option value="">-- Seleccionar origen --</option>
            <option v-for="n in nodes" :key="n.id" :value="n.id">{{ n.label || n.id }}</option>
          </select>

          <label class="label">Nodo destino</label>
          <select v-model="target" class="input">
            <option value="">-- Seleccionar destino --</option>
            <option v-for="n in nodes" :key="n.id" :value="n.id">{{ n.label || n.id }}</option>
          </select>

          <div class="button-row">
            <button class="button primary" @click="runDijkstra" :disabled="!source || !target">
              🧭 Calcular ruta
            </button>
            <button class="button secondary" @click="clearPath">🧹 Limpiar</button>
          </div>
        </div>

        <!-- Resultado -->
        <div class="result-box">
          <div v-if="error" class="error-text">{{ error }}</div>
          <div v-else-if="distStr !== null" class="result-success">
            <div class="distance">Distancia: <strong>{{ distStr }}</strong></div>
            <div class="path">Ruta: <code>{{ path.join(' → ') }}</code></div>
            <div class="path-info">{{ path.length }} nodos</div>
          </div>
          <div v-else class="result-placeholder">
            Selecciona origen y destino para calcular la ruta más corta
          </div>
        </div>
      </div>

      <!-- Crear grafo -->
      <div class="group">
        <h2>🎨 Crear grafo</h2>
        <div class="tool-grid">
          <button class="button" @click="addNodeDirect">➕ Nodo directo</button>
          <button class="button" :class="{ active: mode === MODES.ADD_NODE }" @click="setMode(MODES.ADD_NODE)">
            📍 Nodo por click
          </button>
        </div>
        <button class="button" :class="{ active: mode === MODES.ADD_EDGE }" @click="setMode(MODES.ADD_EDGE)">
          🔗 Conectar nodos
        </button>
        <div class="tool-grid">
          <button class="button" :class="{ active: mode === MODES.EDIT }" @click="setMode(MODES.EDIT)">
            ✏️ Editar
          </button>
          <button class="button" :class="{ active: mode === MODES.DELETE }" @click="setMode(MODES.DELETE)">
            🗑️ Borrar
          </button>
        </div>
        <button class="button danger" @click="confirmClear">♻️ Limpiar todo</button>
      </div>

      <!-- Archivo -->
      <div class="group">
        <h2>💾 Archivo</h2>
        <div class="tool-grid">
          <button class="button" @click="exportGraph">💾 Guardar</button>
          <button class="button" @click="importGraph">📥 Cargar</button>
        </div>
        <input ref="fileInput" type="file" accept="application/json" style="display:none" @change="onFileSelected" />
      </div>

      <!-- Ayuda -->
      <div class="group">
        <button class="button help" @click="showHelp">❓ Ayuda rápida</button>
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
      title="🧭 Guía rápida de Dijkstra"
      :hide-submit="true"
      @cancel="closeHelp"
    >
      <div class="help-content">
        <div class="help-section">
          <h4>🎯 ¿Qué hace?</h4>
          <p>Encuentra la <strong>ruta más corta</strong> entre dos nodos.</p>
        </div>
        
        <div class="help-section">
          <h4>🚀 Pasos rápidos</h4>
          <ol class="help-steps">
            <li>Crea nodos y conecta con aristas (peso ≥ 0)</li>
            <li>Selecciona origen y destino</li>
            <li>Haz clic en "🧭 Calcular"</li>
          </ol>
        </div>

        <div class="help-section">
          <h4>💡 Tipos de aristas</h4>
          <div class="help-tips">
            <div><strong>↔</strong> No dirigida: ambas direcciones</div>
            <div><strong>→</strong> Dirigida: una sola dirección</div>
          </div>
        </div>

        <div class="help-section">
          <h4>⚠️ Importante</h4>
          <div class="help-tips">
            <div>• Pesos deben ser ≥ 0</div>
            <div>• Sin camino = distancia "∞"</div>
          </div>
        </div>
      </div>
    </GraphModal>
  </div>
</template>

<script>
import GraphCanvas from './GraphCanvas.vue'
import GraphModal from './GraphModal.vue'
import { dijkstraAdj, reconstructPath } from '../utils/dijkstra.js'
import { MODES } from '../constants/modes.js'

export default {
  name: 'DijkstraView',
  
  components: {
    GraphCanvas,
    GraphModal
  },
  
  emits: ['back-to-main'],

  data() {
    return {
      MODES,
      mode: MODES.NONE,
      
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
    // Asegurar que el canvas se inicializa después de que el layout esté listo
    this.$nextTick(() => {
      setTimeout(() => {
        this.updateCanvas()
        // Forzar resize de Cytoscape si está disponible
        if (this.$refs.canvasRef?.cy) {
          this.$refs.canvasRef.cy.resize()
          this.$refs.canvasRef.cy.fit()
        }
      }, 100)
    })
  },

  methods: {
    // ===== GESTIÓN DE MODOS =====
    setMode(newMode) {
      console.log('[DijkstraView] Cambiando modo a:', newMode)
      this.mode = newMode
    },

    // ===== CREAR NODO DIRECTO =====
    addNodeDirect() {
      const label = `Nodo${this.nodes.length + 1}`
      const pos = { x: Math.random() * 300 + 150, y: Math.random() * 200 + 100 }
      const color = '#2196F3'
      
      try {
        if (this.$refs.canvasRef && this.$refs.canvasRef.addNode) {
          this.$refs.canvasRef.addNode(label, pos, color)
          const data = this.$refs.canvasRef.getGraphData()
          this.nodes = data.nodes || []
          this.edges = data.edges || []
          console.log('[DijkstraView] Nodo creado directamente:', label)
        } else {
          console.warn('[DijkstraView] Canvas API no disponible')
        }
      } catch (err) {
        console.error('[DijkstraView] Error creando nodo:', err)
      }
    },

    // ===== ACTUALIZACIÓN DEL CANVAS =====
    updateCanvas() {
      this.$nextTick(() => {
        if (this.$refs.canvasRef) {
          // Filtrar aristas que referencian nodos inexistentes
          const nodeIds = new Set(this.nodes.map(n => n.id))
          const validEdges = this.edges.filter(e => 
            nodeIds.has(e.source) && nodeIds.has(e.target)
          )
          
          // Asegurar que los nodos tienen posición
          const validNodes = this.nodes.map(n => ({
            ...n,
            position: n.position || { x: n.x || Math.random() * 400 + 100, y: n.y || Math.random() * 300 + 100 }
          }))
          
          console.log('[DijkstraView] Actualizando canvas con:', { nodes: validNodes.length, edges: validEdges.length })
          this.$refs.canvasRef.loadGraphData({ nodes: validNodes, edges: validEdges }, { replace: true })
        } else {
          console.warn('[DijkstraView] canvasRef no disponible aún')
        }
      })
    },

    // ===== GESTIÓN DE NODOS =====
    onRequestAddNode(event) {
      console.log('[DijkstraView] onRequestAddNode llamado:', event)
      this.forms.addNode.position = event.position
      this.forms.addNode.label = `Nodo${this.nodes.length + 1}`
      this.forms.addNode.color = '#2196F3'
      this.modals.addNode.visible = true
    },

    closeAddNode() {
      this.modals.addNode.visible = false
    },

    submitAddNode() {
      const label = this.forms.addNode.label || `Nodo${this.nodes.length + 1}`
      // If canvas API available, add node directly to Cytoscape and refresh local state
      const pos = this.forms.addNode.position || { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 }
      try {
        if (this.$refs.canvasRef && this.$refs.canvasRef.addNode) {
          this.$refs.canvasRef.addNode(label, pos, this.forms.addNode.color)
          // refresh local nodes/edges from canvas
          const data = this.$refs.canvasRef.getGraphData()
          this.nodes = data.nodes || []
          this.edges = data.edges || []
        } else {
          // fallback: modify local model and update canvas
          const newId = this.generateNodeId()
          const newNode = { id: newId, label, color: this.forms.addNode.color, x: pos.x, y: pos.y }
          this.nodes.push(newNode)
          this.updateCanvas()
        }
      } catch (err) {
        console.error('[DijkstraView] submitAddNode error:', err)
      }
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

    onRequestEditNode(event) {
      const node = this.nodes.find(n => n.id === event.id)
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
    onRequestAddEdge(event) {
      this.forms.addEdge.sourceId = event.sourceId
      this.forms.addEdge.targetId = event.targetId
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
      try {
        if (this.$refs.canvasRef && this.$refs.canvasRef.addEdge) {
          const res = this.$refs.canvasRef.addEdge({ sourceId: this.forms.addEdge.sourceId, targetId: this.forms.addEdge.targetId, weight, directed: this.forms.addEdge.directed })
          // refresh local model
          const data = this.$refs.canvasRef.getGraphData()
          this.nodes = data.nodes || []
          this.edges = data.edges || []
          if (res && res.ok === false) {
            this.forms.addEdge.error = res.message || 'Error al crear arista'
          }
        } else {
          const newId = this.generateEdgeId()
          const newEdge = { id: newId, source: this.forms.addEdge.sourceId, target: this.forms.addEdge.targetId, weight, directed: this.forms.addEdge.directed }
          this.edges.push(newEdge)
          this.updateCanvas()
        }
      } catch (err) {
        console.error('[DijkstraView] submitAddEdge error:', err)
        this.forms.addEdge.error = String(err.message || err)
      }
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

    onRequestEditEdge(event) {
      const edge = this.edges.find(e => e.id === event.id)
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
    onRequestDelete(event) {
      this.forms.delete.kind = event.kind
      this.forms.delete.id = event.id
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
            // Validar y limpiar nodos
            this.nodes = data.nodes.map(n => ({
              id: n.id || `n${Date.now()}${Math.random()}`,
              label: n.label || n.id || 'Nodo',
              color: n.color || '#2196F3',
              x: n.x || n.position?.x || Math.random() * 400 + 100,
              y: n.y || n.position?.y || Math.random() * 300 + 100
            }))
            
            // Validar y filtrar aristas
            const nodeIds = new Set(this.nodes.map(n => n.id))
            this.edges = (data.edges || [])
              .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
              .map(e => ({
                id: e.id || `e${Date.now()}${Math.random()}`,
                source: e.source,
                target: e.target,
                weight: parseFloat(e.weight) >= 0 ? parseFloat(e.weight) : 1,
                directed: !!e.directed
              }))
            
            this.clearPath()
            this.updateCanvas()
          } else {
            alert('Archivo no válido: debe contener un array de nodos')
          }
        } catch (err) {
          console.error('Error importing:', err)
          alert('Error al importar archivo: ' + err.message)
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
        if (weight < 0) {
          console.warn('[DijkstraView] Peso negativo ignorado en arista:', e.id, weight)
          return
        }
        // Formato correcto: [nodeId, weight] no { node, weight }
        adj[e.source].push([e.target, weight])
        if (!e.directed) {
          adj[e.target].push([e.source, weight])
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

      if (this.nodes.length < 2) {
        this.error = 'Necesitas al menos 2 nodos para calcular una ruta.'
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
        console.log('[DijkstraView] Matriz de adyacencia:', adj)
        
        const result = dijkstraAdj(adj, this.source)
        console.log('[DijkstraView] Resultado Dijkstra:', result)
        
        const targetDistance = result.dist.get(this.target)
        if (targetDistance === Infinity) {
          this.error = 'No hay camino entre los nodos seleccionados.'
          this.clearPath()
        } else {
          this.distStr = targetDistance.toString()
          // Reconstruir el camino
          this.path = reconstructPath(result.prev, this.source, this.target)
          console.log('[DijkstraView] Camino encontrado:', this.path, 'Distancia:', targetDistance)
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
  flex: 1;
  min-height: 0;
}

.sidebar {
  width: 280px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.main {
  flex: 1;
  background: var(--bg-primary);
  position: relative;
  min-height: 500px; /* mínimo para Cytoscape */
  min-width: 400px;
  overflow: hidden;
}

.main > * {
  width: 100% !important;
  height: 100% !important;
  min-height: inherit;
  min-width: inherit;
}

.group {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
}

.group.priority {
  background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
  border-color: var(--accent);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.group h2 {
  margin: 0 0 12px 0;
  font-size: 15px;
  font-weight: 600;
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

.button.primary {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
  font-weight: 600;
}

.button.primary:hover:not(:disabled) {
  background: #1976d2;
  border-color: #1976d2;
}

.button.secondary {
  background: var(--bg-primary);
  border-color: var(--border);
}

.button.help {
  background: linear-gradient(135deg, #fff3e0 0%, #f3e5f5 100%);
  border-color: #ff9800;
  color: #e65100;
}

.button.help:hover {
  background: linear-gradient(135deg, #ffe0b2 0%, #f8bbd9 100%);
}

/* Layout helpers */
.tool-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-bottom: 8px;
}

.button-row {
  display: flex;
  gap: 6px;
  margin-top: 10px;
}

.dijkstra-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Resultado */
.result-box {
  margin-top: 12px;
  padding: 10px;
  border-radius: 6px;
  background: rgba(255,255,255,0.8);
  border: 1px solid rgba(33,150,243,0.2);
}

.result-success .distance {
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.result-success .path {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.result-success .path code {
  background: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 11px;
}

.result-success .path-info {
  font-size: 11px;
  color: var(--muted);
}

.result-placeholder {
  font-size: 12px;
  color: var(--muted);
  text-align: center;
  font-style: italic;
}

/* Modal ayuda compacto */
.help-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.help-section h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--accent);
  display: flex;
  align-items: center;
  gap: 6px;
}

.help-section p {
  margin: 0;
  font-size: 13px;
  color: var(--text-primary);
}

.help-steps {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  line-height: 1.5;
}

.help-steps li {
  margin: 4px 0;
}

.help-tips {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.help-tips div {
  display: flex;
  align-items: center;
  gap: 8px;
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

/* Estilos específicos para el modal de ayuda compacto */
:deep(.modal) {
  max-width: 450px;
  width: 85vw;
}

:deep(.modal-body) {
  max-height: 60vh;
  overflow-y: auto;
  padding: 16px;
}

:deep(.modal-body strong) {
  color: var(--accent);
  font-weight: 600;
}
</style>
