import type { PcbSolderPasteOval, PcbSolderPastePolygon } from "circuit-json"
import { type Matrix, applyToPoint } from "transformation-matrix"

/**
 * Transforms ellipse geometry between right-handed PCB frames (+X right, +Y top,
 * +Z above, mm). The center and contour vertices are points, including translation.
 * Axis-aligned results retain native ovals; other orientations need a contour
 * because Circuit JSON's oval record cannot carry a rotation.
 */
export function transformPcbSolderPasteOval(
  aperture: Pick<PcbSolderPasteOval, "x" | "y" | "width" | "height">,
  transform: Matrix,
):
  | Pick<PcbSolderPasteOval, "shape" | "x" | "y" | "width" | "height">
  | Pick<PcbSolderPastePolygon, "shape" | "points"> {
  const center = applyToPoint(transform, aperture)
  if (Math.abs(transform.b) < 1e-8 && Math.abs(transform.c) < 1e-8) {
    return {
      shape: "oval",
      ...center,
      width: Math.abs(transform.a) * aperture.width,
      height: Math.abs(transform.d) * aperture.height,
    }
  }
  if (Math.abs(transform.a) < 1e-8 && Math.abs(transform.d) < 1e-8) {
    return {
      shape: "oval",
      ...center,
      width: Math.abs(transform.c) * aperture.height,
      height: Math.abs(transform.b) * aperture.width,
    }
  }
  return {
    shape: "polygon",
    points: Array.from({ length: 64 }, (_, vertexIndex) => {
      const angle = (vertexIndex * 2 * Math.PI) / 64
      return applyToPoint(transform, {
        x: aperture.x + (aperture.width / 2) * Math.cos(angle),
        y: aperture.y + (aperture.height / 2) * Math.sin(angle),
      })
    }),
  }
}
