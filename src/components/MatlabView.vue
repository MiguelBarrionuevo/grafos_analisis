<template>
  <div class="matlab-view">
    <header class="header">
      <button class="back-button" @click="$emit('back-to-main')">
        ← Volver
      </button>
      <h1>MATLAB - Fuzzy Logic</h1>
    </header>

    <main class="content">
      <div class="info-section">
        <div class="info-card">
          <h2><i class="fas fa-brain"></i> ¿Qué es Fuzzy Logic?</h2>
          <p>
            La <strong>Lógica Difusa</strong> (Fuzzy Logic) es una extensión de la lógica booleana tradicional
            que permite trabajar con valores de verdad parciales entre 0 (completamente falso) y 1 (completamente verdadero).
            A diferencia de la lógica clásica que solo reconoce verdadero o falso, la lógica difusa puede 
            representar conceptos ambiguos como "tibio", "rápido" o "alto".
          </p>
        </div>

        <div class="info-card">
          <h2><i class="fas fa-cogs"></i> ¿Para qué sirve?</h2>
          <p>
            La lógica difusa se utiliza en sistemas de control y toma de decisiones donde las fronteras 
            no son precisas. Algunas aplicaciones incluyen:
          </p>
          <ul>
            <li><strong>Control industrial:</strong> Regulación de temperatura, velocidad, presión</li>
            <li><strong>Electrodomésticos:</strong> Lavadoras, aires acondicionados, aspiradoras inteligentes</li>
            <li><strong>Automoción:</strong> Sistemas de frenado, control de crucero adaptativo</li>
            <li><strong>Inteligencia artificial:</strong> Sistemas expertos, reconocimiento de patrones</li>
            <li><strong>Finanzas:</strong> Evaluación de riesgos, predicción de mercados</li>
          </ul>
        </div>

        <div class="info-card">
          <h2><i class="fas fa-lightbulb"></i> Ejemplos de uso</h2>
          
          <div class="example">
            <h3>Ejemplo 1: Control de Temperatura</h3>
            <p>
              Imagina un sistema de aire acondicionado que debe mantener una habitación cómoda:
            </p>
            <ul>
              <li><strong>Entrada:</strong> Temperatura actual (°C)</li>
              <li><strong>Conjuntos difusos:</strong> Frío (15-20°C), Confortable (18-24°C), Caliente (22-30°C)</li>
              <li><strong>Reglas:</strong> 
                <ul>
                  <li>SI temperatura es Fría ENTONCES ventilador en bajo</li>
                  <li>SI temperatura es Confortable ENTONCES ventilador en medio</li>
                  <li>SI temperatura es Caliente ENTONCES ventilador en alto</li>
                </ul>
              </li>
              <li><strong>Salida:</strong> Velocidad del ventilador (0-100%)</li>
            </ul>
          </div>

          <div class="example">
            <h3>Ejemplo 2: Sistema de Propinas</h3>
            <p>
              Un sistema que calcula la propina basándose en la calidad del servicio:
            </p>
            <ul>
              <li><strong>Entradas:</strong> Calidad de comida (0-10), Calidad de servicio (0-10)</li>
              <li><strong>Reglas:</strong>
                <ul>
                  <li>SI servicio es pobre O comida es mala ENTONCES propina baja</li>
                  <li>SI servicio es bueno Y comida es buena ENTONCES propina alta</li>
                  <li>SI servicio es excelente ENTONCES propina muy alta</li>
                </ul>
              </li>
              <li><strong>Salida:</strong> Porcentaje de propina (5-25%)</li>
            </ul>
          </div>

          <div class="example">
            <h3>Ejemplo 3: Evaluación de Riesgo de Préstamo</h3>
            <p>
              Un banco evalúa si otorgar un préstamo:
            </p>
            <ul>
              <li><strong>Entradas:</strong> Ingreso mensual, Historial crediticio, Deuda actual</li>
              <li><strong>Conjuntos difusos:</strong> Ingreso bajo/medio/alto, Historial malo/regular/bueno</li>
              <li><strong>Reglas:</strong>
                <ul>
                  <li>SI ingreso es alto Y historial es bueno ENTONCES riesgo bajo</li>
                  <li>SI ingreso es bajo Y deuda es alta ENTONCES riesgo alto</li>
                  <li>SI historial es malo ENTONCES riesgo alto</li>
                </ul>
              </li>
              <li><strong>Salida:</strong> Nivel de riesgo (0-100)</li>
            </ul>
          </div>
        </div>

        <div class="info-card">
          <h2><i class="fas fa-book"></i> Componentes de un Sistema Fuzzy</h2>
          <ol>
            <li><strong>Fuzificación:</strong> Convierte valores precisos en valores difusos</li>
            <li><strong>Base de reglas:</strong> Conjunto de reglas IF-THEN que definen el comportamiento</li>
            <li><strong>Motor de inferencia:</strong> Aplica las reglas difusas a las entradas</li>
            <li><strong>Defuzificación:</strong> Convierte el resultado difuso en un valor preciso</li>
          </ol>
        </div>
      </div>

      <div class="actions-section">
        <h2><i class="fas fa-rocket"></i> Trabajar con MATLAB</h2>
        <p class="action-description">
          Abre el Fuzzy Logic Designer de MATLAB para crear y diseñar tus sistemas de lógica difusa.
        </p>
        
        <div class="button-group">
          <button class="action-button primary" @click="handleCreateNew">
            <i class="fas fa-plus-circle"></i>
            <span>Crear Nuevo Sistema</span>
            <small>Abre el diseñador vacío</small>
          </button>

          <button class="action-button secondary" @click="triggerFileSelect">
            <i class="fas fa-folder-open"></i>
            <span>Abrir Archivo .fis</span>
            <small>Importa un sistema existente</small>
          </button>
        </div>

        <input 
          ref="fileInput" 
          type="file" 
          accept=".fis" 
          @change="handleFileSelect" 
          style="display: none;"
        />

        <div class="help-text">
          <i class="fas fa-info-circle"></i>
          <p>
            Los archivos <code>.fis</code> (Fuzzy Inference System) contienen la definición completa
            de un sistema de lógica difusa, incluyendo variables de entrada/salida, funciones de 
            pertenencia y reglas.
          </p>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
