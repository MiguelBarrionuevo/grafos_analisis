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
  },

  /**
   * Abre la aplicación de Lógica Difusa (Fuzzy Logic) en MATLAB.
   */
  openFuzzyLogic() {
    // Abre la interfaz clásica de Fuzzy Logic
    this.runCommand('fuzzy');
  },

  /**
   * Abre un archivo .fis (Fuzzy Inference System) en MATLAB.
   * @param {string} filePath - Ruta absoluta al archivo .fis
   */
  openFuzzyFile(filePath) {
    if (!filePath) {
      console.error('MATLAB API: No se proporcionó ruta de archivo.');
      return;
    }
    // Convertir la ruta a formato compatible con MATLAB
    const normalizedPath = filePath.replace(/\\/g, '/');
    // Abrir el archivo en el editor de lógica difusa clásico
    this.runCommand(`fuzzy('${normalizedPath}')`);
  },

  /**
   * Abre un archivo .fis desde su contenido (para navegadores que no permiten acceso directo a rutas)
   * @param {string} fileName - Nombre del archivo .fis
   * @param {string} fileContent - Contenido del archivo .fis
   */
  openFuzzyFileFromContent(fileName, fileContent) {
    if (!fileName || !fileContent) {
      console.error('MATLAB API: Faltan datos del archivo.');
      return;
    }
    
    // Codificar el contenido en base64 para pasarlo de forma segura
    const base64Content = btoa(unescape(encodeURIComponent(fileContent)));
    const tempPath = `${fileName}`;
    
    // Crear un comando que escriba el archivo en la carpeta temporal y lo abra
    const matlabCommand = `tempFile=fullfile(tempdir,'${tempPath}');fid=fopen(tempFile,'w');content=char(matlab.net.base64decode('${base64Content}'));fprintf(fid,'%s',content);fclose(fid);fuzzy(tempFile);`;
    
    this.runCommand(matlabCommand);
  }
};