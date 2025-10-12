// @ts-nocheck
/*
  Implementación del algoritmo Húngaro (Munkres) para el problema de asignación.
  Adaptado para generar pasos intermedios para visualización.
  Basado en varias implementaciones de código abierto.
*/

export function munkres(matrix, steps) {
  const n = matrix.length;
  const C = JSON.parse(JSON.stringify(matrix)); // Copia de la matriz de costos

  // Paso 1: Reducción de filas
  for (let i = 0; i < n; i++) {
    const minVal = Math.min(...C[i]);
    if (minVal > 0 && minVal !== Infinity) {
      for (let j = 0; j < n; j++) {
        if (C[i][j] !== Infinity) C[i][j] -= minVal;
      }
    }
  }
  steps.push({ title: '2. Reducción de Filas', description: 'Se resta el mínimo de cada fila a todos sus elementos.', matrix: JSON.parse(JSON.stringify(C)) });

  // Paso 2: Reducción de columnas
  for (let j = 0; j < n; j++) {
    let minVal = Infinity;
    for (let i = 0; i < n; i++) {
      minVal = Math.min(minVal, C[i][j]);
    }
    if (minVal > 0 && minVal !== Infinity) {
      for (let i = 0; i < n; i++) {
        if (C[i][j] !== Infinity) C[i][j] -= minVal;
      }
    }
  }
  steps.push({ title: '3. Reducción de Columnas', description: 'Se resta el mínimo de cada columna a todos sus elementos.', matrix: JSON.parse(JSON.stringify(C)) });

  let assignment = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Paso 3: Encontrar una asignación inicial de ceros
    const stars = findStarAssignment(C);
    const coveredCols = new Set();
    stars.forEach(star => coveredCols.add(star.col));

    steps.push({
      title: `Asignación Parcial (${stars.length}/${n})`,
      description: `Se busca una asignación óptima de ceros. ${stars.length} asignaciones encontradas.`,
      matrix: JSON.parse(JSON.stringify(C)),
      stars: stars,
    });

    if (coveredCols.size === n) {
      assignment = stars.map(s => [s.row, s.col]);
      break;
    }

    // Paso 4: Cubrir todos los ceros con el mínimo número de líneas
    let { coveredRows, coveredCols: finalCoveredCols } = coverZeros(C, stars);
    
    steps.push({
      title: 'Cubrir Ceros',
      description: `Se cubren todos los ceros con el mínimo de líneas. Líneas: ${coveredRows.size + finalCoveredCols.size}.`,
      matrix: JSON.parse(JSON.stringify(C)),
      stars: stars,
      coveredRows: [...coveredRows],
      coveredCols: [...finalCoveredCols],
    });

    // Paso 5: Encontrar el valor mínimo no cubierto y ajustar la matriz
    let minUncovered = Infinity;
    for (let i = 0; i < n; i++) {
      if (coveredRows.has(i)) continue;
      for (let j = 0; j < n; j++) {
        if (finalCoveredCols.has(j)) continue;
        minUncovered = Math.min(minUncovered, C[i][j]);
      }
    }

    if (minUncovered === Infinity) {
      throw new Error("No se puede mejorar la asignación. El grafo podría no ser completo.");
    }

    // Restar de los no cubiertos
    for (let i = 0; i < n; i++) {
      if (!coveredRows.has(i)) {
        for (let j = 0; j < n; j++) {
          if (!finalCoveredCols.has(j)) {
            C[i][j] -= minUncovered;
          }
        }
      }
    }

    // Sumar en las intersecciones
    for (const i of coveredRows) {
      for (const j of finalCoveredCols) {
        C[i][j] += minUncovered;
      }
    }

    steps.push({
      title: 'Ajuste de Matriz',
      description: `Se resta el mínimo no cubierto (${minUncovered}) de los elementos no cubiertos y se suma a las intersecciones.`,
      matrix: JSON.parse(JSON.stringify(C)),
    });
  }

  steps.push({
    title: `Resultado Final`,
    description: `Se encontró una asignación óptima con ${assignment.length} emparejamientos.`,
    matrix: JSON.parse(JSON.stringify(C)),
    stars: assignment.map(([row, col]) => ({ row, col })),
    isFinal: true,
  });

  return assignment;
}

function findStarAssignment(matrix) {
  const n = matrix.length;
  const stars = [];
  const rowStars = new Array(n).fill(-1);
  const colStars = new Array(n).fill(-1);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (matrix[i][j] === 0 && rowStars[i] === -1 && colStars[j] === -1) {
        stars.push({ row: i, col: j });
        rowStars[i] = j;
        colStars[j] = i;
      }
    }
  }
  return stars;
}

function coverZeros(matrix, stars) {
  const n = matrix.length;
  const coveredCols = new Set(stars.map(s => s.col));
  const coveredRows = new Set();

  let changed = true;
  // eslint-disable-next-line no-constant-condition
  while (changed) {
    changed = false;
    // Marcar filas sin asignación
    const unmarkedRows = new Set();
    const rowStars = new Map(stars.map(s => [s.row, s.col]));
    for (let i = 0; i < n; i++) {
      if (!rowStars.has(i)) {
        unmarkedRows.add(i);
      }
    }

    const markedRows = new Set();
    const markedCols = new Set();

    // Marcar filas sin asignación
    for (let i = 0; i < n; i++) {
      if (!rowStars.has(i)) markedRows.add(i);
    }

    let newMark = true;
    // eslint-disable-next-line no-constant-condition
    while (newMark) {
      newMark = false;
      // Marcar columnas con ceros en filas marcadas
      for (const i of markedRows) {
        for (let j = 0; j < n; j++) {
          if (matrix[i][j] === 0 && !markedCols.has(j)) {
            markedCols.add(j);
            newMark = true;
          }
        }
      }

      // Marcar filas con asignaciones en columnas marcadas
      const colStars = new Map(stars.map(s => [s.col, s.row]));
      for (const j of markedCols) {
        if (colStars.has(j)) {
          const i = colStars.get(j);
          if (!markedRows.has(i)) {
            markedRows.add(i);
            newMark = true;
          }
        }
      }
    }

    // Las líneas de cobertura son las filas NO marcadas y las columnas SÍ marcadas.
    for (let i = 0; i < n; i++) {
      if (!markedRows.has(i)) {
        coveredRows.add(i);
      }
    }
    return { coveredRows, coveredCols: markedCols };
  }

  return { coveredRows, coveredCols };
}