// @ts-nocheck
/* eslint-disable no-undef */
/* global defineEmits */
import { ref } from 'vue';
import { matlabAPI } from '../utils/matlab-integration.js';

defineEmits(['back-to-main']);

const fileInput = ref(null);

const handleCreateNew = () => {
  matlabAPI.openFuzzyLogic();
};

const triggerFileSelect = () => {
  fileInput.value?.click();
};

const handleFileSelect = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.name.endsWith('.fis')) {
    alert('Por favor selecciona un archivo .fis válido');
    return;
  }

  try {
    // Leer el contenido del archivo
    const fileContent = await file.text();
    
    // Enviar el contenido del archivo y el nombre a MATLAB
    matlabAPI.openFuzzyFileFromContent(file.name, fileContent);
    
  } catch (error) {
    console.error('Error al leer el archivo:', error);
    alert('Error al leer el archivo. Por favor intenta nuevamente.');
  }
  
  // Limpiar el input para permitir seleccionar el mismo archivo nuevamente
  event.target.value = '';
};
</script>

<style scoped>
.matlab-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: radial-gradient(1200px 600px at 20% 10%, #0b1325 0%, transparent 60%),
              radial-gradient(1000px 1000px at 80% 30%, #0a1a2f 0%, transparent 50%),
              #0f172a;
  overflow: hidden;
}

.header {
  background: #111827;
  padding: 1.5rem 2rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid #1f2937;
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.back-button {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.3s ease;
}

.back-button:hover {
  background: #2563eb;
  transform: translateX(-3px);
}

.header h1 {
  margin: 0;
  color: #e5e7eb;
  font-size: 2rem;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  align-items: start;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.info-card {
  background: #111827;
  border: 1px solid #1f2937;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.info-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(59, 130, 246, 0.2);
}

.info-card h2 {
  color: #3b82f6;
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.5rem;
}

.info-card p {
  color: #e5e7eb;
  line-height: 1.7;
  margin: 0 0 1rem 0;
}

.info-card ul {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
  color: #e5e7eb;
  line-height: 1.8;
}

.info-card ol {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
  color: #e5e7eb;
  line-height: 1.8;
}

.info-card li {
  margin-bottom: 0.5rem;
}

.example {
  background: #1f2937;
  padding: 1.5rem;
  border-radius: 8px;
  margin: 1rem 0;
  border-left: 4px solid #3b82f6;
}

.example h3 {
  color: #e5e7eb;
  margin: 0 0 0.75rem 0;
  font-size: 1.1rem;
}

.example p {
  margin: 0 0 0.75rem 0;
  color: #e5e7eb;
}

.example ul {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
  color: #e5e7eb;
}

.example li {
  margin-bottom: 0.4rem;
  font-size: 0.95rem;
}

.actions-section {
  background: #111827;
  border: 1px solid #1f2937;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  position: sticky;
  top: 0;
  height: fit-content;
}

.actions-section h2 {
  color: #3b82f6;
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.5rem;
}

.action-description {
  color: #9ca3af;
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.action-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: inherit;
  gap: 0.5rem;
}

.action-button i {
  font-size: 2.5rem;
}

.action-button span {
  font-size: 1.1rem;
  font-weight: 600;
}

.action-button small {
  font-size: 0.85rem;
  opacity: 0.8;
}

.action-button.primary {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.action-button.primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4);
}

.action-button.secondary {
  background: #1f2937;
  color: #3b82f6;
  border: 2px solid #3b82f6;
}

.action-button.secondary:hover {
  background: #3b82f6;
  color: white;
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
}

.help-text {
  background: #1f2937;
  padding: 1rem;
  border-radius: 8px;
  display: flex;
  gap: 0.75rem;
  align-items: start;
}

.help-text i {
  color: #3b82f6;
  font-size: 1.2rem;
  margin-top: 0.2rem;
}

.help-text p {
  color: #9ca3af;
  line-height: 1.6;
  margin: 0;
  font-size: 0.9rem;
}

.help-text code {
  background: #111827;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  color: #3b82f6;
  font-weight: 600;
}

@media (max-width: 1200px) {
  .content {
    grid-template-columns: 1fr;
  }
  
  .actions-section {
    position: relative;
  }
}
</style>
