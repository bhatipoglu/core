import { getBoundsFromPoints } from "@tscircuit/math-utils"
import { type SolderPasteProps, solderPasteProps } from "@tscircuit/props"
import type {
  AnyCircuitElement,
  PcbSolderPaste,
  PcbSolderPasteCircle,
  PcbSolderPasteOval,
  PcbSolderPastePolygon,
  PcbSolderPasteRect,
  PcbSolderPasteRotatedRect,
} from "circuit-json"
import { transformPcbSolderPasteOval } from "lib/utils/pcb/transform-pcb-solder-paste-oval"
import { applyToPoint, decomposeTSR, translate } from "transformation-matrix"
import { PrimitiveComponent } from "../base-components/PrimitiveComponent"

type PcbSolderPasteId = PcbSolderPaste["pcb_solder_paste_id"]
type StandalonePcbSolderPaste =
  | PcbSolderPasteCircle
  | PcbSolderPasteRect
  | PcbSolderPasteRotatedRect
  | PcbSolderPasteOval
  | PcbSolderPastePolygon

export const isStandalonePcbSolderPaste = (
  element: AnyCircuitElement,
): element is StandalonePcbSolderPaste =>
  element.type === "pcb_solder_paste" &&
  !element.pcb_smtpad_id &&
  (element.shape === "circle" ||
    element.shape === "rect" ||
    element.shape === "rotated_rect" ||
    element.shape === "oval" ||
    element.shape === "polygon")

/**
 * Emits independent paste apertures in the right-handed board-world PCB frame:
 * +X right, +Y top, +Z above the board, in mm. Centers are points, so parent
 * translation, rotation and footprint reflection all apply.
 */
export class SolderPaste extends PrimitiveComponent<typeof solderPasteProps> {
  pcb_solder_paste_id: PcbSolderPasteId | null = null
  isPcbPrimitive = true
  private importedOval = false
  private importedPolygon?: Pick<PcbSolderPastePolygon, "points" | "holes">

  /**
   * Reconstruct an aperture already in its parent's local PCB frame (+X right,
   * +Y top, +Z above, right-handed, mm). Its center is a point and its rotation
   * is in CCW degrees; coordinate transforms happen before this import.
   */
  static fromCircuitJson(aperture: StandalonePcbSolderPaste): SolderPaste {
    if (aperture.shape === "polygon") {
      const bounds = getBoundsFromPoints(aperture.points)!
      const center = {
        x: (bounds.minX + bounds.maxX) / 2,
        y: (bounds.minY + bounds.maxY) / 2,
      }
      const toApertureLocal = translate(-center.x, -center.y)
      const paste = new SolderPaste({
        shape: "rect",
        width: bounds.maxX - bounds.minX,
        height: bounds.maxY - bounds.minY,
        pcbX: center.x,
        pcbY: center.y,
        layer: aperture.layer,
      })
      paste.importedPolygon = {
        points: aperture.points.map((point) =>
          applyToPoint(toApertureLocal, point),
        ),
        holes: aperture.holes?.map((hole) =>
          hole.map((point) => applyToPoint(toApertureLocal, point)),
        ),
      }
      return paste
    }
    const placement = {
      pcbX: aperture.x,
      pcbY: aperture.y,
      layer: aperture.layer,
    }
    let props: SolderPasteProps
    if (aperture.shape === "circle") {
      props = { ...placement, shape: "circle", radius: aperture.radius }
    } else {
      props = {
        ...placement,
        shape: "rect",
        width: aperture.width,
        height: aperture.height,
        pcbRotation:
          aperture.shape === "rotated_rect" ? aperture.ccw_rotation : undefined,
      }
    }
    const paste = new SolderPaste(props)
    paste.importedOval = aperture.shape === "oval"
    return paste
  }

  get config() {
    return { componentName: "SolderPaste", zodProps: solderPasteProps }
  }

