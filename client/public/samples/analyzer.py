"""R3L:F — Drift Frequency Analyzer
Sample Python file for testing code editing with syntax highlighting."""

import asyncio
import random
from dataclasses import dataclass
from typing import Optional


@dataclass
class DriftSignal:
    user_id: int
    file_id: int
    strength: float
    frequency: float


class ResonanceDetector:
    def __init__(self, threshold: float = 0.7):
        self.signals: list[DriftSignal] = []
        self.threshold = threshold
        self.resonances: dict[tuple[int, int], float] = {}

    async def scan(self, signal: DriftSignal) -> Optional[tuple[int, int]]:
        self.signals.append(signal)

        for existing in self.signals[:-1]:
            if existing.file_id == signal.file_id:
                overlap = self._calculate_overlap(signal, existing)
                if overlap > self.threshold:
                    pair = (existing.user_id, signal.user_id)
                    self.resonances[pair] = overlap
                    return pair
        return None

    def _calculate_overlap(self, a: DriftSignal, b: DriftSignal) -> float:
        freq_diff = abs(a.frequency - b.frequency)
        strength_product = a.strength * b.strength
        return strength_product * (1 / (1 + freq_diff))

    async def process_batch(self, signals: list[DriftSignal]) -> list[tuple[int, int]]:
        tasks = [self.scan(s) for s in signals]
        results = await asyncio.gather(*tasks)
        return [r for r in results if r is not None]
