"""
vad_filter.py - Voice Activity Detection filtering using silero-vad.

Processes ingested audio files, removes silence, and saves filtered output.
"""

import json
import logging
from pathlib import Path

import torch
import torchaudio
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


def load_audio_as_mono_16k(file_path: Path) -> torch.Tensor:
    """Load audio file and resample to 16kHz mono."""
    waveform, sample_rate = torchaudio.load(str(file_path))

    # Convert to mono if stereo
    if waveform.shape[0] > 1:
        waveform = waveform.mean(dim=0, keepdim=True)

    # Resample to 16kHz if needed
    if sample_rate != 16000:
        resampler = torchaudio.transforms.Resample(orig_freq=sample_rate, new_freq=16000)
        waveform = resampler(waveform)

    return waveform.squeeze(0)  # Return 1D tensor


def run_vad(waveform: torch.Tensor, config: dict) -> list[dict]:
    """Run silero-vad on waveform and return speech timestamps."""
    model, utils = torch.hub.load(
        repo_or_dir="snakers4/silero-vad",
        model="silero_vad",
        trust_repo=True,
    )

    get_speech_timestamps = utils[0]

    speech_timestamps = get_speech_timestamps(
        waveform,
        model,
        threshold=config.get("threshold", 0.5),
        min_speech_duration_ms=config.get("min_speech_duration_ms", 250),
        min_silence_duration_ms=config.get("min_silence_duration_ms", 1000),
        sampling_rate=config.get("sampling_rate", 16000),
    )

    return speech_timestamps


def extract_speech_segments(waveform: torch.Tensor, timestamps: list[dict]) -> torch.Tensor:
    """Extract and concatenate speech segments from waveform."""
    if not timestamps:
        logger.warning("No speech segments detected")
        return waveform  # Return original if no speech found

    segments = []
    for ts in timestamps:
        start = ts["start"]
        end = ts["end"]
        segments.append(waveform[start:end])

    return torch.cat(segments)


def main() -> None:
    """Process ingested files through VAD filtering."""
    config = load_config()
    vad_config = config.get("vad", {})

    vad_filtered_dir = resolve_path(config["paths"]["vad_filtered_dir"])
    state_path = resolve_path(config["paths"]["pipeline_state"])

    vad_filtered_dir.mkdir(parents=True, exist_ok=True)
    state = load_pipeline_state(state_path)

    # Find files needing VAD processing
    to_process = [
        (fname, info)
        for fname, info in state["files"].items()
        if info["status"] == "ingested"
    ]

    if not to_process:
        print("[vad_filter] No files to process.")
        logger.info("No files with status 'ingested' found.")
        return

    processed = 0
    errors = 0

    for filename, info in to_process:
        raw_path = Path(info["raw_path"])

        if not raw_path.exists():
            logger.error("Raw file not found: %s", raw_path)
            errors += 1
            continue

        try:
            logger.info("Processing VAD: %s", filename)
            print(f"[vad_filter] Processing: {filename}")

            # Load and resample audio
            waveform = load_audio_as_mono_16k(raw_path)
            original_duration = len(waveform) / 16000

            # Run VAD
            speech_timestamps = run_vad(waveform, vad_config)

            # Extract speech segments
            filtered_waveform = extract_speech_segments(waveform, speech_timestamps)
            filtered_duration = len(filtered_waveform) / 16000

            # Save filtered audio
            output_path = vad_filtered_dir / filename
            torchaudio.save(
                str(output_path),
                filtered_waveform.unsqueeze(0),  # Add channel dim
                16000,
            )

            # Update state
            state["files"][filename]["status"] = "vad_filtered"
            state["files"][filename]["vad_path"] = str(output_path)
            save_pipeline_state(state_path, state)

            reduction = (1 - filtered_duration / original_duration) * 100 if original_duration > 0 else 0
            logger.info(
                "VAD complete: %s (%.1fs -> %.1fs, %.0f%% reduction)",
                filename, original_duration, filtered_duration, reduction,
            )
            print(f"  -> {original_duration:.1f}s -> {filtered_duration:.1f}s ({reduction:.0f}% reduction)")
            processed += 1

        except Exception:
            logger.exception("Error processing %s", filename)
            errors += 1

    print(f"[vad_filter] Done. Processed: {processed}, Errors: {errors}")
    logger.info("VAD filtering complete. Processed: %d, Errors: %d", processed, errors)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
    main()
