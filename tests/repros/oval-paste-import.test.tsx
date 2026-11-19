import { beforeAll, expect, test } from "bun:test"
import { any_circuit_element } from "circuit-json"
import { getTestFixture } from "tests/fixtures/get-test-fixture"
import usbFootprint from "./assets/usb1046/footprint.circuit.json"

const { circuit } = getTestFixture({
  platform: {
    placementDrcChecksDisabled: true,
    resolveProjectStaticFileImportUrl: async () =>
      "https://example.com/USB_A_Receptacle_GCT_USB1046.kicad_mod",
    footprintFileParserMap: {
      kicad_mod: {
        loadFromUrl: async () => ({
          footprintCircuitJson: any_circuit_element.array().parse(usbFootprint),
        }),
      },
    },
  },
})

beforeAll(async () => {
  circuit.add(
    <board width={22} height={26} schematicDisabled>
      <connector
        name="J1"
        manufacturerPartNumber="USB1046"
        isSmt={false}
        noConnect={["SHIELD"]}
        pcbY={-7.55}
        footprint="./USB_A_Receptacle_GCT_USB1046.kicad_mod"
        pinLabels={{
          pin1: "VBUS",
          pin2: "DM",
          pin3: "DP",
          pin4: "GND",
          pin5: "SHIELD",
        }}
      />
      <pinheader
        name="J2"
        pinCount={4}
        pcbY={6}
        pinLabels={["VBUS", "DM", "DP", "GND"]}
      />
      <trace from="J1.pin1" to="J2.pin1" pcbPath={[]} />
      <trace from="J1.pin2" to="J2.pin2" pcbPath={[]} />
      <trace from="J1.pin3" to="J2.pin3" pcbPath={[]} />
      <trace from="J1.pin4" to="J2.pin4" pcbPath={[]} />
      <pcbnotetext
        text="USB1046 breakout: retain both mounting-tab paste openings"
        pcbY={11}
        fontSize={0.45}
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  expect(circuit.db.pcb_trace.list()).toHaveLength(4)
  expect(
    circuit
      .getCircuitJson()
      .filter((element) => element.type.endsWith("error")),
  ).toEqual([])
  await expect(circuit).toMatchPcbSnapshot(import.meta.path, {
    showSolderPaste: false,
    showFabricationNotes: false,
  })
  const stencil = circuit
    .getCircuitJson()
    .filter((element) =>
      [
        "pcb_board",
        "pcb_solder_paste",
        "pcb_silkscreen_path",
        "pcb_silkscreen_text",
        "pcb_note_text",
      ].includes(element.type),
    )
  await expect(stencil).toMatchPcbSnapshot(
    import.meta.path.replace(".test.tsx", "-stencil.test.tsx"),
    {
      showSolderPaste: true,
      showFabricationNotes: false,
    },
  )
})

test.failing("USB1046 import retains both mounting-tab paste apertures", () => {
  const connector = circuit.selectOne(".J1")!
  const apertures = circuit.db.pcb_solder_paste
    .list()
    .filter(
      (paste) =>
        paste.pcb_component_id === connector.pcb_component_id &&
        paste.shape === "oval",
    )
  expect(apertures).toHaveLength(2)
  expect(apertures).toEqual([
    expect.objectContaining({
      shape: "oval",
      x: -6.4,
      y: expect.closeTo(-4, 7),
      width: 1.2,
      height: 2.9,
      layer: "top",
    }),
    expect.objectContaining({
      shape: "oval",
      x: 6.4,
      y: expect.closeTo(-4, 7),
      width: 1.2,
      height: 2.9,
      layer: "top",
    }),
  ])
})
