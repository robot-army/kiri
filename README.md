# KiCad Revision Inspector (KiRI)

KiRI started as an experiment for visual diffs of KiCad projects (schematics and PCB layouts).
It has since grown into a practical review tool for commit-to-commit hardware changes.

KiRI has compatibility paths for KiCad 5 through 9+, but the project is currently CI-tested on KiCad 9.

## Compatibility (current state)

- **Best-supported / CI-tested:** KiCad 9
- **Likely works:** KiCad 7-8 (uses `kicad-cli` for schematic SVG export)
- **Legacy paths still present:** KiCad 5-6 (GUI/plotgitsch fallback paths), but less tested

Internally, it uses existing tools to generate SVGs for side-by-side and overlay comparison.

When exporting schematics:

- If `kicad-cli` is available, KiRI uses it for schematic SVG export.
- KiCad 6 is installed (which does not have `kicad-cli` available), schematics are exported using [xdotool](https://github.com/jordansissel/xdotool) on Linux/Windows and [cliclick](https://github.com/BlueM/cliclick) on macOS, using the GUI. This method is far from the ideal and it is not recommended.
- KiCad 5 is installed or if the projects is based on KiCad 5, [plotkicadsch/plotgitsch](https://github.com/jnavila/plotkicadsch) are used to export the schematics.

When exporting layout layers:

- [Kicad-Diff](https://github.com/Gasman2014/KiCad-Diff) is used for all supported KiCad versions using the Python `pcbnew` library. It is also possible to use `kicad-cli`, but that is typically slower because it exports one layer at a time.

## Netlist Diff panel (logical changes)

KiRI includes a **Netlist Diff** panel that complements visual SVG diffs with logical connectivity changes:

- Changed nets with pin-level deltas (`+added`, `-removed`, unchanged count)
- Renamed nets
- Inferred **sheet renames** (collapses bulk per-net renames into one entry)
- Only-in-older / only-in-newer net groups
- Click-to-focus navigation to the affected page

### Netdiff engine support

KiRI uses `submodules/netdiff` plus `bin/kiri-netdiff-snapshot`.

- **Preferred mode:** `kicad-cli sch export netlist` (highest fidelity)
- **Fallback mode:** schematic parsing when netlist export is unavailable

Practical implication:

- On KiCad 9, netdiff is generally the most accurate (full netlist export path).
- On older versions, KiRI still runs netdiff via fallback parsing, but results can be less complete for complex hierarchical/library-resolved connectivity.


## KiRI Installation

Check the Installation instructions, [here](INSTALL.md).


## Using KiRI

KiRI can be launched with the following command, anywhere, inside or outside of the repository of the project.

```bash
kiri [OPTIONS] [KICAD_PROJECT_FILE]
```

`KICAD_PROJECT_FILE` can be passed, but it can also be omitted. If running from inside the project's repository, it will use the `.pro` or `.kicad_pro` available. If both are present (which is not good), it will ask your choice. The same happens is running outside of the repository without passing the `KICAD_PROJECT_FILE`.

Typical usage for a commit range:

```bash
kiri your-project.kicad_pro -g <older_commit>..<newer_commit> -l -r -d .kiri-test
cd .kiri-test
kiri-server --port 8877 .
```


## Command line options (aka Help)

Command line flags can be seen using the `-h` flag
```bash
kiri -h
```

## Testing and CI

KiRI now includes three CI workflows:

- Fast CI for every push/PR: [ci-fast.yml](.github/workflows/ci-fast.yml)
    - Python netdiff integration tests
    - Python syntax check for `kiri-netdiff-snapshot`
    - Shell syntax checks and `shellcheck` for new wrapper scripts
- Manual KiCad E2E workflow: [kicad-e2e.yml](.github/workflows/kicad-e2e.yml)
    - Clones a fixture project
    - Runs KiRI end-to-end
    - Uploads generated artifacts for inspection
- Manual README screenshot refresh workflow: [readme-screenshots.yml](.github/workflows/readme-screenshots.yml)
    - Regenerates selected screenshots used in README
    - Opens a PR with image updates (does not push directly to main)

Both manual workflows use pinned default fixture commits for reproducible output.

Run fast tests locally:

```bash
python tests/netdiff_integration/test_netdiff_integration.py
python tests/netdiff_integration/test_netdiff_sheet_rename.py
```

Run a local end-to-end check against a project repo:

```bash
kiri <project>.kicad_pro -g <older_commit>..<newer_commit> -l -r -d .kiri-test
```

Then open the generated report:

```bash
cd .kiri-test
kiri-server --port 8877 .
```

### Archiving generated files

There is a possibility to archive generated files (check the help above).

To visualize generated files it is not necessary to have KiRI installed. You just have to unpack the generated package and then execute the web-server script (`./kiri-server`) inside of the folder, as shown below:

```bash
tar -xvzf kiri-2021.11.18-16h39.tgz
cd kiri
./kiri-server .
```

# KiCad Integration

It is possible to integrate KiRI with PCBNew by adding a button to its toolbar with the following command:

```bash
# Create folder if it does not exist
mkdir -p "~/.kicad/scripting/plugins"

# Copy the plugin there
cd ./kiri
cp -r "./kicad/plugin/kiri_v6/" "~/.kicad/scripting/plugins/kiri"
```

# KiRI Screenshots

Browsing the schematic view walking through and comparing each page of the schematics, individually.

<p align="center">
    <img src="misc/kiri_sch.png" width="820" alt="Schematic View">
</p>

Browsing the layout view walking through and comparing each layer of the layout, individually.

<p align="center">
    <img src="misc/kiri_pcb.png" width="820" alt="Layout View">
</p>

Here is the comparison of the schematics when the project is updated from using KiCad 5 (`.sch`) to KiCad 6 (`.kicad_sch`).

<p align="center">
    <img src="misc/kicad_sch_v6.png" width="820" alt="Layout View">
</p>

Shortcuts are a really good way of walking through the commits, pages and layers quickly. Check the available shortcuts by hitting the shortcut `i`.

<p align="center">
    <img src="misc/shortcuts.png" width="820" alt="Layout View">
</p>

A quick and old demo on the Youtube.

<p align="center">
<a href="https://youtu.be/zpssGsvCgi0" target="_blank">
    <img src="https://img.youtube.com/vi/zpssGsvCgi0/maxresdefault.jpg" alt="KiCad Revision Inspector Demo" width="820">
</a>
</p>

---

<p align="center">
Are you enjoying using this tool, feel free to pay me a beer :). Cheers!
</p>

<p align="center">
    <a href="https://www.paypal.com/donate/?hosted_button_id=EPV73V7C5N4CJ"><img src="misc/donate_btn.gif"></a>
</p>
