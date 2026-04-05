"""
transcribe.py - Gemini API transcription.

Two modes:
  - submit: Upload audio to Gemini and get transcription results.
  - collect: (Future) Check batch job status and collect results.
"""

import json
import logging
import os
import sys
from pathlib import Path

import yaml
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

SCRIPT_DIR = Path(__file__).resolve().parent
CONFIG_PATH = SCRIPT_DIR / ".." / "config" / "config.yaml"
PROMPT_PATH = SCRIPT_DIR / ".." / "prompts" / "transcribe_prompt.txt"

# JSON schema matching the prompt's expected output structure
TRANSCRIPTION_SCHEMA = {
    "type": "object",
    "properties": {
        "transcript": {"type": "string"},
        "conversations": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "start_time": {"type": "string"},
                    "end_time": {"type": "string"},
                    "participants": {"type": "array", "items": {"type": "string"}},
                    "summary": {"type": "string"},
                    "context": {"type": "string"},
                },
                "required": ["start_time", "end_time", "participants", "summary", "context"],
            },
        },
        "tasks": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "description": {"type": "string"},
                    "priority": {"type": "string"},
                    "conversation_index": {"type": "integer"},
                },
                "required": ["description", "priority", "conversation_index"],
            },
        },
        "ideas": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "content": {"type": "string"},
                    "tags": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["content", "tags"],
            },
        },
    },
    "required": ["transcript", "conversations", "tasks", "ideas"],
}


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


def load_prompt() -> str:
    """Load the transcription prompt template."""
    with open(PROMPT_PATH, "r", encoding="utf-8") as f:
        return f.read()


def submit(config: dict, state: dict, state_path: Path) -> None:
    """Upload audio files to Gemini and get transcription results."""
    model_name = config.get("gemini", {}).get("model", "gemini-2.0-flash")
    prompt = load_prompt()

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        logger.error("GEMINI_API_KEY environment variable is not set")
        print("[transcribe] ERROR: GEMINI_API_KEY not set")
        return

    client = genai.Client(api_key=api_key)

    # Find files needing transcription
    to_process = [
        (fname, info)
        for fname, info in state["files"].items()
        if info["status"] == "vad_filtered"
    ]

    if not to_process:
        print("[transcribe:submit] No files to process.")
        logger.info("No files with status 'vad_filtered' found.")
        return

    processed = 0
    errors = 0

    for filename, info in to_process:
        vad_path = Path(info["vad_path"])

        if not vad_path.exists():
            logger.error("VAD-filtered file not found: %s", vad_path)
            errors += 1
            continue

        try:
            logger.info("Uploading to Gemini: %s", filename)
            print(f"[transcribe:submit] Uploading: {filename}")

            # Upload audio file
            uploaded_file = client.files.upload(file=str(vad_path))
            logger.info("Uploaded: %s -> %s", filename, uploaded_file.uri)

            state["files"][filename]["gemini_file_uri"] = uploaded_file.uri

            # Generate transcription
            print(f"[transcribe:submit] Transcribing: {filename}")
            response = client.models.generate_content(
                model=model_name,
                contents=[
                    types.Content(
                        parts=[
                            types.Part.from_uri(
                                file_uri=uploaded_file.uri,
                                mime_type=uploaded_file.mime_type,
                            ),
                            types.Part.from_text(text=prompt),
                        ]
                    )
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=TRANSCRIPTION_SCHEMA,
                ),
            )

            # Parse the response
            result_text = response.text
            result_json = json.loads(result_text)

            # Save result JSON
            result_path = vad_path.parent / f"{vad_path.stem}.result.json"
            with open(result_path, "w", encoding="utf-8") as f:
                json.dump(result_json, f, indent=2, ensure_ascii=False)

            # Update state
            state["files"][filename]["status"] = "transcribed"
            state["files"][filename]["result_path"] = str(result_path)
            save_pipeline_state(state_path, state)

            n_conversations = len(result_json.get("conversations", []))
            n_tasks = len(result_json.get("tasks", []))
            n_ideas = len(result_json.get("ideas", []))
            logger.info(
                "Transcribed: %s (conversations: %d, tasks: %d, ideas: %d)",
                filename, n_conversations, n_tasks, n_ideas,
            )
            print(f"  -> Conversations: {n_conversations}, Tasks: {n_tasks}, Ideas: {n_ideas}")
            processed += 1

        except Exception:
            logger.exception("Error transcribing %s", filename)
            errors += 1

    print(f"[transcribe:submit] Done. Processed: {processed}, Errors: {errors}")
    logger.info("Transcription submit complete. Processed: %d, Errors: %d", processed, errors)


def collect(config: dict, state: dict, state_path: Path) -> None:
    """Check batch job status and collect results (future batch API support)."""
    # Report current status
    status_counts: dict[str, int] = {}
    for info in state["files"].values():
        s = info["status"]
        status_counts[s] = status_counts.get(s, 0) + 1

    print("[transcribe:collect] Current pipeline status:")
    for status, count in sorted(status_counts.items()):
        print(f"  {status}: {count}")

    if not status_counts:
        print("  (no files in pipeline)")

    logger.info("Collect status report: %s", status_counts)


def main(mode: str = "submit") -> None:
    """Run transcription in the specified mode."""
    config = load_config()
    state_path = resolve_path(config["paths"]["pipeline_state"])
    state = load_pipeline_state(state_path)

    if mode == "submit":
        submit(config, state, state_path)
    elif mode == "collect":
        collect(config, state, state_path)
    else:
        print(f"[transcribe] Unknown mode: {mode}. Use 'submit' or 'collect'.")
        logger.error("Unknown mode: %s", mode)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
    mode = sys.argv[1] if len(sys.argv) > 1 else "submit"
    main(mode)
