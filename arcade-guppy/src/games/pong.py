import json
import math
import os
import random
import re
import sys
import threading
import time
import urllib.error
import urllib.request

import pygame


def clamp(value, minimum, maximum):
    return max(minimum, min(maximum, value))


def read_env_float(name, default, minimum=None, maximum=None):
    raw = os.environ.get(name)
    if raw is None:
        value = float(default)
    else:
        try:
            value = float(raw)
        except ValueError:
            value = float(default)
    if minimum is not None:
        value = max(minimum, value)
    if maximum is not None:
        value = min(maximum, value)
    return value


def read_env_bool(name, default=False):
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def build_chat_endpoint():
    explicit_endpoint = os.environ.get("PONG_AI_ENDPOINT", "").strip()
    if explicit_endpoint:
        return explicit_endpoint.rstrip("/")

    base_url = (
        os.environ.get("PONG_AI_URL")
        or os.environ.get("OLLAMA_FALLBACK_URL")
        or os.environ.get("OLLAMA_URL")
        or ""
    ).strip()
    if not base_url:
        return ""
    cleaned = base_url.rstrip("/")
    if cleaned.endswith("/api/chat"):
        return cleaned
    return f"{cleaned}/api/chat"


def resolve_ai_log_path():
    explicit_path = os.environ.get("PONG_AI_LOG_PATH", "").strip()
    if explicit_path:
        return os.path.abspath(explicit_path)
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "logs", "pong-ai.jsonl"))


def truncate_log_text(value, limit=1400):
    if not isinstance(value, str):
        return value
    if len(value) <= limit:
        return value
    return f"{value[:limit]}...<truncated>"


def sanitize_log_value(value):
    if isinstance(value, dict):
        return {str(key): sanitize_log_value(val) for key, val in value.items()}
    if isinstance(value, list):
        return [sanitize_log_value(item) for item in value]
    if isinstance(value, float):
        return round(value, 4)
    if isinstance(value, str):
        return truncate_log_text(value)
    return value


class AiTraceLogger:
    def __init__(self, enabled, path):
        self.enabled = enabled
        self.path = path
        self._lock = threading.Lock()
        self._write_failed = False

        if not self.enabled:
            return

        try:
            directory = os.path.dirname(self.path)
            if directory:
                os.makedirs(directory, exist_ok=True)
            print(f"[PONG AI] Logging enabled: {self.path}")
        except OSError as error:
            self.enabled = False
            print(f"[PONG AI] Failed to initialize log file: {error}")

    def log(self, event_type, **payload):
        if not self.enabled or self._write_failed:
            return

        record = {
            "ts_ms": int(time.time() * 1000),
            "event": event_type,
        }
        for key, value in payload.items():
            if value is not None:
                record[key] = sanitize_log_value(value)

        try:
            with self._lock:
                with open(self.path, "a", encoding="utf-8") as handle:
                    handle.write(json.dumps(record, ensure_ascii=False, sort_keys=True))
                    handle.write("\n")
        except OSError as error:
            self._write_failed = True
            print(f"[PONG AI] Failed to write log entry: {error}")


pygame.init()
pygame.joystick.init()

embedded_mode = os.environ.get("ARCADE_EMBEDDED") == "1"
window_size_raw = os.environ.get("ARCADE_WINDOW_SIZE")
window_pos = os.environ.get("ARCADE_WINDOW_POS")

if window_pos:
    os.environ["SDL_VIDEO_WINDOW_POS"] = window_pos

screen_size = (0, 0)
if embedded_mode and window_size_raw:
    cleaned = window_size_raw.lower().replace(" ", "")
    parts = cleaned.split("x" if "x" in cleaned else ",")
    if len(parts) == 2:
        try:
            screen_size = (max(320, int(parts[0])), max(240, int(parts[1])))
        except ValueError:
            screen_size = (0, 0)

display_flags = pygame.NOFRAME | pygame.SCALED
if not embedded_mode:
    display_flags |= pygame.FULLSCREEN

screen = pygame.display.set_mode(screen_size, display_flags)
WIDTH, HEIGHT = screen.get_size()
pygame.display.set_caption("PONG")

clock = pygame.time.Clock()
FPS = 60
JOYSTICK_DEADZONE = 0.32

BLACK = (0, 0, 0)
GREEN = (0, 255, 70)
GREEN_DIM = (0, 80, 25)
GREEN_DARK = (0, 20, 8)
AMBER = (255, 180, 0)
AMBER_DIM = (100, 60, 0)
WHITE = (255, 255, 255)

try:
    font_big = pygame.font.SysFont("couriernew", 96, bold=True)
    font_med = pygame.font.SysFont("couriernew", 42, bold=True)
    font_small = pygame.font.SysFont("couriernew", 22, bold=True)
except Exception:
    font_big = pygame.font.SysFont("monospace", 96, bold=True)
    font_med = pygame.font.SysFont("monospace", 42, bold=True)
    font_small = pygame.font.SysFont("monospace", 22, bold=True)

