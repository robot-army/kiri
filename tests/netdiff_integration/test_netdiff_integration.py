#!/usr/bin/env python3

import json
import os
import subprocess
import tempfile
import textwrap
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]


def write_schematic(path: Path, symbols):
    symbol_blocks = []
    for sym in symbols:
        symbol_blocks.append(
            textwrap.dedent(
                f"""
                (symbol
                  (at {sym['x']} {sym['y']} 0)
                  (property "Reference" "{sym['ref']}" (at {sym['x']} {sym['y']} 0))
                  (property "Value" "{sym['value']}" (at {sym['x']} {sym['y']} 0))
                )
                """
            ).strip()
        )

    content = "(kicad_sch\n  " + "\n  ".join(symbol_blocks) + "\n)\n"
    path.write_text(content, encoding="utf-8")


class NetdiffIntegrationTest(unittest.TestCase):

    def test_snapshot_generation_and_netdiff_cli(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)

            commit_a = temp / "A"
            commit_b = temp / "B"
            (commit_a / "_KIRI_").mkdir(parents=True)
            (commit_b / "_KIRI_").mkdir(parents=True)

            sch_a = commit_a / "main.kicad_sch"
            sch_b = commit_b / "main.kicad_sch"

            write_schematic(
                sch_a,
                [
                    {"ref": "R1", "value": "10k", "x": 10, "y": 10},
                    {"ref": "C1", "value": "1u", "x": 20, "y": 20},
                ],
            )
            write_schematic(
                sch_b,
                [
                    {"ref": "R1", "value": "10k", "x": 10, "y": 10},
                    {"ref": "C1", "value": "2u2", "x": 20, "y": 20},
                    {"ref": "U1", "value": "MCU", "x": 30, "y": 30},
                ],
            )

            for commit in (commit_a, commit_b):
                sheets = commit / "_KIRI_" / "sch_sheets"
                sheets.write_text("main|main.kicad_sch|/|main|main\n", encoding="utf-8")

            out_a = commit_a / "_KIRI_" / "netdiff_snapshot.json"
            out_b = commit_b / "_KIRI_" / "netdiff_snapshot.json"

            snapshot_script = REPO_ROOT / "bin" / "kiri-netdiff-snapshot"

            for commit_dir, sch, out in ((commit_a, sch_a, out_a), (commit_b, sch_b, out_b)):
                cmd = [
                    "python3",
                    str(snapshot_script),
                    str(commit_dir),
                    str(sch),
                    str(commit_dir / "_KIRI_" / "sch_sheets"),
                    str(out),
                ]
                result = subprocess.run(cmd, cwd=REPO_ROOT, capture_output=True, text=True)
                self.assertEqual(result.returncode, 0, msg=result.stderr)
                self.assertTrue(out.exists())

            snap_a = json.loads(out_a.read_text(encoding="utf-8"))
            snap_b = json.loads(out_b.read_text(encoding="utf-8"))

            self.assertIn("R1", snap_a["refs"])
            self.assertEqual(snap_a["refs"]["R1"]["page"], "main")
            self.assertIn("C1_1u", snap_a["nets"])
            self.assertIn("C1_2u2", snap_b["nets"])
            self.assertIn("U1_MCU", snap_b["nets"])

            netdiff_cmd = [
                "python3",
                str(REPO_ROOT / "submodules" / "netdiff" / "netdiff.py"),
                str(sch_a),
                str(sch_b),
            ]
            netdiff_result = subprocess.run(netdiff_cmd, cwd=REPO_ROOT, capture_output=True, text=True)
            self.assertEqual(netdiff_result.returncode, 0, msg=netdiff_result.stderr)
            self.assertIn("Only in", netdiff_result.stdout)
            self.assertIn("U1_MCU", netdiff_result.stdout)


if __name__ == "__main__":
    unittest.main()
