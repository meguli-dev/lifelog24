"""
run_pipeline.py - Pipeline orchestrator.

Commands:
  python run_pipeline.py process  — ingest -> vad_filter -> transcribe submit
  python run_pipeline.py collect  — transcribe collect -> upload
"""

import logging
import sys
import time

from ingest import main as ingest_main
from vad_filter import main as vad_filter_main
from transcribe import main as transcribe_main
from upload import main as upload_main

logger = logging.getLogger(__name__)


def run_step(name: str, func, *args, **kwargs) -> None:
    """Run a pipeline step with timing and error handling."""
    print(f"\n{'='*60}")
    print(f"  STEP: {name}")
    print(f"{'='*60}")
    start = time.time()

    try:
        func(*args, **kwargs)
    except Exception:
        logger.exception("Step '%s' failed", name)
        print(f"\n[ERROR] Step '{name}' failed. Check logs for details.")
        raise

    elapsed = time.time() - start
    print(f"[{name}] Completed in {elapsed:.1f}s")
    logger.info("Step '%s' completed in %.1fs", name, elapsed)


def cmd_process() -> None:
    """Run the processing pipeline: ingest -> vad_filter -> transcribe submit."""
    print("\n*** LIFELOG PIPELINE: PROCESS ***\n")
    logger.info("Starting process pipeline")

    run_step("ingest", ingest_main)
    run_step("vad_filter", vad_filter_main)
    run_step("transcribe:submit", transcribe_main, mode="submit")

    print(f"\n{'='*60}")
    print("  PROCESS PIPELINE COMPLETE")
    print(f"{'='*60}")


def cmd_collect() -> None:
    """Run the collection pipeline: transcribe collect -> upload."""
    print("\n*** LIFELOG PIPELINE: COLLECT ***\n")
    logger.info("Starting collect pipeline")

    run_step("transcribe:collect", transcribe_main, mode="collect")
    run_step("upload", upload_main)

    print(f"\n{'='*60}")
    print("  COLLECT PIPELINE COMPLETE")
    print(f"{'='*60}")


def main() -> None:
    """Parse command and run the appropriate pipeline."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(name)s %(levelname)s %(message)s",
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler(
                "pipeline.log", encoding="utf-8",
            ),
        ],
    )

    if len(sys.argv) < 2:
        print("Usage: python run_pipeline.py <command>")
        print()
        print("Commands:")
        print("  process  — Run: ingest -> vad_filter -> transcribe submit")
        print("  collect  — Run: transcribe collect -> upload")
        sys.exit(1)

    command = sys.argv[1].lower()

    if command == "process":
        cmd_process()
    elif command == "collect":
        cmd_collect()
    else:
        print(f"Unknown command: {command}")
        print("Use 'process' or 'collect'.")
        sys.exit(1)


if __name__ == "__main__":
    main()