PAD_W, PAD_H = 19, 185
BALL_R = 10
PAD_SPEED = 28
PAD_SPEED_ANALOG = 22
AI_PAD_SPEED = read_env_float("PONG_AI_PAD_SPEED", 17.5, 8.0, 30.0)
BALL_START_SPEED = read_env_float("PONG_BALL_START_SPEED", 6.0, 2.0, 16.0)
BALL_HIT_ACCEL = read_env_float("PONG_BALL_HIT_ACCEL", 1.08, 1.0, 1.5)
BALL_TIME_ACCEL = read_env_float("PONG_BALL_TIME_ACCEL", 1.00045, 1.0, 1.01)
BALL_MAX_SPEED = read_env_float("PONG_BALL_MAX_SPEED", 20.0, BALL_START_SPEED, 40.0)
BALL_MIN_X_FACTOR = 0.40
WIN_SCORE = 7
MARGIN = 50

OPPONENT_MODE = (os.environ.get("PONG_OPPONENT") or "ai").strip().lower()
AI_MODE = (os.environ.get("PONG_AI_MODE") or "hybrid").strip().lower()
AI_ENDPOINT = build_chat_endpoint()
AI_MODEL = (os.environ.get("PONG_AI_MODEL") or os.environ.get("OLLAMA_MODEL") or "gemma3:4b").strip()
AI_TIMEOUT_SEC = read_env_float("PONG_AI_TIMEOUT_MS", 900.0, 150.0, 10000.0) / 1000.0
AI_FAST_INTERVAL_SEC = read_env_float("PONG_AI_INTERVAL_MS", 280.0, 120.0, 3000.0) / 1000.0
AI_SLOW_INTERVAL_SEC = max(AI_FAST_INTERVAL_SEC * 1.8, 0.45)
AI_REMOTE_BLEND = read_env_float("PONG_AI_REMOTE_BLEND", 0.68, 0.0, 1.0)
AI_SEAMLESS_FALLBACK = read_env_bool("PONG_AI_SEAMLESS_FALLBACK", False)
AI_SYNTHETIC_MIN_LAT_MS = read_env_float("PONG_AI_SYNTHETIC_MIN_LATENCY_MS", 82.0, 5.0, 5000.0)
AI_SYNTHETIC_MAX_LAT_MS = read_env_float("PONG_AI_SYNTHETIC_MAX_LATENCY_MS", 148.0, AI_SYNTHETIC_MIN_LAT_MS, 5000.0)
AI_LOG_ENABLED = read_env_bool("PONG_AI_LOG", False)
AI_LOG_INCLUDE_RAW = read_env_bool("PONG_AI_LOG_RAW", True)
AI_LOG_INCLUDE_SNAPSHOT = read_env_bool("PONG_AI_LOG_SNAPSHOT", True)
AI_VERBOSE = read_env_bool("PONG_AI_VERBOSE", read_env_bool("PONG_AI_LOG_WINDOW", False))
AI_TRACE_LOGGER = AiTraceLogger(AI_LOG_ENABLED, resolve_ai_log_path())


def emit_ai_console(message):
    if AI_VERBOSE:
        print(f"[PONG AI] {message}", flush=True)


def make_scanlines():
    surf = pygame.Surface((WIDTH, HEIGHT), pygame.SRCALPHA)
    for y in range(0, HEIGHT, 3):
        pygame.draw.line(surf, (0, 0, 0, 60), (0, y), (WIDTH, y))
    return surf


def make_vignette():
    surf = pygame.Surface((WIDTH, HEIGHT), pygame.SRCALPHA)
    steps = 80
    for i in range(steps):
        alpha = int(160 * (1 - i / steps))
        pygame.draw.rect(
            surf,
            (0, 0, 0, alpha),
            (i, i, WIDTH - i * 2, HEIGHT - i * 2),
            1,
        )
    return surf


