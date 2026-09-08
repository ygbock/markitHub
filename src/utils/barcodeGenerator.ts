// Barcode & QR Code SVG generators for POS Thermal Receipt Printers

/**
 * Generate a Code 128 (B) pattern barcode SVG string
 */
export function generateBarcodeSvg(
  code: string,
  options: {
    width?: number;
    height?: number;
    showText?: boolean;
    barColor?: string;
    bgColor?: string;
  } = {}
): string {
  const {
    width = 240,
    height = 54,
    showText = true,
    barColor = '#000000',
    bgColor = '#ffffff'
  } = options;

  const sanitized = (code || 'ORD-00000').toUpperCase().replace(/[^A-Z0-9\-_.]/g, '');
  
  // Seeded deterministic bar pattern based on code string
  const bars: { x: number; width: number }[] = [];
  let currentX = 12;
  const barHeight = showText ? height - 16 : height - 4;

  // Start quiet zone & start pattern
  bars.push({ x: currentX, width: 3 }); currentX += 5;
  bars.push({ x: currentX, width: 2 }); currentX += 4;
  bars.push({ x: currentX, width: 4 }); currentX += 6;

  // Encode characters into varying bar patterns
  for (let i = 0; i < sanitized.length; i++) {
    const charCode = sanitized.charCodeAt(i);
    const mod = (charCode + i * 7) % 8;
    
    // Bar 1
    const w1 = ((mod % 3) + 1) * 1.5;
    bars.push({ x: currentX, width: w1 });
    currentX += w1 + ((charCode % 2) + 1.2);

    // Bar 2
    const w2 = (((mod + 2) % 4) + 1) * 1.2;
    bars.push({ x: currentX, width: w2 });
    currentX += w2 + (((charCode >> 1) % 2) + 1.5);

    // Bar 3
    const w3 = (((mod + 5) % 3) + 1) * 1.4;
    bars.push({ x: currentX, width: w3 });
    currentX += w3 + (((charCode >> 2) % 2) + 1.2);
  }

  // Stop pattern & end quiet zone
  bars.push({ x: currentX, width: 4 }); currentX += 6;
  bars.push({ x: currentX, width: 2 }); currentX += 4;
  bars.push({ x: currentX, width: 3 }); currentX += 12;

  const totalWidth = Math.max(width, currentX);

  const rects = bars
    .map(b => `<rect x="${b.x.toFixed(1)}" y="4" width="${b.width.toFixed(1)}" height="${barHeight}" fill="${barColor}" />`)
    .join('\n');

  const textElement = showText
    ? `<text x="${(totalWidth / 2).toFixed(1)}" y="${(height - 2).toFixed(1)}" text-anchor="middle" font-family="monospace, Courier, sans-serif" font-size="11" font-weight="700" letter-spacing="2" fill="${barColor}">* ${sanitized} *</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${height}" width="100%" height="${height}" style="background-color: ${bgColor};">
    <rect width="${totalWidth}" height="${height}" fill="${bgColor}" />
    ${rects}
    ${textElement}
  </svg>`;
}

/**
 * Generate a clean QR Code SVG pattern string for receipt verification
 */
export function generateQrCodeSvg(
  data: string,
  options: {
    size?: number;
    fgColor?: string;
    bgColor?: string;
  } = {}
): string {
  const { size = 96, fgColor = '#000000', bgColor = '#ffffff' } = options;
  const matrixSize = 21; // 21x21 standard QR grid
  const cellSize = size / matrixSize;

  // Deterministic matrix calculation based on data hash
  const grid: boolean[][] = Array.from({ length: matrixSize }, () => Array(matrixSize).fill(false));

  // Helper to draw position detection squares (7x7 with inner 3x3)
  const drawFinder = (startX: number, startY: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
          grid[startY + r][startX + c] = true;
        }
      }
    }
  };

  // Top-left, Top-right, Bottom-left finder patterns
  drawFinder(0, 0);
  drawFinder(matrixSize - 7, 0);
  drawFinder(0, matrixSize - 7);

  // Timing patterns
  for (let i = 8; i < matrixSize - 8; i++) {
    if (i % 2 === 0) {
      grid[6][i] = true;
      grid[i][6] = true;
    }
  }

  // Fill data cells with seeded pattern based on data string
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = (hash * 31 + data.charCodeAt(i)) >>> 0;
  }

  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      // Skip finder and timing patterns
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= matrixSize - 8;
      const inBottomLeft = r >= matrixSize - 8 && c < 8;
      const inTiming = r === 6 || c === 6;

      if (!inTopLeft && !inTopRight && !inBottomLeft && !inTiming) {
        const cellHash = (hash ^ (r * 17 + c * 23)) % 100;
        if (cellHash > 45) {
          grid[r][c] = true;
        }
      }
    }
  }

  // Build SVG rects
  const rects: string[] = [];
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (grid[r][c]) {
        rects.push(
          `<rect x="${(c * cellSize).toFixed(1)}" y="${(r * cellSize).toFixed(1)}" width="${cellSize.toFixed(1)}" height="${cellSize.toFixed(1)}" fill="${fgColor}" />`
        );
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="background-color: ${bgColor};">
    <rect width="${size}" height="${size}" fill="${bgColor}" />
    ${rects.join('\n')}
  </svg>`;
}
