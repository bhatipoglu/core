# Native A64 fixed-trace handoff

This is the same real A64 CPU/DDR board used in [autorouter #3698](https://github.com/tscircuit/tscircuit-autorouter/pull/3698).

The input was captured from Core `fb7f456de0a867c7074a9f196597992e0d1253b9` immediately before `withFixedTraces()` handles the remaining routing phase. It contains all 607 physical obstacles, the exact 32 completed byte routes, and the 43 remaining connections. No pads, route points, nets, clearances, or search limits were edited.

Source: [native DDR benchmark](https://github.com/ShiboSoftwareDev/core-ddr-benchmark/tree/24dc44c166d4258c3538f8b1f66953f1b6f58690), `circuits/a64.json.gz` rendered by `NativeDdrBoard` through Core. [Capture run](https://github.com/tscircuit/core/actions/runs/44468075871).

The test applies Core's normal fixed-trace handoff, advances Pipeline9 through its existing preload stage, and snapshots the actual input copper. Before the fix, 32 routes disappear into 3,315 additional obstacles and the graph loads zero traces.