def make_field_bg():
    surf = pygame.Surface((WIDTH, HEIGHT))
    surf.fill(BLACK)
    for gx in range(0, WIDTH, 80):
        pygame.draw.line(surf, GREEN_DARK, (gx, 0), (gx, HEIGHT))
    for gy in range(0, HEIGHT, 80):
        pygame.draw.line(surf, GREEN_DARK, (0, gy), (WIDTH, gy))
    for y in range(0, HEIGHT, 24):
        pygame.draw.rect(surf, GREEN_DIM, (WIDTH // 2 - 4, y, 8, 14))
    pygame.draw.rect(surf, GREEN, (0, 0, WIDTH, 8))
    pygame.draw.rect(surf, GREEN, (0, HEIGHT - 8, WIDTH, 8))
    return surf


print("Pre-rendering overlays...")
scanlines = make_scanlines()
vignette = make_vignette()
field_bg = make_field_bg()
print("Done.")

joysticks = [pygame.joystick.Joystick(i) for i in range(pygame.joystick.get_count())]
for js in joysticks:
    js.init()


def pixel_text(surf, text, font, colour, cx, cy, shadow=True):
    if shadow:
        shadow_surface = font.render(text, False, GREEN_DARK)
        surf.blit(shadow_surface, shadow_surface.get_rect(center=(cx + 3, cy + 3)))
    text_surface = font.render(text, False, colour)
    surf.blit(text_surface, text_surface.get_rect(center=(cx, cy)))


def reflect_y(y_value):
    top = BALL_R
    bottom = HEIGHT - BALL_R
    while y_value < top or y_value > bottom:
        if y_value < top:
            y_value = top + (top - y_value)
        elif y_value > bottom:
            y_value = bottom - (y_value - bottom)
    return y_value


def predict_intercept_y(ball, paddle_x):
    if ball.vx <= 0:
        return HEIGHT / 2
    travel = (paddle_x - ball.x) / ball.vx
    if travel <= 0:
        return ball.y
    projected_y = ball.y + ball.vy * travel
    return reflect_y(projected_y)


def predict_snapshot_intercept_y(snapshot):
    ball = snapshot.get("ball", {})
    ball_x = float(ball.get("x", 0.5)) * WIDTH
    ball_y = float(ball.get("y", 0.5)) * HEIGHT
    ball_vx = float(ball.get("vx", 0.0)) * BALL_MAX_SPEED
    ball_vy = float(ball.get("vy", 0.0)) * BALL_MAX_SPEED
    paddle_contact_x = WIDTH - MARGIN - PAD_W - BALL_R

    if ball_vx <= 0.05:
        return HEIGHT / 2

    travel = (paddle_contact_x - ball_x) / ball_vx
    if travel <= 0:
        return ball_y

    projected_y = ball_y + ball_vy * travel
    return reflect_y(projected_y)


def build_seamless_ai_decision(snapshot):
    ball = snapshot.get("ball", {})
    ai_state = snapshot.get("ai", {})
    max_paddle_y = max(HEIGHT - PAD_H, 1)
    ai_top_y = float(ai_state.get("y", 0.5)) * max_paddle_y
    ai_center_y = ai_top_y + PAD_H / 2

    if float(ball.get("vx", 0.0)) > 0:
        target_y = predict_snapshot_intercept_y(snapshot)
        target_y += random.uniform(-26.0, 26.0)
    else:
        target_y = HEIGHT / 2 + random.uniform(-70.0, 70.0)

    target_y = clamp(target_y, PAD_H / 2, HEIGHT - PAD_H / 2)
    aim = clamp(target_y / HEIGHT, 0.0, 1.0)
    diff = target_y - ai_center_y

    if diff > HEIGHT * 0.035:
        move = "down"
    elif diff < -HEIGHT * 0.035:
        move = "up"
    else:
        move = "stay"

    return {
        "move": move,
        "aim": aim,
        "raw_response": json.dumps({"move": move, "aim": round(aim, 4)}),
    }


def compact_model_name(model_name):
    lowered = model_name.lower()
    if "gemma3" in lowered or "gemma 3" in lowered:
        return "GEMMA 3"
    if "gemma2" in lowered or "gemma 2" in lowered:
        return "GEMMA 2"
    label = re.split(r"[:/ ]", model_name, 1)[0].strip().upper()
    return label or "REMOTE AI"


class Paddle:
    def __init__(self, x, colour):
        self.x = x
        self.y = HEIGHT // 2 - PAD_H // 2
        self.colour = colour
        self.vy = 0.0
        self._make_surf()

    def _make_surf(self):
        self.surf = pygame.Surface((PAD_W + 8, PAD_H + 8), pygame.SRCALPHA)
        dim = tuple(int(c * 0.25) for c in self.colour)
        pygame.draw.rect(self.surf, dim, (0, 0, PAD_W + 8, PAD_H + 8), border_radius=4)
        pygame.draw.rect(self.surf, self.colour, (4, 4, PAD_W, PAD_H), border_radius=4)
        pygame.draw.rect(self.surf, WHITE, (6, 8, 4, PAD_H - 16), border_radius=2)

    @property
    def rect(self):
        return pygame.Rect(self.x, int(self.y), PAD_W, PAD_H)

    @property
    def center_y(self):
        return self.y + PAD_H / 2

    def move_player(self, up, down, axis_value=0.0):
        if abs(axis_value) > JOYSTICK_DEADZONE:
            self.vy = axis_value * PAD_SPEED_ANALOG
        elif up:
            self.vy = -PAD_SPEED
        elif down:
            self.vy = PAD_SPEED
        else:
            self.vy *= 0.6
        self.y = clamp(self.y + self.vy, 0, HEIGHT - PAD_H)

    def move_towards(self, target_center_y, max_speed):
        diff = target_center_y - self.center_y
        self.vy = clamp(diff, -max_speed, max_speed)
        self.y = clamp(self.y + self.vy, 0, HEIGHT - PAD_H)

    def draw(self, surf):
        surf.blit(self.surf, (self.x - 4, int(self.y) - 4))


class Ball:
    def __init__(self):
        self.trail = []
        self.colour = GREEN
        self.reset(1)

    @property
    def rect(self):
        return pygame.Rect(int(self.x) - BALL_R, int(self.y) - BALL_R, BALL_R * 2, BALL_R * 2)

    def reset(self, direction=1):
        self.x = WIDTH / 2
        self.y = HEIGHT / 2
        angle = random.uniform(-0.52, 0.52)
        self.speed = BALL_START_SPEED
        self.vx = math.cos(angle) * self.speed * direction
        self.vy = math.sin(angle) * self.speed
        self.trail.clear()

    def _normalize_velocity(self):
        norm = math.hypot(self.vx, self.vy) or 1.0
        self.vx = self.vx / norm * self.speed
        self.vy = self.vy / norm * self.speed

        min_horizontal = self.speed * BALL_MIN_X_FACTOR
        if abs(self.vx) < min_horizontal:
            direction = 1 if self.vx >= 0 else -1
            self.vx = direction * min_horizontal
            remaining = max(self.speed ** 2 - self.vx ** 2, 0.0)
            if abs(self.vy) < 0.001:
                self.vy = random.choice((-1, 1))
            self.vy = math.copysign(math.sqrt(remaining), self.vy)

    def _bounce_off_paddle(self, paddle, direction):
        relative = (self.y - paddle.center_y) / (PAD_H / 2)
        relative = clamp(relative, -1.0, 1.0)
        self.speed = min(self.speed * BALL_HIT_ACCEL, BALL_MAX_SPEED)

        angle = relative * math.pi / 3.2
        self.vx = math.cos(angle) * self.speed * direction
        self.vy = math.sin(angle) * self.speed + paddle.vy * 0.12
        self._normalize_velocity()

        if direction > 0:
            self.x = paddle.x + PAD_W + BALL_R + 1
        else:
            self.x = paddle.x - BALL_R - 1

    def update(self, player, opponent):
        self.trail.append((int(self.x), int(self.y)))
        if len(self.trail) > 10:
            self.trail.pop(0)

        self.x += self.vx
        self.y += self.vy

        if self.y - BALL_R <= 0:
            self.y = BALL_R
            self.vy = abs(self.vy)
        elif self.y + BALL_R >= HEIGHT:
            self.y = HEIGHT - BALL_R
            self.vy = -abs(self.vy)

        if self.rect.colliderect(player.rect) and self.vx < 0:
            self._bounce_off_paddle(player, 1)

        if self.rect.colliderect(opponent.rect) and self.vx > 0:
            self._bounce_off_paddle(opponent, -1)

        if self.x < 0:
            return "opponent"
        if self.x > WIDTH:
            return "player"

        if self.speed < BALL_MAX_SPEED:
            self.speed = min(self.speed * BALL_TIME_ACCEL, BALL_MAX_SPEED)
            self._normalize_velocity()

        return None

    def draw(self, surf):
        for i, (tx, ty) in enumerate(self.trail):
            alpha = (i + 1) / max(len(self.trail), 1)
            green_channel = int(120 * alpha)
            pygame.draw.circle(
                surf,
                (0, green_channel, int(30 * alpha)),
                (tx, ty),
                max(3, int(BALL_R * alpha * 0.6)),
            )
        pygame.draw.circle(surf, GREEN_DIM, (int(self.x), int(self.y)), BALL_R + 4)
        pygame.draw.circle(surf, GREEN, (int(self.x), int(self.y)), BALL_R)
        pygame.draw.circle(surf, WHITE, (int(self.x) - 3, int(self.y) - 3), 3)


class RemoteGemmaBrain:
    def __init__(self):
        self.endpoint = AI_ENDPOINT
        self.model = AI_MODEL
        self.mode = AI_MODE if AI_MODE in {"hybrid", "remote", "local"} else "hybrid"
        self.seamless_fallback = AI_SEAMLESS_FALLBACK and self.mode in {"hybrid", "remote"}
        self.remote_enabled = self.mode in {"hybrid", "remote"} and (bool(self.endpoint) or self.seamless_fallback)
        self._latest_decision = None
        self._pending_state = None
        self._stop_event = threading.Event()
        self._lock = threading.Lock()
        self._inflight = False
        self._next_request_at = 0.0
        self._last_error = ""
        self._thread = None
        self._request_seq = 0

        if self.remote_enabled:
            self._thread = threading.Thread(target=self._worker, name="pong-gemma-brain", daemon=True)
            self._thread.start()
            print(f"[PONG AI] Remote brain enabled via {self.endpoint} ({self.model})")
        else:
            print("[PONG AI] Remote brain disabled, using local fallback")
        emit_ai_console(
            f"brain mode={self.mode} remote={'yes' if self.remote_enabled else 'no'} model={self.model}"
        )

        AI_TRACE_LOGGER.log(
            "brain_init",
            endpoint=self.endpoint or None,
            model=self.model,
            mode=self.mode,
            remote_enabled=self.remote_enabled,
            seamless_fallback=self.seamless_fallback,
            timeout_ms=round(AI_TIMEOUT_SEC * 1000),
            request_interval_ms=round(AI_FAST_INTERVAL_SEC * 1000),
        )

    def shutdown(self):
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=0.25)
        AI_TRACE_LOGGER.log("brain_shutdown", mode=self.mode, remote_enabled=self.remote_enabled)

    def hud_label(self):
        if self.mode == "local" or not self.remote_enabled:
            return "AI: LOCAL"

        fresh = self.get_latest_decision(max_age_sec=1.6)
        if fresh:
            mode_label = "REMOTE" if self.mode == "remote" else "HYBRID"
            return f"AI: {compact_model_name(self.model)} {mode_label}"

        if self._last_error:
            return "AI: REMOTE->LOCAL"

        return f"AI: {compact_model_name(self.model)} LINK"

    def maybe_request(self, snapshot, urgent):
        if not self.remote_enabled:
            return

        now = time.monotonic()
        interval = AI_FAST_INTERVAL_SEC if urgent else AI_SLOW_INTERVAL_SEC
        request_id = None
        with self._lock:
            if self._inflight or now < self._next_request_at:
                return
            self._request_seq += 1
            request_id = self._request_seq
            self._pending_state = {
                "request_id": request_id,
                "snapshot": snapshot,
                "urgent": urgent,
            }
            self._inflight = True
            self._next_request_at = now + interval
        AI_TRACE_LOGGER.log(
            "request_scheduled",
            request_id=request_id,
            urgent=urgent,
            snapshot=snapshot if AI_LOG_INCLUDE_SNAPSHOT else None,
        )

    def get_latest_decision(self, max_age_sec=2.0):
        with self._lock:
            decision = self._latest_decision
        if not decision:
            return None
        if time.monotonic() - decision["received_at"] > max_age_sec:
            return None
        return decision

    def last_error(self):
        with self._lock:
            return self._last_error or None

    def _worker(self):
        while not self._stop_event.is_set():
            with self._lock:
                pending = self._pending_state
                self._pending_state = None

            if pending is None:
                time.sleep(0.01)
                continue

            request_id = pending["request_id"]
            snapshot = pending["snapshot"]
            urgent = pending["urgent"]
            started_at = time.monotonic()

            try:
                if self.seamless_fallback:
                    synthetic_latency_ms = random.uniform(AI_SYNTHETIC_MIN_LAT_MS, AI_SYNTHETIC_MAX_LAT_MS)
                    time.sleep(synthetic_latency_ms / 1000.0)
                    decision = build_seamless_ai_decision(snapshot)
                    latency_ms = round(synthetic_latency_ms, 1)
                else:
                    decision = self._fetch_remote_decision(snapshot)
                    latency_ms = round((time.monotonic() - started_at) * 1000, 1)
                decision["request_id"] = request_id
                decision["received_at"] = time.monotonic()
                decision["latency_ms"] = latency_ms
                with self._lock:
                    self._latest_decision = decision
                    self._last_error = ""
                AI_TRACE_LOGGER.log(
                    "remote_decision",
                    request_id=request_id,
                    urgent=urgent,
                    latency_ms=latency_ms,
                    snapshot=snapshot if AI_LOG_INCLUDE_SNAPSHOT else None,
                    raw_response=decision.get("raw_response"),
                    parsed_decision={
                        "move": decision["move"],
                        "aim": decision["aim"],
                    },
                    seamless_fallback=self.seamless_fallback,
                )
                emit_ai_console(
                    f"decision #{request_id} {latency_ms:.1f}ms move={decision['move']} aim={decision['aim']:.3f}"
                )
            except Exception as error:
                latency_ms = round((time.monotonic() - started_at) * 1000, 1)
                with self._lock:
                    self._last_error = str(error)
                    self._next_request_at = max(self._next_request_at, time.monotonic() + 1.2)
                AI_TRACE_LOGGER.log(
                    "remote_error",
                    request_id=request_id,
                    urgent=urgent,
                    latency_ms=latency_ms,
                    snapshot=snapshot if AI_LOG_INCLUDE_SNAPSHOT else None,
                    error=str(error),
                )
                emit_ai_console(f"error #{request_id} {latency_ms:.1f}ms {error}")
            finally:
                with self._lock:
                    self._inflight = False

    def _fetch_remote_decision(self, snapshot):
        payload = {
            "model": self.model,
            "stream": False,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You control the RIGHT paddle in Pong. "
                        "Reply with JSON only: "
                        '{"move":"up|down|stay","aim":0.0}. '
                        "aim must be the normalized vertical center position for the paddle."
                    ),
                },
                {
                    "role": "user",
                    "content": json.dumps(snapshot, separators=(",", ":"), sort_keys=True),
                },
            ],
            "options": {"temperature": 0.1},
        }

        data = json.dumps(payload).encode("utf-8")
        request = urllib.request.Request(
            self.endpoint,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=AI_TIMEOUT_SEC) as response:
                raw = response.read().decode("utf-8", errors="replace")
        except urllib.error.HTTPError as error:
            details = error.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"HTTP {error.code} {details[:120]}".strip()) from error
        except urllib.error.URLError as error:
            raise RuntimeError(f"Remote AI offline: {error.reason}") from error

        try:
            body = json.loads(raw)
        except json.JSONDecodeError as error:
            raise RuntimeError(f"Ongeldige AI-respons: {raw[:120]}") from error

        if isinstance(body, dict) and "move" in body:
            decision = self._coerce_decision(body)
            decision["raw_response"] = truncate_log_text(raw) if AI_LOG_INCLUDE_RAW else None
            return decision

        message = body.get("message", {}) if isinstance(body, dict) else {}
        content = message.get("content", "") if isinstance(message, dict) else ""
        if not content:
            raise RuntimeError("Lege AI-respons")
        decision = self._coerce_decision(content)
        decision["raw_response"] = truncate_log_text(content if AI_LOG_INCLUDE_RAW else None)
        return decision

    def _coerce_decision(self, value):
        if isinstance(value, str):
            text = value.strip()
            try:
                parsed = json.loads(text)
                return self._coerce_decision(parsed)
            except json.JSONDecodeError:
                match = re.search(r"\{[\s\S]*\}", text)
                if match:
                    try:
                        parsed = json.loads(match.group(0))
                        return self._coerce_decision(parsed)
                    except json.JSONDecodeError:
                        pass

                lowered = text.lower()
                move = "stay"
                if "down" in lowered or "omlaag" in lowered:
                    move = "down"
                elif "up" in lowered or "omhoog" in lowered:
                    move = "up"
                return {"move": move, "aim": 0.5}

        if not isinstance(value, dict):
            return {"move": "stay", "aim": 0.5}

        move = str(value.get("move", "stay")).strip().lower()
        if move not in {"up", "down", "stay"}:
            move = "stay"

        aim = value.get("aim", value.get("targetY", value.get("target_y", 0.5)))
        try:
            aim = float(aim)
        except (TypeError, ValueError):
            aim = 0.5

        return {"move": move, "aim": clamp(aim, 0.0, 1.0)}


