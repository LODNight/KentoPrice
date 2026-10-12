// Test SVG notch path generation
function generateNotchPath(width = 390, height = 65, cutoutR = 35, cornerR = 12) {
  const center = width / 2;
  const startX = center - cutoutR - cornerR;
  const endX = center + cutoutR + cornerR;
  const depth = cutoutR; // depth of the scoop

  // M 0 0
  // L startX 0
  // C (startX + cornerR * 0.5) 0, (center - cutoutR) (depth * 0.15), (center - cutoutR * 0.8) (depth * 0.5)
  // C (center - cutoutR * 0.4) depth, (center + cutoutR * 0.4) depth, (center + cutoutR * 0.8) (depth * 0.5)
  // C (center + cutoutR) (depth * 0.15), (endX - cornerR * 0.5) 0, endX 0
  // L width 0
  // L width height
  // L 0 height
  // Z
  console.log(`startX: ${startX}, endX: ${endX}, depth: ${depth}`);
}
generateNotchPath();
