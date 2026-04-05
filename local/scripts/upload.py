"""
upload.py - Upload transcription results to the web app.

Reads result JSON files and POSTs them to the web app's /api/upload endpoint.
"""

import json
import logging
import os
from datetime import datetime
from pathlib import Path

import requests
import yaml

logger = logging.getLogger(__name__)

SCRIPT_DIR = Path(__file__).resolve().parent
CONFIG_PATH = SCRIPT_DIR / ".." / "config" / "config.yaml"


def load_config() -> dict:
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def resolve_path(config_path: str) -> Path:
    p = Path(config_path)
    if p.is_absolute():
        return p
    return (SCRIPT_DIR / p).resolve()


def load_pipeline_state(state_path: Path) -> dict:
    if state_path.exists():
        with open(state_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"files": {}}


def save_pipeline_state(state_path: Path, state: dict) -> None:
    state_path.parent.mkdir(parents=True, exist_ok=True)
    with open(state_path, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2, ensure_ascii=False)


def get_file_date(filename: str, raw_path: str) -> str:
    """Extract date from filename or file metadata.

    Tries common IC recorder filename patterns (e.g., 20240315_120000.wav),
    then falls back to file modification time.
    """
    stem = Path(filename).stem

    # Try common date patterns in filename
    for fmt, length in [
        ("%Y%m%d_%H%M%S", 15),
        ("%Y%m%d-%H%M%S", 15),
        ("%Y%m%d", 8),
        ("%Y-%m-%d", 10),
    ]:
        try:
            date_str = stem[:length]
            dt = datetime.strptime(date_str, fmt)
            return dt.strftime("%Y-%m-%d")
        except (ValueError, IndexError):
            continue

    # Fall back to file modification time
    try:
        raw = Path(raw_path)
        if raw.exists():
            mtime = raw.stat().st_mtime
            return datetime.fromtimestamp(mtime).strftime("%Y-%m-%d")
    except Exception:
        pass

    return datetime.now().strftime("%Y-%m-%d")


def get_file_duration(vad_path: str) -> float:
    """Get audio duration in seconds from the VAD-filtered file."""
    try:
        import torchaudio

        info = torchaudio.info(vad_path)
        return info.num_frames / info.sample_rate
    except Exception:
        logger.warning("Could not determine duration for %s", vad_path)
        return 0.0


def main() -> None:
    """Upload transcribed results to the web app."""
    config = load_config()
    state_path = resolve_path(config["paths"]["pipeline_state"])
    state = load_pipeline_state(state_path)

    # Determine web base URL
    base_url = os.environ.get("LIFELOG_WEB_URL") or config.get("web", {}).get("base_url", "")
    upload_endpoint = config.get("web", {}).get("upload_endpoint", "/api/upload")
    upload_url = base_url.rstrip("/") + upload_endpoint

    api_key = os.environ.get("LIFELOG_API_KEY")
    if not api_key:
        logger.error("LIFELOG_API_KEY environment variable is not set")
        print("[upload] ERROR: LIFELOG_API_KEY not set")
        return

    if not base_url:
        logger.error("Web base URL not configured (set LIFELOG_WEB_URL or web.base_url in config)")
        print("[upload] ERROR: Web base URL not configured")
        return

    # Find files needing upload
    to_upload = [
        (fname, info)
        for fname, info in state["files"].items()
        if info["status"] == "transcribed"
    ]

    if not to_upload:
        print("[upload] No files to upload.")
        logger.info("No files with status 'transcribed' found.")
        return

    uploaded = 0
    skipped = 0
    errors = 0

    for filename, info in to_upload:
        result_path = Path(info.get("result_path", ""))

        if not result_path.exists():
            logger.error("Result file not found: %s", result_path)
            errors += 1
            continue

        try:
            logger.info("Uploading result: %s", filename)
            print(f"[upload] Uploading: {filename}")

            # Load result JSON
            with open(result_path, "r", encoding="utf-8") as f:
                result = json.load(f)

            # Build upload payload
            file_date = get_file_date(filename, info.get("raw_path", ""))
            duration = get_file_duration(info.get("vad_path", ""))

            payload = {
                "filename": filename,
                "date": file_date,
                "duration": duration,
                "transcript": result.get("transcript", ""),
                "conversations": result.get("conversations", []),
                "tasks": result.get("tasks", []),
                "ideas": result.get("ideas", []),
                "raw_result": result,
            }

            # POST to web app
            response = requests.post(
                upload_url,
                json=payload,
                headers={
                    "x-api-key": api_key,
                    "Content-Type": "application/json",
                },
                timeout=30,
            )

            if response.status_code == 200 or response.status_code == 201:
                state["files"][filename]["status"] = "uploaded"
                save_pipeline_state(state_path, state)
                logger.info("Uploaded successfully: %s", filename)
                print(f"  -> Uploaded successfully")
                uploaded += 1

            elif response.status_code == 409:
                # Already exists — treat as success
                state["files"][filename]["status"] = "uploaded"
                save_pipeline_state(state_path, state)
                logger.info("Already exists on server (409): %s", filename)
                print(f"  -> Already exists on server, marking as uploaded")
                skipped += 1

            else:
                logger.error(
                    "Upload failed for %s: HTTP %d - %s",
                    filename, response.status_code, response.text,
                )
                print(f"  -> Failed: HTTP {response.status_code}")
                errors += 1

        except requests.RequestException:
            logger.exception("Network error uploading %s", filename)
            errors += 1
        except Exception:
            logger.exception("Error uploading %s", filename)
            errors += 1

    print(f"[upload] Done. Uploaded: {uploaded}, Already existed: {skipped}, Errors: {errors}")
    logger.info("Upload complete. Uploaded: %d, Skipped: %d, Errors: %d", uploaded, skipped, errors)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
    main()