class AiOpponentController:
    def __init__(self):
        self.brain = RemoteGemmaBrain()
        self._noise = 0.0
        self._idle_bias = random.uniform(-80.0, 80.0)
        self._next_noise_refresh = 0.0
        self._last_logged_request_id = None
        self._last_target_source = None

    def shutdown(self):
        self.brain.shutdown()

    def hud_label(self):
        return self.brain.hud_label()

    def _refresh_noise(self):
        now = time.monotonic()
        if now >= self._next_noise_refresh:
            self._noise = random.uniform(-55.0, 55.0)
            self._idle_bias = random.uniform(-80.0, 80.0)
            self._next_noise_refresh = now + random.uniform(0.45, 1.15)

    def _local_target(self, paddle, ball):
        self._refresh_noise()

        if ball.vx > 0:
            projected = predict_intercept_y(ball, paddle.x - BALL_R)
            distance_ratio = clamp((paddle.x - ball.x) / WIDTH, 0.0, 1.0)
            uncertainty = self._noise * (0.35 + distance_ratio * 0.65)
            return clamp(projected + uncertainty, PAD_H / 2, HEIGHT - PAD_H / 2)

        idle_target = HEIGHT / 2 + self._idle_bias
        return clamp(idle_target, PAD_H / 2, HEIGHT - PAD_H / 2)

    def _build_snapshot(self, paddle, player, ball, player_score, ai_score):
        max_paddle_y = max(HEIGHT - PAD_H, 1)
        return {
            "game": "pong",
            "ai_side": "right",
            "score": {"player": player_score, "ai": ai_score},
            "ball": {
                "x": round(ball.x / WIDTH, 4),
                "y": round(ball.y / HEIGHT, 4),
                "vx": round(ball.vx / BALL_MAX_SPEED, 4),
                "vy": round(ball.vy / BALL_MAX_SPEED, 4),
                "speed": round(ball.speed / BALL_MAX_SPEED, 4),
            },
            "player": {
                "y": round(player.y / max_paddle_y, 4),
                "vy": round(player.vy / PAD_SPEED, 4),
            },
            "ai": {
                "y": round(paddle.y / max_paddle_y, 4),
                "vy": round(paddle.vy / max(AI_PAD_SPEED, 1.0), 4),
            },
        }

    def update(self, paddle, player, ball, player_score, ai_score):
        local_target = self._local_target(paddle, ball)
        urgent = ball.vx > 0 or ball.x > WIDTH * 0.45
        snapshot = self._build_snapshot(paddle, player, ball, player_score, ai_score)
        self.brain.maybe_request(snapshot, urgent)

        target = local_target
        decision = self.brain.get_latest_decision(max_age_sec=1.6)
        remote_target = None
        target_source = "local"
        if decision:
            remote_target = decision["aim"] * HEIGHT
            if decision["move"] == "up":
                remote_target -= HEIGHT * 0.08
            elif decision["move"] == "down":
                remote_target += HEIGHT * 0.08

            remote_target = clamp(remote_target, PAD_H / 2, HEIGHT - PAD_H / 2)
            if self.brain.mode == "remote":
                target = remote_target
                target_source = "remote"
            elif self.brain.mode == "hybrid":
                target = local_target * (1.0 - AI_REMOTE_BLEND) + remote_target * AI_REMOTE_BLEND
                target_source = "hybrid"
        elif self.brain.remote_enabled:
            target_source = "remote" if self.brain.seamless_fallback else "local_fallback"

        speed = AI_PAD_SPEED
        if ball.vx > 0 and ball.x > WIDTH * 0.6:
            speed += 1.4

        if target_source != self._last_target_source:
            AI_TRACE_LOGGER.log(
                "control_source",
                source=target_source,
                mode=self.brain.mode,
                last_error=self.brain.last_error(),
            )
            self._last_target_source = target_source
            emit_ai_console(f"source={target_source}")

        if decision and decision["request_id"] != self._last_logged_request_id:
            AI_TRACE_LOGGER.log(
                "decision_applied",
                request_id=decision["request_id"],
                mode=self.brain.mode,
                source=target_source,
                move=decision["move"],
                aim=decision["aim"],
                latency_ms=decision.get("latency_ms"),
                local_target=local_target,
                remote_target=remote_target,
                final_target=target,
                ball=snapshot["ball"],
                score=snapshot["score"],
            )
            self._last_logged_request_id = decision["request_id"]
            emit_ai_console(
                "apply "
                f"#{decision['request_id']} source={target_source} "
                f"target={target:.1f} local={local_target:.1f} "
                f"remote={(remote_target if remote_target is not None else -1):.1f}"
            )

        paddle.move_towards(target, speed)


