import { createApp } from 'vue';
import App from './App.vue';
import './assets/styles.css';

// Registro global (asegura que GraphModal/GraphSidebar/GraphCanvas existan SIEMPRE)
import GraphModal from './components/GraphModal.vue';
import GraphSidebar from './components/GraphSidebar.vue';
import GraphCanvas from './components/GraphCanvas.vue';

const app = createApp(App);
app.component('GraphModal', GraphModal);
app.component('GraphSidebar', GraphSidebar);
app.component('GraphCanvas', GraphCanvas);
app.mount('#app');
