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
    window.location.href = `matlab:${command}`;
  },

  /**
   * Abre la aplicación de Lógica Difusa (Fuzzy Logic) en MATLAB.
   */
  openFuzzyLogic() {
    // Reemplaza 'fuzzyLogicApp()' con el comando real que necesitas ejecutar.
    this.runCommand('fuzzyLogicApp()');
  }
};