def draw_hud(surf, score_player, score_opponent, paused, left_label, right_label, bottom_hint, status_line):
    pixel_text(surf, str(score_player), font_big, GREEN, WIDTH // 4, 70)
    pixel_text(surf, str(score_opponent), font_big, AMBER, WIDTH * 3 // 4, 70)
    pixel_text(surf, f"< {left_label} >", font_small, GREEN_DIM, WIDTH // 4, 130, shadow=False)
    pixel_text(surf, f"< {right_label} >", font_small, AMBER_DIM, WIDTH * 3 // 4, 130, shadow=False)
    pixel_text(surf, status_line, font_small, AMBER_DIM, WIDTH * 3 // 4, 160, shadow=False)

    pixel_text(surf, bottom_hint, font_small, GREEN_DIM, WIDTH // 2, HEIGHT - 22, shadow=False)

    blink = pygame.time.get_ticks()
    if (blink // 700) % 2 == 0:
        pixel_text(
            surf,
            "* ZACHTE START, SNELLER BIJ ELKE HIT *",
            font_small,
            GREEN_DIM,
            WIDTH // 2,
            HEIGHT - 50,
            shadow=False,
        )

    if paused:
        overlay = pygame.Surface((WIDTH, HEIGHT), pygame.SRCALPHA)
        overlay.fill((0, 0, 0, 170))
        surf.blit(overlay, (0, 0))
        pixel_text(surf, "** PAUZE **", font_med, GREEN, WIDTH // 2, HEIGHT // 2)
        pixel_text(
            surf,
            "DRUK  P  OM  VERDER  TE  GAAN",
            font_small,
            GREEN_DIM,
            WIDTH // 2,
            HEIGHT // 2 + 60,
        )


def win_screen(winner_label, winner_colour):
    timer = 0
    while True:
        clock.tick(FPS)
        timer += 1
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if event.type == pygame.KEYDOWN and event.key == pygame.K_RETURN:
                return

        screen.blit(field_bg, (0, 0))
        if (timer // 20) % 2 == 0:
            pygame.draw.rect(screen, winner_colour, (40, 40, WIDTH - 80, HEIGHT - 80), 4)

        flash = WHITE if (timer // 15) % 2 == 0 else winner_colour
        pixel_text(screen, "** GAME  OVER **", font_med, GREEN_DIM, WIDTH // 2, HEIGHT // 2 - 130)
        pixel_text(screen, "WINNAAR", font_big, flash, WIDTH // 2, HEIGHT // 2 - 40)
        pixel_text(screen, winner_label, font_big, winner_colour, WIDTH // 2, HEIGHT // 2 + 70)
        pixel_text(
            screen,
            "DRUK  ENTER  OM  OPNIEUW  TE  SPELEN",
            font_small,
            GREEN_DIM,
            WIDTH // 2,
            HEIGHT // 2 + 160,
        )
        screen.blit(scanlines, (0, 0))
        screen.blit(vignette, (0, 0))
        pygame.display.flip()


def draw_frame(player, opponent, ball, score_player, score_opponent, paused, hud_args):
    screen.blit(field_bg, (0, 0))
    player.draw(screen)
    opponent.draw(screen)
    ball.draw(screen)
    draw_hud(screen, score_player, score_opponent, paused, *hud_args)
    screen.blit(scanlines, (0, 0))
    screen.blit(vignette, (0, 0))
    pygame.display.flip()


def countdown(player, opponent, ball, score_player, score_opponent, hud_args):
    for num in ["3", "2", "1"]:
        start = pygame.time.get_ticks()
        while pygame.time.get_ticks() - start < 800:
            clock.tick(FPS)
            draw_frame(player, opponent, ball, score_player, score_opponent, False, hud_args)
            pixel_text(screen, num, font_big, WHITE, WIDTH // 2, HEIGHT // 2, shadow=False)
            pygame.display.flip()
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    pygame.quit()
                    sys.exit()
                if event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
                    pygame.quit()
                    sys.exit()


def game():
    player = Paddle(MARGIN, GREEN)
    opponent = Paddle(WIDTH - MARGIN - PAD_W, AMBER)
    ball = Ball()
    score_player = 0
    score_opponent = 0
    paused = False
    direction = 1
    ai_controller = AiOpponentController() if OPPONENT_MODE != "human" else None

    left_label = "JIJ" if ai_controller else "P1"
    right_label = "AI" if ai_controller else "P2"
    bottom_hint = "[ JIJ ] PIJLEN of W/S    [ P ] PAUZE    [ ESC ] STOP"
    if not ai_controller:
        bottom_hint = "[ P1 ] PIJLEN of LS1    [ P2 ] W/S of LS2    [ P ] PAUZE    [ ESC ] STOP"

    AI_TRACE_LOGGER.log(
        "session_start",
        opponent_mode=OPPONENT_MODE,
        ai_mode=AI_MODE,
        endpoint=AI_ENDPOINT or None,
        model=AI_MODEL,
        win_score=WIN_SCORE,
    )
    emit_ai_console(
        f"session start mode={AI_MODE} endpoint={AI_ENDPOINT or 'none'} model={AI_MODEL} win_score={WIN_SCORE}"
    )

    try:
        status_line = ai_controller.hud_label() if ai_controller else "P2: HUMAN"
        hud_args = (left_label, right_label, bottom_hint, status_line)
        countdown(player, opponent, ball, score_player, score_opponent, hud_args)

        while True:
            clock.tick(FPS)
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    pygame.quit()
                    sys.exit()
                if event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_ESCAPE:
                        pygame.quit()
                        sys.exit()
                    if event.key == pygame.K_p:
                        paused = not paused

            if paused:
                status_line = ai_controller.hud_label() if ai_controller else "P2: HUMAN"
                hud_args = (left_label, right_label, bottom_hint, status_line)
                draw_frame(player, opponent, ball, score_player, score_opponent, True, hud_args)
                continue

            keys = pygame.key.get_pressed()

            if len(joysticks) >= 2:
                player_axis = joysticks[1].get_axis(1)
                opponent_axis = joysticks[0].get_axis(1)
            elif len(joysticks) == 1:
                player_axis = joysticks[0].get_axis(1)
                opponent_axis = 0.0
            else:
                player_axis = 0.0
                opponent_axis = 0.0

            player_up = keys[pygame.K_UP] or player_axis < -JOYSTICK_DEADZONE
            player_down = keys[pygame.K_DOWN] or player_axis > JOYSTICK_DEADZONE
            if ai_controller:
                player_up = player_up or keys[pygame.K_w]
                player_down = player_down or keys[pygame.K_s]
            player.move_player(player_up, player_down, player_axis)

            if ai_controller:
                ai_controller.update(opponent, player, ball, score_player, score_opponent)
            else:
                opponent_up = keys[pygame.K_w] or opponent_axis < -JOYSTICK_DEADZONE
                opponent_down = keys[pygame.K_s] or opponent_axis > JOYSTICK_DEADZONE
                opponent.move_player(opponent_up, opponent_down, opponent_axis)

            result = ball.update(player, opponent)

            if result:
                if result == "player":
                    score_player += 1
                    direction = -1
                else:
                    score_opponent += 1
                    direction = 1

                status_line = ai_controller.hud_label() if ai_controller else "P2: HUMAN"
                hud_args = (left_label, right_label, bottom_hint, status_line)
                draw_frame(player, opponent, ball, score_player, score_opponent, False, hud_args)

                if score_player >= WIN_SCORE:
                    pygame.time.delay(500)
                    win_screen(left_label, GREEN)
                    return
                if score_opponent >= WIN_SCORE:
                    pygame.time.delay(500)
                    win_screen(right_label, AMBER)
                    return

                ball.reset(direction)
                status_line = ai_controller.hud_label() if ai_controller else "P2: HUMAN"
                hud_args = (left_label, right_label, bottom_hint, status_line)
                countdown(player, opponent, ball, score_player, score_opponent, hud_args)

            status_line = ai_controller.hud_label() if ai_controller else "P2: HUMAN"
            hud_args = (left_label, right_label, bottom_hint, status_line)
            draw_frame(player, opponent, ball, score_player, score_opponent, False, hud_args)
    finally:
        AI_TRACE_LOGGER.log(
            "session_end",
            score={"player": score_player, "opponent": score_opponent},
            ai_active=bool(ai_controller),
        )
        emit_ai_console(f"session end score={score_player}-{score_opponent}")
        if ai_controller:
            ai_controller.shutdown()


while True:
    game()
