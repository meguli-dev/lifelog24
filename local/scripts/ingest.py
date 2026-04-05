"""
ingest.py - File ingestion from IC recorder.

Scans the configured recorder drive for audio files and copies new ones
to data/raw/, tracking state in pipeline_state.json.
"""

import json
import logging
import shutil
from pathlib import Path

import yaml

logger = logging.getLogger(__name__)

SCRIPT_DIR = Path(__file__).resolve().parent
CONFIG_PATH = SCRIPT_DIR / ".." / "config" / "config.yaml"


def load_config() -> dict:
    """Load pipeline configuration from config.yaml."""
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def resolve_path(config_path: str) -> Path:
    """Resolve a path relative to the scripts directory."""
    p = Path(config_path)
    if p.is_absolute():
        return p
    return (SCRIPT_DIR / p).resolve()


def load_pipeline_state(state_path: Path) -> dict:
    """Load or initialize pipeline_state.json."""
    if state_path.exists():
        with open(state_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"files": {}}


def save_pipeline_state(state_path: Path, state: dict) -> None:
    """Save pipeline_state.json."""
    state_path.parent.mkdir(parents=True, exist_ok=True)
    with open(state_path, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2, ensure_ascii=False)


def main() -> None:
    """Scan recorder drive and ingest new audio files."""
    config = load_config()

    recorder_drive = Path(config["recorder"]["drive_path"])
    file_patterns = config["recorder"]["file_patterns"]
    raw_dir = resolve_path(config["paths"]["raw_dir"])
    state_path = resolve_path(config["paths"]["pipeline_state"])

    raw_dir.mkdir(parents=True, exist_ok=True)
    state = load_pipeline_state(state_path)

    if not recorder_drive.exists():
        logger.warning("Recorder drive not found: %s", recorder_drive)
        print(f"[WARN] Recorder drive not found: {recorder_drive}")
        return

    # Scan for audio files
    audio_files: list[Path] = []
    for pattern in file_patterns:
        audio_files.extend(recorder_drive.rglob(pattern))

    new_count = 0
    skip_count = 0

    for audio_file in sorted(audio_files):
        filename = audio_file.name

        if filename in state["files"]:
            skip_count += 1
            logger.debug("Skipping already ingested: %s", filename)
            continue

        dest = raw_dir / filename
        if dest.exists():
            # File exists on disk but not in state — add to state
            logger.info("File already in raw/ but not in state, adding: %s", filename)
        else:
            shutil.copy2(audio_file, dest)
            logger.info("Copied: %s -> %s", audio_file, dest)

        state["files"][filename] = {
            "status": "ingested",
            "raw_path": str(dest),
        }
        new_count += 1

    save_pipeline_state(state_path, state)

    print(f"[ingest] Done. New: {new_count}, Skipped: {skip_count}, Total: {len(state['files'])}")
    logger.info("Ingestion complete. New: %d, Skipped: %d", new_count, skip_count)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
    main()
