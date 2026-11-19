import { beforeAll, expect, test } from "bun:test"
import { any_circuit_element } from "circuit-json"
import { getTestFixture } from "tests/fixtures/get-test-fixture"
import regulatorJson from "./assets/tlv75533-oval-paste/top.circuit.json"

const { circuit } = getTestFixture()

beforeAll(async () => {
  await expect(regulatorJson).toMatchPcbSnapshot(
    import.meta.path.replace(".test.tsx", "-source.test.tsx"),
    { showSolderPaste: true },
  )
  circuit.add(
    <board
      width={14}
      height={10}
      defaultSolderPasteMargin={0}
      routingDisabled
      schematicDisabled
    >
      <pcbnotetext
        text="Imported TLV75533: five oval paste openings on U1"
        pcbY={3.8}
        fontSize={0.4}
      />
      <subcircuit
        name="REGULATOR"
        circuitJson={any_circuit_element.array().parse(regulatorJson)}
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  await expect(circuit).toMatchPcbSnapshot(import.meta.path, {
    showSolderPaste: true,
  })
})

test.failing("import retains the regulator's oval stencil openings", () => {
  const regulator = circuit.selectOne(".REGULATOR .U1")!
  const apertures = circuit.db.pcb_solder_paste
    .list()
    .filter((paste) => paste.pcb_component_id === regulator.pcb_component_id)
  expect(apertures).toHaveLength(5)
  for (const aperture of apertures) {
    expect(aperture).toMatchObject({
      shape: "oval",
      width: 1.1,
      height: 0.6,
      layer: "top",
    })
  }
})
