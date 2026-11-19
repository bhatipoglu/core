import { any_circuit_element } from "circuit-json"
import { RootCircuit } from "lib/RootCircuit"
import "lib/register-catalogue"

for (const layer of ["top", "bottom"] as const) {
  const circuit = new RootCircuit()
  circuit.add(
    <board
      width={14}
      height={10}
      routingDisabled
      schematicDisabled
      defaultSolderPasteMargin={0}
    >
      <chip
        name="U1"
        layer={layer}
        manufacturerPartNumber="TLV75533PDBVR"
        pcbRotation={90}
        pinLabels={{
          pin1: "IN",
          pin2: "GND",
          pin3: "EN",
          pin4: "NC",
          pin5: "OUT",
        }}
        noConnect={["NC"]}
        pinAttributes={{
          IN: { requiresPower: true },
          GND: { requiresGround: true },
        }}
        connections={{
          IN: "net.VIN",
          EN: "net.VIN",
          GND: "net.GND",
          OUT: "net.V3V3",
        }}
        footprint={
          <footprint>
            <smtpad
              shape="rect"
              width={0.6}
              height={1.1}
              pcbX={-0.95}
              pcbY={-1.3}
              portHints={["1"]}
              noSolderPaste
            />
            <smtpad
              shape="rect"
              width={0.6}
              height={1.1}
              pcbX={0}
              pcbY={-1.3}
              portHints={["2"]}
              noSolderPaste
            />
            <smtpad
              shape="rect"
              width={0.6}
              height={1.1}
              pcbX={0.95}
              pcbY={-1.3}
              portHints={["3"]}
              noSolderPaste
            />
            <smtpad
              shape="rect"
              width={0.6}
              height={1.1}
              pcbX={0.95}
              pcbY={1.3}
              portHints={["4"]}
              noSolderPaste
            />
            <smtpad
              shape="rect"
              width={0.6}
              height={1.1}
              pcbX={-0.95}
              pcbY={1.3}
              portHints={["5"]}
              noSolderPaste
            />
            <solderpaste
              shape="rect"
              width={1.1}
              height={0.6}
              pcbX={-0.95}
              pcbY={-1.3}
              pcbRotation={90}
            />
            <solderpaste
              shape="rect"
              width={1.1}
              height={0.6}
              pcbX={0}
              pcbY={-1.3}
              pcbRotation={90}
            />
            <solderpaste
              shape="rect"
              width={1.1}
              height={0.6}
              pcbX={0.95}
              pcbY={-1.3}
              pcbRotation={90}
            />
            <solderpaste
              shape="rect"
              width={1.1}
              height={0.6}
              pcbX={0.95}
              pcbY={1.3}
              pcbRotation={90}
            />
            <solderpaste
              shape="rect"
              width={1.1}
              height={0.6}
              pcbX={-0.95}
              pcbY={1.3}
              pcbRotation={90}
            />
            <courtyardrect width={3.4} height={4.2} />
            <silkscreenrect width={2.8} height={1.3} strokeWidth={0.1} />
            <silkscreencircle radius={0.1} pcbX={-0.95} pcbY={-0.4} />
          </footprint>
        }
      />
      <capacitor
        name="CIN"
        layer={layer}
        capacitance="1uF"
        footprint="0402"
        pcbX={-3.2}
        connections={{ pin1: "net.VIN", pin2: "net.GND" }}
      />
      <capacitor
        name="COUT"
        layer={layer}
        capacitance="1uF"
        footprint="0402"
        pcbX={3.2}
        connections={{ pin1: "net.V3V3", pin2: "net.GND" }}
      />
      <pcbnotetext
        text="Imported TLV75533 oval stencil"
        pcbY={3.8}
        fontSize={0.45}
      />
      <pcbnotetext
        text="U1: five custom oval paste openings"
        pcbY={-3.6}
        fontSize={0.3}
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  const regulator = circuit.selectOne(".U1")!
  const fixture = circuit.getCircuitJson().map((element) => {
    if (
      element.type !== "pcb_solder_paste" ||
      element.pcb_component_id !== regulator.pcb_component_id
    )
      return element
    if (element.shape !== "rotated_rect" && element.shape !== "rect") {
      throw new Error("Expected the regulator's rectangular stencil openings")
    }
    if (element.shape === "rect") return { ...element, shape: "oval" }
    if (Math.abs(element.ccw_rotation % 180) > 1e-8) {
      throw new Error(
        "The reference stencil must be aligned with the board axes",
      )
    }
    const { ccw_rotation, ...aperture } = element
    return { ...aperture, shape: "oval" }
  })
  const validated = any_circuit_element.array().parse(fixture)
  await Bun.write(
    new URL(`./${layer}.circuit.json`, import.meta.url),
    `${JSON.stringify(validated, null, 2)}\n`,
  )
}
