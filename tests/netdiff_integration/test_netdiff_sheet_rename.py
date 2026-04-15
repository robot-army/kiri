#!/usr/bin/env python3

import subprocess
import tempfile
import textwrap
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
NETDIFF = REPO_ROOT / "submodules" / "netdiff" / "netdiff.py"


def write_net(path: Path, content: str):
    path.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")


class NetdiffSheetRenameTest(unittest.TestCase):

    def test_sheet_rename_is_reported_as_sheet_rename(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)
            a = temp / "a.net"
            b = temp / "b.net"

            write_net(
                a,
                """
                (export
                  (version "E")
                  (design)
                  (components)
                  (libparts)
                  (libraries)
                  (nets
                    (net (code 1) (name "/USB_FTDI/ADBUS0")
                      (node (ref U1) (pin 1))
                    )
                    (net (code 2) (name "/USB_FTDI/ADBUS1")
                      (node (ref U1) (pin 2))
                    )
                    (net (code 3) (name "Net-(D10-A)")
                      (node (ref D10) (pin 2))
                      (node (ref R87) (pin 2))
                    )
                  )
                )
                """,
            )

            write_net(
                b,
                """
                (export
                  (version "E")
                  (design)
                  (components)
                  (libparts)
                  (libraries)
                  (nets
                    (net (code 1) (name "/USB_FTDI-RENAMED/ADBUS0")
                      (node (ref U1) (pin 1))
                    )
                    (net (code 2) (name "/USB_FTDI-RENAMED/ADBUS1")
                      (node (ref U1) (pin 2))
                    )
                    (net (code 3) (name "Net-(D10-C)")
                      (node (ref D10) (pin 1))
                      (node (ref R87) (pin 2))
                    )
                  )
                )
                """,
            )

            result = subprocess.run(
                ["python3", str(NETDIFF), str(a), str(b)],
                cwd=REPO_ROOT,
                capture_output=True,
                text=True,
            )

            self.assertEqual(result.returncode, 0, msg=result.stderr)
            self.assertIn("Renamed sheets (inferred):", result.stdout)
            self.assertIn("/USB_FTDI => /USB_FTDI-RENAMED", result.stdout)

            self.assertNotIn(
                "/USB_FTDI/ADBUS0 => /USB_FTDI-RENAMED/ADBUS0",
                result.stdout,
            )
            self.assertIn("Only in", result.stdout)
            self.assertIn("Net-(D10-A)", result.stdout)
            self.assertIn("Net-(D10-C)", result.stdout)


if __name__ == "__main__":
    unittest.main()
