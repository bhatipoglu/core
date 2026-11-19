import { beforeAll, expect, test } from "bun:test"
import { any_circuit_element } from "circuit-json"
import { getTestFixture } from "tests/fixtures/get-test-fixture"
import bottomJson from "./assets/tlv75533-oval-paste/bottom.circuit.json"
import topJson from "./assets/tlv75533-oval-paste/top.circuit.json"

const { circuit } = getTestFixture()
const regulators = [
  {
    name: "TOP",
    json: any_circuit_element.array().parse(topJson),
    x: -9,
    layer: "top",
  },
  {
    name: "BOTTOM",
    json: any_circuit_element.array().parse(bottomJson),
    x: 9,
    layer: "bottom",
  },
] as const

beforeAll(async () => {
  circuit.add(
    <board
      width={36}
      height={20}
      defaultSolderPasteMargin={0}
      routingDisabled
      schematicDisabled
    >
      {regulators.map((regulator) => (
        <subcircuit
          key={regulator.name}
          name={regulator.name}
          pcbX={regulator.x}
          pcbY={1}
          pcbRotation={90}
          _subcircuitCachingEnabled
        >
          <subcircuit name="ANGLED" pcbRotation={35} _subcircuitCachingEnabled>
            <subcircuit name="REGULATOR" circuitJson={regulator.json} />
          </subcircuit>
        </subcircuit>
      ))}
      <pcbnotetext
        text="Nested cached oval imports: 125 degrees, top / bottom"
        pcbY={-8}
        fontSize={0.6}
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  await expect(circuit).toMatchPcbSnapshot(import.meta.path, {
    showSolderPaste: true,
  })
})

test.failing(
  "oblique oval contours survive a second cached import on both layers",
  () => {
    expect(circuit.cachedSubcircuits?.size).toBeGreaterThanOrEqual(4)
    for (const regulator of regulators) {
      const chip = circuit.selectOne(`.${regulator.name} .U1`)!
      const apertures = circuit.db.pcb_solder_paste
        .list()
        .filter((paste) => paste.pcb_component_id === chip.pcb_component_id)
      const pads = circuit.db.pcb_smtpad
        .list()
        .filter((pad) => pad.pcb_component_id === chip.pcb_component_id)
      expect(apertures).toHaveLength(5)
      for (const aperture of apertures) {
        expect(aperture.shape).toBe("polygon")
        if (aperture.shape !== "polygon")
          throw new Error("Expected an oval contour")
        expect(aperture.layer).toBe(regulator.layer)
        expect(aperture.points).toHaveLength(64)
        const center = {
          x:
            aperture.points.reduce((sum, point) => sum + point.x, 0) /
            aperture.points.length,
          y:
            aperture.points.reduce((sum, point) => sum + point.y, 0) /
            aperture.points.length,
        }
        const pad = pads.find(
          (pad) =>
            "x" in pad && Math.hypot(pad.x - center.x, pad.y - center.y) < 1e-7,
        )
        expect(pad).toBeDefined()
        const distances = aperture.points.map((point) =>
          Math.hypot(point.x - center.x, point.y - center.y),
        )
        expect(Math.min(...distances)).toBeCloseTo(0.3, 7)
        expect(Math.max(...distances)).toBeCloseTo(0.55, 7)
      }
    }
  },
)
