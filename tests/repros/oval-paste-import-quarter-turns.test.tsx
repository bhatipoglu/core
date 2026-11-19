import { beforeAll, expect, test } from "bun:test"
import { any_circuit_element } from "circuit-json"
import { getTestFixture } from "tests/fixtures/get-test-fixture"
import bottomJson from "./assets/tlv75533-oval-paste/bottom.circuit.json"
import topJson from "./assets/tlv75533-oval-paste/top.circuit.json"

const top = any_circuit_element.array().parse(topJson)
const bottom = any_circuit_element.array().parse(bottomJson)
const placements = [
  {
    name: "TOP_0",
    json: top,
    layer: "top",
    rotation: 0,
    x: -24,
    y: 9,
    width: 1.1,
    height: 0.6,
  },
  {
    name: "TOP_90",
    json: top,
    layer: "top",
    rotation: 90,
    x: -8,
    y: 9,
    width: 0.6,
    height: 1.1,
  },
  {
    name: "TOP_180",
    json: top,
    layer: "top",
    rotation: 180,
    x: 8,
    y: 9,
    width: 1.1,
    height: 0.6,
  },
  {
    name: "TOP_270",
    json: top,
    layer: "top",
    rotation: 270,
    x: 24,
    y: 9,
    width: 0.6,
    height: 1.1,
  },
  {
    name: "BOTTOM_0",
    json: bottom,
    layer: "bottom",
    rotation: 0,
    x: -24,
    y: -9,
    width: 1.1,
    height: 0.6,
  },
  {
    name: "BOTTOM_90",
    json: bottom,
    layer: "bottom",
    rotation: 90,
    x: -8,
    y: -9,
    width: 0.6,
    height: 1.1,
  },
  {
    name: "BOTTOM_180",
    json: bottom,
    layer: "bottom",
    rotation: 180,
    x: 8,
    y: -9,
    width: 1.1,
    height: 0.6,
  },
  {
    name: "BOTTOM_270",
    json: bottom,
    layer: "bottom",
    rotation: 270,
    x: 24,
    y: -9,
    width: 0.6,
    height: 1.1,
  },
] as const
const { circuit } = getTestFixture()

beforeAll(async () => {
  circuit.add(
    <board
      width={66}
      height={34}
      defaultSolderPasteMargin={0}
      routingDisabled
      schematicDisabled
    >
      {placements.map((placement) => (
        <subcircuit
          key={placement.name}
          name={placement.name}
          pcbX={placement.x}
          pcbY={placement.y}
          pcbRotation={placement.rotation}
          circuitJson={placement.json}
        />
      ))}
      <pcbnotetext
        text="Oval imports: 0 / 90 / 180 / 270 degrees; top above, bottom below"
        pcbY={16}
        fontSize={0.65}
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  await expect(circuit).toMatchPcbSnapshot(import.meta.path, {
    showSolderPaste: true,
  })
})

test.failing(
  "oval imports follow their copper on both layers at every quarter turn",
  () => {
    for (const placement of placements) {
      const regulator = circuit.selectOne(`.${placement.name} .U1`)!
      const apertures = circuit.db.pcb_solder_paste
        .list()
        .filter(
          (paste) => paste.pcb_component_id === regulator.pcb_component_id,
        )
      const pads = circuit.db.pcb_smtpad
        .list()
        .filter((pad) => pad.pcb_component_id === regulator.pcb_component_id)
      expect(apertures).toHaveLength(5)
      for (const aperture of apertures) {
        expect(aperture.shape).toBe("oval")
        if (aperture.shape !== "oval")
          throw new Error("Expected an oval aperture")
        expect(aperture.width).toBeCloseTo(placement.width, 7)
        expect(aperture.height).toBeCloseTo(placement.height, 7)
        expect(aperture.layer).toBe(placement.layer)
        const pad = pads.find(
          (pad) =>
            "x" in pad &&
            Math.hypot(pad.x - aperture.x, pad.y - aperture.y) < 1e-7,
        )
        expect(pad).toBeDefined()
      }
    }
  },
)
