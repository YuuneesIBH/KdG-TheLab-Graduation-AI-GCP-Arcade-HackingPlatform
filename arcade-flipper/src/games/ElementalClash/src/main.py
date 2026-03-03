import math
import random
import pygame
from pygame import mixer
from pygame import font
import os
import sys

# Ensure the src directory is on the path so fighter.py can be found
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fighter import Fighter

# Configure embedded/windowed mode from launcher environment variables.
def parse_window_size(raw_value):
    if not raw_value:
        return None

    cleaned = raw_value.strip().lower().replace(" ", "")
    parts = cleaned.split("x" if "x" in cleaned else ",")
    if len(parts) != 2:
        return None

    try:
        width = max(320, int(parts[0]))
        height = max(240, int(parts[1]))
        return width, height
    except ValueError:
        return None


embedded_mode = os.environ.get("ARCADE_EMBEDDED") == "1"
window_size = parse_window_size(os.environ.get("ARCADE_WINDOW_SIZE"))
window_pos = os.environ.get("ARCADE_WINDOW_POS")

if window_pos:
    os.environ["SDL_VIDEO_WINDOW_POS"] = window_pos

# Helper Function for Bundled Assets
def resource_path(relative_path):
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    return os.path.join(base_path, relative_path)


def load_image_with_fallback(relative_path, alpha=False):
    root, ext = os.path.splitext(relative_path)
    candidates = [relative_path]
    for alt_ext in [".png", ".jpg", ".jpeg", ".webp"]:
        if alt_ext != ext.lower():
            candidates.append(root + alt_ext)

    for candidate in candidates:
        full_path = resource_path(candidate)
        if os.path.exists(full_path):
            img = pygame.image.load(full_path)
            return img.convert_alpha() if alpha else img.convert()

    raise FileNotFoundError(f"Image not found for any fallback path: {relative_path}")


