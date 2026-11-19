import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { gunzipSync } from "node:zlib"
import {
  AutoroutingPipelineSolver9_PreloadedTraceGraph,
  convertSrjToGraphicsObject,
  type SimpleRouteJson as AutorouterSimpleRouteJson,
} from "@tscircuit/capacity-autorouter"
import {
  getSvgFromGraphicsObject,
  stackGraphicsHorizontally,
} from "graphics-debug"
import type { SimpleRouteJson } from "lib/utils/autorouting/SimpleRouteJson"
import { withFixedTraces } from "lib/utils/autorouting/with-fixed-traces"

test("A64 saved byte routes reach the next phase as fixed copper", async () => {
  const input: SimpleRouteJson = JSON.parse(
    gunzipSync(
      readFileSync(
        new URL(
          "../fixtures/a64-fixed-trace-handoff.srj.json.gz",
          import.meta.url,
        ),
      ),
    ).toString("utf8"),
  )
  const fixedTraceIds = new Set(
    input.traces!.map((trace) => trace.pcb_trace_id),
  )
  const srj = withFixedTraces(input, fixedTraceIds)
  const solver = new AutoroutingPipelineSolver9_PreloadedTraceGraph(
    srj as AutorouterSimpleRouteJson,
    { cacheProvider: null },
  )
  while (!solver.preloadedTraceGraphSolver?.solved && !solver.failed) {
    solver.step()
  }

  expect(solver.failed).toBe(false)
  const preloadedTraceCount =
    solver.preloadedTraceGraphSolver!.stats.preloadedTraceCount
  const graphics = convertSrjToGraphicsObject(srj as AutorouterSimpleRouteJson)
  await expect(
    getSvgFromGraphicsObject(
      stackGraphicsHorizontally([graphics], {
        titles: [
          `A64 | ${preloadedTraceCount} saved traces loaded | ${srj.obstacles.length} obstacles`,
        ],
      }),
      { backgroundColor: "white" },
    ),
  ).toMatchSvgSnapshot(import.meta.path)
})