  getPcbSize() {
    const props = this._parsedProps
    if (props.shape === "circle") {
      return { width: props.radius * 2, height: props.radius * 2 }
    }
    return { width: props.width, height: props.height }
  }

  doInitialPcbPrimitiveRender(): void {
    if (this.root?.pcbDisabled) return
    const { db } = this.root!
    const props = this._parsedProps
    const authoredLayer = props.layer ?? "top"
    if (authoredLayer !== "top" && authoredLayer !== "bottom") {
      throw new Error(
        `Invalid layer "${authoredLayer}" for SolderPaste. Must be "top" or "bottom".`,
      )
    }

    // Use PrimitiveComponent's paired placement/side resolution, as for
    // PcbSoldermaskOpening. Do not reconstruct the footprint's transform.
    const transform = this._computePcbGlobalTransformBeforeLayout()
    const { maybeFlipLayer, isFlipped } = this._getPcbPrimitiveFlippedHelpers()
    const center = applyToPoint(transform, { x: 0, y: 0 })
    // Remove the horizontal reflection when decomposing. A centered rectangle
    // is invariant under that reflection, while its world rotation is not.
    const rotation =
      (decomposeTSR(transform, false, isFlipped).rotation.angle * 180) / Math.PI
    const base = {
      layer: maybeFlipLayer(authoredLayer) as "top" | "bottom",
      pcb_component_id:
        this.parent?.pcb_component_id ??
        this.getPrimitiveContainer()?.pcb_component_id ??
        undefined,
      pcb_group_id: this.getGroup()?.pcb_group_id ?? undefined,
      subcircuit_id: this.getSubcircuit().subcircuit_id ?? undefined,
    }
    let aperture: PcbSolderPaste
    if (this.importedPolygon) {
      aperture = db.pcb_solder_paste.insert({
        ...base,
        shape: "polygon",
        points: this.importedPolygon.points.map((point) =>
          applyToPoint(transform, point),
        ),
        holes: this.importedPolygon.holes?.map((hole) =>
          hole.map((point) => applyToPoint(transform, point)),
        ),
      })
    } else if (this.importedOval && props.shape === "rect") {
      aperture = db.pcb_solder_paste.insert({
        ...base,
        ...transformPcbSolderPasteOval(
          { x: 0, y: 0, width: props.width, height: props.height },
          transform,
        ),
      })
    } else if (props.shape === "circle") {
      aperture = db.pcb_solder_paste.insert({
        ...base,
        ...center,
        shape: "circle",
        radius: props.radius,
      })
    } else if (Math.abs(rotation) < 1e-8) {
      aperture = db.pcb_solder_paste.insert({
        ...base,
        ...center,
        shape: "rect",
        width: props.width,
        height: props.height,
      })
    } else {
      aperture = db.pcb_solder_paste.insert({
        ...base,
        ...center,
        shape: "rotated_rect",
        ccw_rotation: rotation,
        width: props.width,
        height: props.height,
      })
    }
    this.pcb_solder_paste_id = aperture.pcb_solder_paste_id
  }

  _moveCircuitJsonElements({
    deltaX,
    deltaY,
  }: { deltaX: number; deltaY: number }): void {
    if (!this.pcb_solder_paste_id) return
    const { db } = this.root!
    const aperture = db.pcb_solder_paste.get(this.pcb_solder_paste_id)!
    const movement = translate(deltaX, deltaY)
    db.pcb_solder_paste.update(
      this.pcb_solder_paste_id,
      aperture.shape === "polygon"
        ? {
            points: aperture.points.map((point) =>
              applyToPoint(movement, point),
            ),
            holes: aperture.holes?.map((hole) =>
              hole.map((point) => applyToPoint(movement, point)),
            ),
          }
        : { x: aperture.x + deltaX, y: aperture.y + deltaY },
    )
  }

  removePcbPrimitiveRender(): void {
    if (!this.pcb_solder_paste_id) return
    this.root!.db.pcb_solder_paste.delete(this.pcb_solder_paste_id)
    this.pcb_solder_paste_id = null
  }
}
