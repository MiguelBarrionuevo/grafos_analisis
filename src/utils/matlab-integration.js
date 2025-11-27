// @ts-nocheck
/**
 * API para interactuar con MATLAB a través de esquemas de URI.
 */
export const matlabAPI = {
  /**
   * Intenta abrir una aplicación o ejecutar un comando en MATLAB.
   * @param {string} command - El comando a ejecutar en MATLAB (p. ej., "fuzzyLogicApp()" o "run('mi_script.m')").
   */
  runCommand(command) {
    if (!command) {
      console.error("MATLAB API: No se proporcionó ningún comando.");
      return;
    }
    // Intentar abrir vía esquema 'matlab:'. Si el protocolo no está registrado, el usuario
    // verá un error en la consola del navegador. Proporcionamos instrucciones para registrar
    // el protocolo (scripts en tools/matlab-handler/) en caso de que no funcione.
    try {
      window.location.href = `matlab:${command}`;
    } catch (err) {
      console.error('MATLAB API: no se pudo abrir el esquema matlab:', err);
      alert('No se pudo abrir MATLAB desde el navegador. Si MATLAB está instalado, ejecuta el script de registro en tools\\matlab-handler\\register-matlab-protocol.ps1 como Administrador para asociar el protocolo matlab:');
    }
    // Añadir un aviso instructivo si el usuario no tiene el protocolo registrado.
    setTimeout(() => {
      // No hay forma fiable desde JS de detectar si el intento falló; mostramos instrucciones
      // proactivas para ayudar al usuario.
      const msg = `Si MATLAB no se abrió, registra el protocolo 'matlab:' ejecutando como Administrador en la raíz del proyecto:\n\npowershell -ExecutionPolicy Bypass -File "tools\\matlab-handler\\register-matlab-protocol.ps1"\n\nO ejecuta el instalador de MATLAB y elige 'Repair'.`;
      // Log con instrucciones; no hacemos alert repetido para no molestar.
      console.info('MATLAB API: instrucciones si el protocolo matlab: no está registrado. Ejecuta el script:', msg);
    }, 500);
  },

  /**
   * Abre la aplicación de Lógica Difusa (Fuzzy Logic) en MATLAB.
   */
  openFuzzyLogic() {
    // Reemplaza 'fuzzyLogicApp()' con el comando real que necesitas ejecutar.
    this.runCommand('fuzzyLogicApp()');
  }
};