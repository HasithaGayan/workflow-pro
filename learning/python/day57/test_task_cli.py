
# Day 57 - Automated CLI Tests

import contextlib
import io
import tempfile
import unittest
from pathlib import Path

from task_cli import load_tasks, main, save_tasks
from task_model import Task


class TestTaskCLI(unittest.TestCase):

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = Path(self.temp.name) / "tasks.json"

    def tearDown(self):
        self.temp.cleanup()

    def run_command(self, *arguments):
        output = io.StringIO()

        with contextlib.redirect_stdout(output):
            main([
                "--file",
                str(self.path),
                *arguments
            ])

        return output.getvalue()

    def test_empty_list(self):
        self.assertEqual(load_tasks(self.path), [])

    def test_save_and_load(self):
        save_tasks(
            self.path,
            [Task("Build API", "todo")]
        )

        tasks = load_tasks(self.path)

        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0].title, "Build API")

    def test_add_task(self):
        self.run_command("add", "Write tests")

        tasks = load_tasks(self.path)

        self.assertEqual(tasks[0].status, "todo")

    def test_mark_done(self):
        self.run_command("add", "Build API")
        self.run_command("done", "1")

        self.assertEqual(
            load_tasks(self.path)[0].status,
            "done"
        )

    def test_summary(self):
        self.run_command("add", "Build API")
        self.run_command("add", "Write tests")
        self.run_command("done", "1")

        output = self.run_command("summary")

        self.assertIn("1/2 (50%)", output)

    def test_invalid_status(self):
        with self.assertRaises(ValueError):
            Task("Build API", "unknown")


if __name__ == "__main__":
    unittest.main()