def build_blurred_background(image, width, height):
    scaled = pygame.transform.smoothscale(image, (width, height))
    tiny = pygame.transform.smoothscale(scaled, (max(1, width // 8), max(1, height // 8)))
    blurred = pygame.transform.smoothscale(tiny, (width, height))
    return scaled, blurred

mixer.init()
pygame.init()

# Constants
if window_size:
    SCREEN_WIDTH, SCREEN_HEIGHT = window_size
else:
    info = pygame.display.Info()
    SCREEN_WIDTH = info.current_w
    SCREEN_HEIGHT = info.current_h

FPS = 60
ROUND_OVER_COOLDOWN = 3000
FLOOR_DEPTH = max(90, SCREEN_HEIGHT // 8)
GROUND_Y = SCREEN_HEIGHT - FLOOR_DEPTH
HUD_HEIGHT = 96
HEALTH_PANEL_H = 58

# Arcade Color Palette
RED = (255, 30, 30)
YELLOW = (255, 230, 0)
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
BLUE = (30, 100, 255)
GREEN = (0, 255, 80)
NEON_PINK = (255, 0, 180)
NEON_CYAN = (0, 230, 255)
NEON_ORANGE = (255, 140, 0)
DARK_BG = (5, 5, 20)
PURPLE = (160, 0, 255)

# Initialize Game Window
display_flags = pygame.NOFRAME | pygame.SCALED
if not embedded_mode:
    display_flags |= pygame.FULLSCREEN
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT), display_flags)
pygame.display.set_caption("Street Fighter ARCADE")
clock = pygame.time.Clock()

# Load Assets
bg_image = load_image_with_fallback("assets/images/bg1.jpg", alpha=False)
bg_scaled, bg_blurred = build_blurred_background(bg_image, SCREEN_WIDTH, SCREEN_HEIGHT)
victory_img = load_image_with_fallback("assets/images/victory.png", alpha=True)
warrior_sheet = load_image_with_fallback("assets/images/warrior.png", alpha=True)
wizard_sheet = load_image_with_fallback("assets/images/wizard.png", alpha=True)

# Fonts
menu_font = pygame.font.Font(resource_path("assets/fonts/turok.ttf"), 50)
menu_font_title = pygame.font.Font(resource_path("assets/fonts/turok.ttf"), 100)
count_font = pygame.font.Font(resource_path("assets/fonts/turok.ttf"), 80)
score_font = pygame.font.Font(resource_path("assets/fonts/turok.ttf"), 30)
combo_font = pygame.font.Font(resource_path("assets/fonts/turok.ttf"), 60)
small_font = pygame.font.Font(resource_path("assets/fonts/turok.ttf"), 24)

# Music and Sounds
pygame.mixer.music.load(resource_path("assets/audio/music.mp3"))
pygame.mixer.music.set_volume(0.5)
pygame.mixer.music.play(-1, 0.0, 5000)
sword_fx = pygame.mixer.Sound(resource_path("assets/audio/sword.wav"))
sword_fx.set_volume(0.5)
magic_fx = pygame.mixer.Sound(resource_path("assets/audio/magic.wav"))
magic_fx.set_volume(0.75)

# Define Animation Steps
WARRIOR_ANIMATION_STEPS = [10, 8, 1, 7, 7, 3, 7]
WIZARD_ANIMATION_STEPS = [8, 8, 1, 8, 8, 3, 7]

# Fighter Data
WARRIOR_SIZE = 162
WARRIOR_SCALE = 7
WARRIOR_OFFSET = [72, 46]
WARRIOR_DATA = [WARRIOR_SIZE, WARRIOR_SCALE, WARRIOR_OFFSET]
WIZARD_SIZE = 250
WIZARD_SCALE = 6
WIZARD_OFFSET = [112, 97]
WIZARD_DATA = [WIZARD_SIZE, WIZARD_SCALE, WIZARD_OFFSET]


def extract_victory_pose(sprite_sheet, frame_size, row=0, col=0, target_height=300):
    frame = sprite_sheet.subsurface(col * frame_size, row * frame_size, frame_size, frame_size).copy()
    mask = pygame.mask.from_surface(frame)
    bounds = mask.get_bounding_rects()
    if bounds:
        crop = bounds[0].copy()
        for rect in bounds[1:]:
            crop = crop.union(rect)
        frame = frame.subsurface(crop).copy()
    target_height = max(80, target_height)
    scale = target_height / max(1, frame.get_height())
    target_size = (max(1, int(frame.get_width() * scale)), int(target_height))
    return pygame.transform.smoothscale(frame, target_size)


warrior_victory_pose = extract_victory_pose(
    warrior_sheet, WARRIOR_SIZE, row=0, col=0, target_height=int(SCREEN_HEIGHT * 0.28)
)
wizard_victory_pose = extract_victory_pose(
    wizard_sheet, WIZARD_SIZE, row=0, col=0, target_height=int(SCREEN_HEIGHT * 0.28)
)

# Game Variables
score = [0, 0]

# --- ARCADE SYSTEMS ---
shake_duration = 0
shake_intensity = 0
particles = []
hit_flash_timer = 0
combo = [0, 0]
combo_timer = [0, 0]
COMBO_TIMEOUT = 120
floating_texts = []

# Pre-generate scanline overlay
scanline_surface = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
for y in range(0, SCREEN_HEIGHT, 4):
    pygame.draw.line(scanline_surface, (0, 0, 0, 55), (0, y), (SCREEN_WIDTH, y))

# Stars for menu
stars = [(random.randint(0, SCREEN_WIDTH), random.randint(0, SCREEN_HEIGHT), random.random()) for _ in range(200)]


class Particle:
    def __init__(self, x, y, color, vel_x=None, vel_y=None):
        self.x = x
        self.y = y
        self.color = color
        self.vel_x = vel_x if vel_x is not None else random.uniform(-6, 6)
        self.vel_y = vel_y if vel_y is not None else random.uniform(-8, -2)
        self.lifetime = random.randint(20, 50)
        self.max_lifetime = self.lifetime
        self.size = random.randint(3, 8)

    def update(self):
        self.x += self.vel_x
        self.y += self.vel_y
        self.vel_y += 0.3
        self.lifetime -= 1

    def draw(self, surface):
        alpha = int(255 * (self.lifetime / self.max_lifetime))
        size = max(1, int(self.size * (self.lifetime / self.max_lifetime)))
        s = pygame.Surface((size * 2, size * 2), pygame.SRCALPHA)
        pygame.draw.circle(s, (*self.color, alpha), (size, size), size)
        surface.blit(s, (int(self.x - size), int(self.y - size)))


class FloatingText:
    def __init__(self, text, x, y, color, font_obj):
        self.text = text
        self.x = x
        self.y = y
        self.color = color
        self.font = font_obj
        self.lifetime = 90
        self.max_lifetime = 90

    def update(self):
        self.y -= 1.5
        self.lifetime -= 1

    def draw(self, surface):
        alpha = int(255 * (self.lifetime / self.max_lifetime))
        img = self.font.render(self.text, True, self.color)
        s = pygame.Surface(img.get_size(), pygame.SRCALPHA)
        s.blit(img, (0, 0))
        s.set_alpha(alpha)
        surface.blit(s, (int(self.x - img.get_width() // 2), int(self.y - img.get_height() // 2)))


def spawn_hit_particles(x, y, color):
    for _ in range(18):
        particles.append(Particle(x, y, color))


def trigger_screen_shake(intensity=8, duration=15):
    global shake_duration, shake_intensity
    shake_duration = duration
    shake_intensity = intensity


def get_shake_offset():
    global shake_duration
    if shake_duration > 0:
        shake_duration -= 1
        return random.randint(-shake_intensity, shake_intensity), random.randint(-shake_intensity, shake_intensity)
    return 0, 0


def draw_text(text, font, color, x, y):
    img = font.render(text, True, color)
    screen.blit(img, (x, y))


def draw_text_with_outline(text, font_obj, color, outline_color, x, y, outline_size=2):
    for dx in range(-outline_size, outline_size + 1):
        for dy in range(-outline_size, outline_size + 1):
            if dx != 0 or dy != 0:
                screen.blit(font_obj.render(text, True, outline_color), (x + dx, y + dy))
    screen.blit(font_obj.render(text, True, color), (x, y))


def draw_bg(is_game_started=False):
    if not is_game_started:
        screen.blit(bg_blurred, (0, 0))
        dark_overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
        dark_overlay.fill((0, 0, 30, 140))
        screen.blit(dark_overlay, (0, 0))
    else:
        screen.blit(bg_scaled, (0, 0))


def draw_crt_overlay():
    screen.blit(scanline_surface, (0, 0))
    # Vignette
    vignette = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
    cx, cy = SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2
    max_r = int(math.sqrt(cx**2 + cy**2))
    for r in range(max_r, max_r - 200, -20):
        alpha = int(80 * (1 - (r - (max_r - 200)) / 200))
        pygame.draw.circle(vignette, (0, 0, 0, alpha), (cx, cy), r, 25)
    screen.blit(vignette, (0, 0))


def draw_neon_border(rect, color, glow_size=3):
    for i in range(glow_size, 0, -1):
        alpha = int(80 / i)
        s = pygame.Surface((rect.width + i * 4, rect.height + i * 4), pygame.SRCALPHA)
        pygame.draw.rect(s, (*color, alpha), (0, 0, rect.width + i * 4, rect.height + i * 4), 2)
        screen.blit(s, (rect.x - i * 2, rect.y - i * 2))
    pygame.draw.rect(screen, color, rect, 2)


def draw_arcade_panel(rect, top_color, bottom_color, border_color, alpha=210, glow_size=2):
    panel = pygame.Surface((rect.width, rect.height), pygame.SRCALPHA)
    for y in range(rect.height):
        mix = y / max(1, rect.height - 1)
        r = int(top_color[0] * (1 - mix) + bottom_color[0] * mix)
        g = int(top_color[1] * (1 - mix) + bottom_color[1] * mix)
        b = int(top_color[2] * (1 - mix) + bottom_color[2] * mix)
        pygame.draw.line(panel, (r, g, b, alpha), (0, y), (rect.width, y))
    screen.blit(panel, (rect.x, rect.y))
    draw_neon_border(rect, border_color, glow_size)


def draw_button(text, font, text_col, button_col, x, y, width, height, glow_color=None):
    btn_surf = pygame.Surface((width, height), pygame.SRCALPHA)
    for i in range(height):
        alpha = int(200 - (i / height) * 80)
        r, g, b = button_col
        pygame.draw.line(btn_surf, (r, g, b, alpha), (0, i), (width, i))
    screen.blit(btn_surf, (x, y))
    btn_rect = pygame.Rect(x, y, width, height)
    gc = glow_color or button_col
    draw_neon_border(btn_rect, gc)
    mx, my = pygame.mouse.get_pos()
    if btn_rect.collidepoint(mx, my):
        hover_surf = pygame.Surface((width, height), pygame.SRCALPHA)
        hover_surf.fill((*gc, 50))
        screen.blit(hover_surf, (x, y))
    text_img = font.render(text, True, text_col)
    text_rect = text_img.get_rect(center=(x + width // 2, y + height // 2))
    glow_img = font.render(text, True, gc)
    glow_s = pygame.Surface(glow_img.get_size(), pygame.SRCALPHA)
    glow_s.blit(glow_img, (0, 0))
    glow_s.set_alpha(50)
    for offset in [(-2, 0), (2, 0), (0, -2), (0, 2)]:
        screen.blit(glow_s, (text_rect.x + offset[0], text_rect.y + offset[1]))
    screen.blit(text_img, text_rect)
    return btn_rect


def draw_stars(t):
    for i, (sx, sy, speed) in enumerate(stars):
        brightness = int(100 + 100 * math.sin(t * speed * 3 + i))
        size = 1 if speed < 0.5 else 2
        pygame.draw.circle(screen, (brightness, brightness, brightness), (sx, sy), size)


def draw_ticker(t):
    ticker_y = SCREEN_HEIGHT - 40
    ticker_bg = pygame.Surface((SCREEN_WIDTH, 40), pygame.SRCALPHA)
    ticker_bg.fill((0, 0, 0, 180))
    screen.blit(ticker_bg, (0, ticker_y))
    pygame.draw.line(screen, NEON_CYAN, (0, ticker_y), (SCREEN_WIDTH, ticker_y), 1)
    ticker_text = "   PRESS START   ★   HIGH SCORE   ★   PLAYER VS PLAYER   ★   COMBO ATTACKS   ★   "
    ticker_img = small_font.render(ticker_text, True, YELLOW)
    offset = int(t * 120) % (ticker_img.get_width() + SCREEN_WIDTH)
    screen.blit(ticker_img, (SCREEN_WIDTH - offset, ticker_y + 8))


def draw_health_bar(health, x, y, width, label, player=1):
    accent = NEON_CYAN if player == 1 else NEON_PINK
    panel_rect = pygame.Rect(x, y, width, HEALTH_PANEL_H)
    draw_arcade_panel(panel_rect, (24, 28, 56), (6, 8, 22), accent, 215, 2)

    title_img = small_font.render(label, True, accent)
    hp_text = small_font.render(f"{max(0, health):03d} HP", True, WHITE)
    screen.blit(title_img, (x + 12, y + 6))
    screen.blit(hp_text, (x + width - hp_text.get_width() - 12, y + 6))

    bar_x = x + 12
    bar_y = y + 28
    bar_w = width - 24
    bar_h = 23
    pygame.draw.rect(screen, (40, 10, 10), (bar_x, bar_y, bar_w, bar_h))

    if health > 0:
        fill_w = int(health * bar_w / 100)
        t = pygame.time.get_ticks()
        if health > 50:
            c1, c2 = (30, 240, 120), (0, 150, 70)
        elif health > 25:
            c1, c2 = (255, 220, 30), (220, 130, 0)
        else:
            pulse = abs(math.sin(t * 0.01)) * 60
            c1, c2 = (255, 70, 30), (200, int(pulse), 0)
        for i in range(bar_h):
            mix = i / max(1, bar_h - 1)
            rc = int(c1[0] * (1 - mix) + c2[0] * mix)
            gc = int(c1[1] * (1 - mix) + c2[1] * mix)
            bc = int(c1[2] * (1 - mix) + c2[2] * mix)
            pygame.draw.line(screen, (rc, gc, bc), (bar_x, bar_y + i), (bar_x + fill_w, bar_y + i))
        shine = pygame.Surface((fill_w, bar_h // 2), pygame.SRCALPHA)
        shine.fill((255, 255, 255, 35))
        screen.blit(shine, (bar_x, bar_y))

    for seg in range(1, 12):
        sx = bar_x + int(bar_w * seg / 12)
        pygame.draw.line(screen, (0, 0, 0), (sx, bar_y), (sx, bar_y + bar_h), 1)
    draw_neon_border(pygame.Rect(bar_x, bar_y, bar_w, bar_h), accent, 1)


def draw_timer(frame_count):
    timer_val = max(0, 99 - frame_count // FPS)
    color = RED if timer_val <= 10 else YELLOW
    timer_text = f"{timer_val:02d}"
    timer_rect = pygame.Rect(SCREEN_WIDTH // 2 - 70, 8, 140, 80)
    draw_arcade_panel(timer_rect, (30, 20, 40), (8, 8, 18), color, 215, 2)
    label = small_font.render("TIME", True, WHITE)
    screen.blit(label, (timer_rect.centerx - label.get_width() // 2, timer_rect.y + 4))
    draw_text_with_outline(timer_text, count_font, color, BLACK, timer_rect.x + 18, timer_rect.y + 6)


def draw_stage_floor(t):
    floor_h = SCREEN_HEIGHT - GROUND_Y
    if floor_h <= 0:
        return

    stage = pygame.Surface((SCREEN_WIDTH, floor_h), pygame.SRCALPHA)
    for y in range(floor_h):
        mix = y / max(1, floor_h - 1)
        r = int(4 + 12 * mix)
        g = int(12 + 18 * mix)
        b = int(30 + 30 * mix)
        pygame.draw.line(stage, (r, g, b, 195), (0, y), (SCREEN_WIDTH, y))
    screen.blit(stage, (0, GROUND_Y))

    glow = pygame.Surface((SCREEN_WIDTH, 24), pygame.SRCALPHA)
    pulse = int(60 + 40 * abs(math.sin(t * 0.006)))
    for i in range(24):
        alpha = int((24 - i) * 5 + pulse)
        pygame.draw.line(glow, (*NEON_CYAN, alpha), (0, i), (SCREEN_WIDTH, i))
    screen.blit(glow, (0, GROUND_Y - 2))
    pygame.draw.line(screen, NEON_CYAN, (0, GROUND_Y), (SCREEN_WIDTH, GROUND_Y), 3)

    step = 95
    drift = int((t * 0.18) % step)
    for x in range(-step, SCREEN_WIDTH + step, step):
        x1 = x + drift
        x2 = x1 + 35
        pygame.draw.line(screen, (20, 130, 230), (x1, GROUND_Y), (x2, SCREEN_HEIGHT), 1)


def draw_gradient_text(text, font, x, y, colors):
    offset = 2
    for i, color in enumerate(colors):
        img = font.render(text, True, color)
        screen.blit(img, (x + i * offset, y + i * offset))


def victory_screen(winner_img):
    start_time = pygame.time.get_ticks()
    for _ in range(80):
        particles.append(Particle(
            random.randint(0, SCREEN_WIDTH),
            random.randint(SCREEN_HEIGHT // 4, SCREEN_HEIGHT // 2),
            random.choice([YELLOW, NEON_PINK, NEON_CYAN, GREEN, WHITE])
        ))
    while pygame.time.get_ticks() - start_time < ROUND_OVER_COOLDOWN:
        t = pygame.time.get_ticks()
        draw_bg(True)
        for p in particles[:]:
            p.update()
            p.draw(screen)
            if p.lifetime <= 0:
                particles.remove(p)
        if random.random() < 0.25:
            cx = random.randint(100, SCREEN_WIDTH - 100)
            cy = random.randint(50, SCREEN_HEIGHT // 2)
            for _ in range(12):
                angle = random.uniform(0, 2 * math.pi)
                speed = random.uniform(2, 8)
                particles.append(Particle(cx, cy,
                    random.choice([YELLOW, NEON_PINK, NEON_CYAN, WHITE, NEON_ORANGE]),
                    math.cos(angle) * speed, math.sin(angle) * speed))
        resized = pygame.transform.scale(victory_img, (victory_img.get_width() * 2, victory_img.get_height() * 2))
        pulse_alpha = int(180 + 60 * abs(math.sin(t * 0.005)))
        glow_s = pygame.Surface(resized.get_size(), pygame.SRCALPHA)
        glow_s.blit(resized, (0, 0))
        glow_s.set_alpha(pulse_alpha)
        vx = SCREEN_WIDTH // 2 - resized.get_width() // 2
        vy = SCREEN_HEIGHT // 2 - resized.get_height() // 2 - 50
        screen.blit(glow_s, (vx, vy))
        screen.blit(winner_img, (SCREEN_WIDTH // 2 - winner_img.get_width() // 2,
                                  SCREEN_HEIGHT // 2 - winner_img.get_height() // 2 + 100))
        draw_crt_overlay()
        pygame.display.update()
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                exit()


def main_menu():
    animation_start_time = pygame.time.get_ticks()

    while True:
        t = pygame.time.get_ticks()
        elapsed = (t - animation_start_time) / 1000

        draw_bg(is_game_started=False)
        draw_stars(t / 1000)

        for i in range(0, SCREEN_HEIGHT, 40):
            alpha = int(40 + 30 * math.sin(t * 0.003 + i * 0.05))
            s = pygame.Surface((4, 2), pygame.SRCALPHA)
            s.fill((*NEON_CYAN, alpha))
            screen.blit(s, (0, i))
            s2 = pygame.Surface((4, 2), pygame.SRCALPHA)
            s2.fill((*NEON_PINK, alpha))
            screen.blit(s2, (SCREEN_WIDTH - 4, i))

        cabinet_w = min(880, SCREEN_WIDTH - 40)
        cabinet_h = min(520, SCREEN_HEIGHT - 80)
        cabinet_rect = pygame.Rect(
            SCREEN_WIDTH // 2 - cabinet_w // 2,
            SCREEN_HEIGHT // 2 - cabinet_h // 2,
            cabinet_w,
            cabinet_h,
        )
        draw_arcade_panel(cabinet_rect, (22, 24, 52), (5, 6, 18), NEON_CYAN, 225, 3)
        inner_pad = max(12, int(min(cabinet_w, cabinet_h) * 0.03))
        inner_rect = cabinet_rect.inflate(-inner_pad * 2, -inner_pad * 2)
        draw_arcade_panel(inner_rect, (16, 14, 34), (4, 5, 14), NEON_PINK, 185, 1)

        ui_scale = max(0.62, min(cabinet_w / 880, cabinet_h / 520))
        scale_factor = 1 + 0.035 * math.sin(elapsed * 2 * math.pi)
        title_size = int(120 * ui_scale * scale_factor)
        scaled_font = pygame.font.Font(resource_path("assets/fonts/turok.ttf"), title_size)
        title_text = "STREET FIGHTER"
        title_x = SCREEN_WIDTH // 2 - scaled_font.size(title_text)[0] // 2
        title_y = cabinet_rect.y + int(42 * ui_scale)

        for glow_offset, glow_alpha in [(10, 15), (6, 35), (3, 65)]:
            for ci, gc in enumerate([NEON_CYAN, NEON_PINK, YELLOW]):
                gi = scaled_font.render(title_text, True, gc)
                gi.set_alpha(glow_alpha)
                screen.blit(gi, (title_x + ci * 2 - glow_offset, title_y + ci * 2))

        draw_text(title_text, scaled_font, (0, 0, 0), title_x + 6, title_y + 6)
        draw_gradient_text(title_text, scaled_font, title_x, title_y, [NEON_CYAN, WHITE, NEON_PINK])

        sub_font = pygame.font.Font(resource_path("assets/fonts/turok.ttf"), int(28 * ui_scale))
        sub_text = "ARCADE EDITION"
        sub_x = SCREEN_WIDTH // 2 - sub_font.size(sub_text)[0] // 2
        draw_text_with_outline(sub_text, sub_font, YELLOW, BLACK, sub_x, title_y + title_size + 5)

        bw = int(min(380, cabinet_w * 0.56))
        bh = int(max(48, 72 * ui_scale))
        bsp = int(max(14, 22 * ui_scale))
        btn_x = SCREEN_WIDTH // 2 - bw // 2
        btn_y = cabinet_rect.y + int(cabinet_h * 0.43)
        btn_font = pygame.font.Font(resource_path("assets/fonts/turok.ttf"), int(44 * ui_scale))

        start_button = draw_button("▶   START GAME", btn_font, WHITE, (0, 80, 10),
                                   btn_x, btn_y, bw, bh, GREEN)
        exit_button = draw_button("✕   QUIT", btn_font, WHITE, (90, 0, 0),
                                  btn_x, btn_y + bh + bsp, bw, bh, RED)

        info_h = int(max(54, 70 * ui_scale))
        info_rect = pygame.Rect(
            cabinet_rect.x + int(30 * ui_scale),
            cabinet_rect.bottom - info_h - int(24 * ui_scale),
            cabinet_rect.width - int(60 * ui_scale),
            info_h,
        )
        draw_arcade_panel(info_rect, (22, 26, 30), (8, 10, 12), NEON_ORANGE, 205, 1)
        ctrl_font = pygame.font.Font(resource_path("assets/fonts/turok.ttf"), int(22 * ui_scale))
        p1_ctrl = ctrl_font.render("P1  WASD + R/T", True, NEON_CYAN)
        p2_ctrl = ctrl_font.render("P2  ARROWS + M/N", True, NEON_PINK)
        range_txt = pygame.font.Font(resource_path("assets/fonts/turok.ttf"), int(17 * ui_scale)).render(
            "EXTENDED ATTACK RANGE ACTIVE", True, YELLOW)
        line1_y = info_rect.y + int(8 * ui_scale)
        line2_y = info_rect.y + int(34 * ui_scale)
        screen.blit(p1_ctrl, (info_rect.x + int(16 * ui_scale), line1_y))
        screen.blit(p2_ctrl, (info_rect.right - p2_ctrl.get_width() - int(16 * ui_scale), line1_y))
        screen.blit(range_txt, (SCREEN_WIDTH // 2 - range_txt.get_width() // 2, line2_y))

        draw_ticker(t / 1000)
        draw_crt_overlay()

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                exit()
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    pygame.quit()
                    exit()
            if event.type == pygame.MOUSEBUTTONDOWN:
                if start_button.collidepoint(event.pos):
                    return "START"
                if exit_button.collidepoint(event.pos):
                    pygame.quit()
                    exit()

        pygame.display.update()
        clock.tick(FPS)


def fighter_rect_height(data):
    size, scale, offset = data
    return max(100, size * scale - int(offset[1] * scale))


def reset_game():
    global fighter_1, fighter_2, combo, combo_timer
    warrior_rect_h = fighter_rect_height(WARRIOR_DATA)
    wizard_rect_h = fighter_rect_height(WIZARD_DATA)
    fighter_1 = Fighter(
        1, 220, GROUND_Y - warrior_rect_h, False,
        WARRIOR_DATA, warrior_sheet, WARRIOR_ANIMATION_STEPS, sword_fx
    )
    fighter_2 = Fighter(
        2, SCREEN_WIDTH - 340, GROUND_Y - wizard_rect_h, True,
        WIZARD_DATA, wizard_sheet, WIZARD_ANIMATION_STEPS, magic_fx
    )
    combo = [0, 0]
    combo_timer = [0, 0]
    particles.clear()
    floating_texts.clear()


def countdown():
    cfont = pygame.font.Font(resource_path("assets/fonts/turok.ttf"), 120)
    for text, color in [("3", NEON_CYAN), ("2", YELLOW), ("1", NEON_ORANGE), ("FIGHT!", RED)]:
        start = pygame.time.get_ticks()
        while pygame.time.get_ticks() - start < 1000:
            draw_bg(is_game_started=True)
            elapsed = (pygame.time.get_ticks() - start) / 1000
            scale = max(1.0, 2.0 - elapsed * 1.5)
            base_img = cfont.render(text, True, color)
            sw = int(base_img.get_width() * scale)
            sh = int(base_img.get_height() * scale)
            scaled_img = pygame.transform.scale(base_img, (sw, sh))
            scaled_img.set_alpha(int(255 * (1 - elapsed * 0.4)))
            glow = pygame.transform.scale(cfont.render(text, True, color), (sw + 30, sh + 30))
            glow.set_alpha(50)
            screen.blit(glow, (SCREEN_WIDTH // 2 - (sw + 30) // 2, SCREEN_HEIGHT // 2 - (sh + 30) // 2))
            screen.blit(scaled_img, (SCREEN_WIDTH // 2 - sw // 2, SCREEN_HEIGHT // 2 - sh // 2))
            draw_crt_overlay()
            pygame.display.update()
            clock.tick(FPS)


def end_screen(winner_img, winner_label):
    """Show improved victory panel + Play Again / Main Menu buttons."""
    particles.clear()
    for _ in range(60):
        particles.append(Particle(
            random.randint(80, SCREEN_WIDTH - 80),
            random.randint(70, SCREEN_HEIGHT // 2),
            random.choice([YELLOW, NEON_PINK, NEON_CYAN, GREEN, WHITE]),
            vel_x=random.uniform(-2.5, 2.5),
            vel_y=random.uniform(-4.5, -1.0),
        ))

    panel_w = min(820, SCREEN_WIDTH - 70)
    panel_h = min(620, SCREEN_HEIGHT - 90)
    panel_rect = pygame.Rect(
        SCREEN_WIDTH // 2 - panel_w // 2,
        SCREEN_HEIGHT // 2 - panel_h // 2,
        panel_w,
        panel_h,
    )
    ui_scale = min(panel_w / 820, panel_h / 620)
    accent = NEON_CYAN if winner_label == "PLAYER 1" else NEON_PINK

    title_font = pygame.font.Font(resource_path("assets/fonts/turok.ttf"), int(76 * ui_scale))
    winner_font = pygame.font.Font(resource_path("assets/fonts/turok.ttf"), int(38 * ui_scale))
    btn_font = pygame.font.Font(resource_path("assets/fonts/turok.ttf"), int(46 * ui_scale))
    hint_font = pygame.font.Font(resource_path("assets/fonts/turok.ttf"), int(18 * ui_scale))

    portrait_target_h = int(panel_h * 0.34)
    portrait_scale = portrait_target_h / max(1, winner_img.get_height())
    portrait_w = max(1, int(winner_img.get_width() * portrait_scale))
    portrait = pygame.transform.smoothscale(winner_img, (portrait_w, portrait_target_h))

    while True:
        t = pygame.time.get_ticks()
        draw_bg(True)

        dark_overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
        dark_overlay.fill((0, 0, 0, 95))
        screen.blit(dark_overlay, (0, 0))

        if random.random() < 0.1 and len(particles) < 95:
            particles.append(Particle(
                random.randint(60, SCREEN_WIDTH - 60),
                random.randint(60, SCREEN_HEIGHT // 2),
                random.choice([YELLOW, NEON_PINK, NEON_CYAN, NEON_ORANGE, WHITE]),
                vel_x=random.uniform(-2.2, 2.2),
                vel_y=random.uniform(-4.0, -1.0),
            ))

        for p in particles[:]:
            p.update()
            p.draw(screen)
            if p.lifetime <= 0:
                particles.remove(p)

        draw_arcade_panel(panel_rect, (22, 18, 42), (5, 6, 16), accent, 220, 3)
        inner_rect = panel_rect.inflate(-26, -26)
        draw_arcade_panel(inner_rect, (10, 12, 28), (4, 5, 14), NEON_ORANGE, 180, 1)

        title_text = "VICTORY"
        title_x = SCREEN_WIDTH // 2 - title_font.size(title_text)[0] // 2
        title_y = panel_rect.y + int(24 * ui_scale)
        draw_text_with_outline(title_text, title_font, RED, BLACK, title_x, title_y, 3)

        winner_text = f"{winner_label} WINS"
        winner_x = SCREEN_WIDTH // 2 - winner_font.size(winner_text)[0] // 2
        winner_y = title_y + int(88 * ui_scale)
        draw_text_with_outline(winner_text, winner_font, accent, BLACK, winner_x, winner_y, 2)

        portrait_rect = pygame.Rect(
            SCREEN_WIDTH // 2 - int(panel_w * 0.26),
            winner_y + int(48 * ui_scale),
            int(panel_w * 0.52),
            int(panel_h * 0.39),
        )
        draw_arcade_panel(portrait_rect, (24, 28, 42), (8, 9, 18), WHITE, 120, 1)
        screen.blit(
            portrait,
            (portrait_rect.centerx - portrait.get_width() // 2, portrait_rect.bottom - portrait.get_height() - 8),
        )

        bw = int(min(420, panel_w * 0.58))
        bh = int(max(52, 66 * ui_scale))
        bsp = int(max(14, 20 * ui_scale))
        bx = SCREEN_WIDTH // 2 - bw // 2
        by_pref = portrait_rect.bottom + int(22 * ui_scale)
        by_max = panel_rect.bottom - (bh * 2 + bsp + int(34 * ui_scale))
        by = min(by_pref, by_max)
        again_btn = draw_button("▶  PLAY AGAIN", btn_font, WHITE, (0, 80, 10), bx, by, bw, bh, GREEN)
        menu_btn = draw_button("⌂  MAIN MENU", btn_font, WHITE, (60, 0, 60), bx, by + bh + bsp, bw, bh, NEON_PINK)

        hint = "ESC = MAIN MENU"
        hint_x = SCREEN_WIDTH // 2 - hint_font.size(hint)[0] // 2
        draw_text_with_outline(hint, hint_font, WHITE, BLACK, hint_x, panel_rect.bottom + 8, 1)

        draw_crt_overlay()
        pygame.display.update()
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                exit()
            if event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
                return "MENU"
            if event.type == pygame.MOUSEBUTTONDOWN:
                if again_btn.collidepoint(event.pos):
                    return "AGAIN"
                if menu_btn.collidepoint(event.pos):
                    return "MENU"
        clock.tick(FPS)


def game_loop():
    global score, combo, combo_timer, hit_flash_timer
    reset_game()
    round_over = False
    winner_img = None
    winner_label = ""
    frame_count = 0
    prev_p1_health = 100
    prev_p2_health = 100
    combo = [0, 0]
    combo_timer = [0, 0]
    hit_flash_timer = 0

    countdown()

    while True:
        t = pygame.time.get_ticks()
        frame_count += 1
        sx, sy = get_shake_offset()

        draw_bg(is_game_started=True)

        # Hit flash
        if hit_flash_timer > 0:
            flash_surf = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
            flash_surf.fill((255, 255, 255, min(90, hit_flash_timer * 6)))
            screen.blit(flash_surf, (0, 0))
            hit_flash_timer -= 1

        hud_rect = pygame.Rect(0, 0, SCREEN_WIDTH, HUD_HEIGHT)
        draw_arcade_panel(hud_rect, (10, 14, 28), (2, 2, 8), NEON_CYAN, 210, 1)
        panel_margin = max(12, SCREEN_WIDTH // 80)
        timer_space = 190
        panel_w = max(230, (SCREEN_WIDTH - timer_space - panel_margin * 4) // 2)
        left_panel_x = panel_margin
        right_panel_x = SCREEN_WIDTH - panel_margin - panel_w
        draw_health_bar(fighter_1.health, left_panel_x, 20, panel_w, "PLAYER 1", player=1)
        draw_health_bar(fighter_2.health, right_panel_x, 20, panel_w, "PLAYER 2", player=2)

        # Timer + score center
        draw_timer(frame_count)
        score_text = f"{score[0]}  -  {score[1]}"
        sw = score_font.size(score_text)[0]
        draw_text_with_outline(score_text, score_font, YELLOW, BLACK, SCREEN_WIDTH // 2 - sw // 2, 66)
        draw_stage_floor(t)

        if not round_over:
            fighter_1.move(SCREEN_WIDTH, SCREEN_HEIGHT, fighter_2, round_over, GROUND_Y)
            fighter_2.move(SCREEN_WIDTH, SCREEN_HEIGHT, fighter_1, round_over, GROUND_Y)

            if fighter_1.health < prev_p1_health:
                dmg = prev_p1_health - fighter_1.health
                spawn_hit_particles(fighter_1.rect.centerx, fighter_1.rect.centery, NEON_CYAN)
                trigger_screen_shake(6, 12)
                hit_flash_timer = 5
                combo[1] += 1
                combo_timer[1] = COMBO_TIMEOUT
                if combo[1] >= 2:
                    floating_texts.append(FloatingText(
                        f"{combo[1]}x COMBO!", SCREEN_WIDTH - 250, SCREEN_HEIGHT // 2,
                        random.choice([NEON_PINK, YELLOW, NEON_ORANGE]), combo_font))
                floating_texts.append(FloatingText(
                    f"-{dmg}", fighter_1.rect.centerx, fighter_1.rect.top - 20, RED, combo_font))
                prev_p1_health = fighter_1.health

            if fighter_2.health < prev_p2_health:
                dmg = prev_p2_health - fighter_2.health
                spawn_hit_particles(fighter_2.rect.centerx, fighter_2.rect.centery, NEON_PINK)
                trigger_screen_shake(6, 12)
                hit_flash_timer = 5
                combo[0] += 1
                combo_timer[0] = COMBO_TIMEOUT
                if combo[0] >= 2:
                    floating_texts.append(FloatingText(
                        f"{combo[0]}x COMBO!", 250, SCREEN_HEIGHT // 2,
                        random.choice([NEON_CYAN, YELLOW, GREEN]), combo_font))
                floating_texts.append(FloatingText(
                    f"-{dmg}", fighter_2.rect.centerx, fighter_2.rect.top - 20, RED, combo_font))
                prev_p2_health = fighter_2.health

            for i in range(2):
                if combo_timer[i] > 0:
                    combo_timer[i] -= 1
                else:
                    combo[i] = 0

            fighter_1.update()
            fighter_2.update()

            if not fighter_1.alive:
                score[1] += 1
                round_over = True
                winner_img = wizard_victory_pose
                winner_label = "PLAYER 2"
            elif not fighter_2.alive:
                score[0] += 1
                round_over = True
                winner_img = warrior_victory_pose
                winner_label = "PLAYER 1"

        # Draw fighters
        if sx != 0 or sy != 0:
            shake_surf = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
            fighter_1.draw(shake_surf)
            fighter_2.draw(shake_surf)
            screen.blit(shake_surf, (sx, sy))
        else:
            fighter_1.draw(screen)
            fighter_2.draw(screen)

        for p in particles[:]:
            p.update()
            p.draw(screen)
            if p.lifetime <= 0:
                particles.remove(p)

        for ft in floating_texts[:]:
            ft.update()
            ft.draw(screen)
            if ft.lifetime <= 0:
                floating_texts.remove(ft)

        draw_crt_overlay()

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                exit()
            if event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
                return

        if round_over:
            pygame.display.update()
            result = end_screen(winner_img, winner_label)
            if result == "AGAIN":
                game_loop()
            return

        pygame.display.update()
        clock.tick(FPS)


# Main loop
while True:
    menu_selection = main_menu()
    if menu_selection == "START":
        game_loop()
