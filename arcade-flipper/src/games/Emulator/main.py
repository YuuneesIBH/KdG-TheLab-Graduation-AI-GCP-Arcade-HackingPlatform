import math
import os
import random
import sys
import subprocess
import shutil
import pygame


def parse_window_settings():
    embedded = os.environ.get('ARCADE_EMBEDDED') == '1'
    raw_size = os.environ.get('ARCADE_WINDOW_SIZE')
    raw_pos = os.environ.get('ARCADE_WINDOW_POS')

    width, height = 1024, 640
    if raw_size:
        cleaned = raw_size.lower().replace(' ', '')
        parts = cleaned.split('x' if 'x' in cleaned else ',')
        if len(parts) == 2:
            try:
                width = max(640, int(parts[0]))
                height = max(400, int(parts[1]))
            except ValueError:
                pass

    if raw_pos:
        os.environ['SDL_VIDEO_WINDOW_POS'] = raw_pos

    flags = pygame.NOFRAME | pygame.SCALED
    if not embedded:
        flags |= pygame.FULLSCREEN

    return width, height, flags


def init_pygame():
    pygame.init()
    try:
        pygame.font.init()
    except Exception:
        pass

    width, height, flags = parse_window_settings()
    screen = pygame.display.set_mode((width, height), flags)
    pygame.display.set_caption('EMULATOR')
    return screen


def load_fonts():
    families = ['Press Start 2P', 'Share Tech Mono', 'Courier New', 'Menlo', 'DejaVu Sans']
    def pick(size, bold=False):
        for name in families:
            try:
                return pygame.font.SysFont(name, size, bold=bold)
            except Exception:
                continue
        return pygame.font.Font(None, size)
    return {
        'title': pick(46, bold=True),
        'hud': pick(22, bold=True),
        'mono': pick(18),
        'chip': pick(14)
    }


def make_starfield(width, height, count=90):
    stars = []
    for _ in range(count):
        stars.append({
            'x': random.uniform(0, width),
            'y': random.uniform(0, height),
            'speed': random.uniform(18, 110),
            'size': random.randint(1, 3),
            'twinkle': random.uniform(0.3, 1.0),
        })
    return stars


def update_starfield(stars, dt, width, height):
    for s in stars:
        s['y'] += s['speed'] * dt
        if s['y'] > height:
            s['y'] = -2
            s['x'] = random.uniform(0, width)
        s['twinkle'] = max(0.2, min(1.0, s['twinkle'] + random.uniform(-0.6, 0.6) * dt))


def draw_starfield(screen, stars):
    for s in stars:
        alpha = int(180 * s['twinkle'])
        colour = (80, 200, 255, alpha)
        surf = pygame.Surface((s['size'], s['size']), pygame.SRCALPHA)
        surf.fill(colour)
        screen.blit(surf, (s['x'], s['y']))


def draw_scanlines(screen):
    width, height = screen.get_size()
    overlay = pygame.Surface((width, height), pygame.SRCALPHA)
    for y in range(0, height, 3):
        overlay.fill((0, 0, 0, 38), rect=pygame.Rect(0, y, width, 1))
    screen.blit(overlay, (0, 0))


def draw_vignette(screen):
    width, height = screen.get_size()
    overlay = pygame.Surface((width, height), pygame.SRCALPHA)
    pygame.draw.ellipse(overlay, (0, 0, 0, 160), (-width * 0.08, -height * 0.15, width * 1.16, height * 1.3), width=0)
    screen.blit(overlay, (0, 0))


def draw_grid(screen, t):
    width, height = screen.get_size()
    surf = pygame.Surface((width, height), pygame.SRCALPHA)
    spacing = 120
    for i in range(-2, int(width / spacing) + 3):
        x = i * spacing + (math.sin(t * 0.7 + i) * 18)
        pygame.draw.line(surf, (0, 180, 255, 25), (x, height), (x, 0))
    for j in range(-2, int(height / spacing) + 3):
        y = j * spacing + (math.cos(t * 0.9 + j) * 18)
        pygame.draw.line(surf, (0, 180, 255, 25), (0, y), (width, y))
    screen.blit(surf, (0, 0), special_flags=pygame.BLEND_ADD)


def draw_holo_card(screen, fonts, rom, idx, total, t):
    width, height = screen.get_size()
    card_w, card_h = min(620, width * 0.7), min(420, height * 0.68)
    cx, cy = width // 2, height // 2 + 20
    pulse = 0.65 + 0.12 * math.sin(t * 2.2)

    card = pygame.Surface((card_w, card_h), pygame.SRCALPHA)
    card.fill((5, 10, 18, 200))
    pygame.draw.rect(card, (0, 255, 200, 35), card.get_rect(), width=6, border_radius=24)
    pygame.draw.rect(card, (0, 120, 255, 70), card.get_rect(), width=2, border_radius=22)

    neon = pygame.Surface((card_w, card_h), pygame.SRCALPHA)
    pygame.draw.rect(neon, rom['accent'], neon.get_rect(), border_radius=22)
    neon.set_alpha(int(110 * pulse))
    card.blit(neon, (0, 0), special_flags=pygame.BLEND_ADD)

    header = fonts['title'].render(rom['name'], True, (240, 255, 255))
    subtitle = fonts['hud'].render(f"{rom['platform']} · {rom['year']} · {rom['genre']}", True, (160, 230, 255))
    blit_center(card, header, card_w // 2, 78)
    blit_center(card, subtitle, card_w // 2, 130)

    bar = pygame.Surface((card_w - 120, 12), pygame.SRCALPHA)
    pygame.draw.rect(bar, rom['accent'], bar.get_rect(), border_radius=6)
    bar.set_alpha(160)
    card.blit(bar, (60, 160))

    paragraphs = [
        'Virtuele console die roms laadt in een veilige sandbox.',
        'Shaders, savestates en input-hotplug zijn actief.',
        'Druk ENTER om te booten of ESC om terug te keren.'
    ]
    y = 210
    for p in paragraphs:
        text = fonts['mono'].render(p, True, (210, 235, 255))
        card.blit(text, (70, y))
        y += 32

    chip = fonts['chip'].render(f"ROM SLOT {idx + 1}/{total} · {rom['code']}", True, (130, 210, 255))
    card.blit(chip, (70, card_h - 74))

    hint = fonts['mono'].render('↑/↓ wissel rom · ←/→ shader · ENTER start · ESC sluit', True, (255, 255, 200))
    card.blit(hint, (70, card_h - 46))

    screen.blit(card, card.get_rect(center=(cx, cy)))


def blit_center(surf, child, x, y):
    rect = child.get_rect(center=(x, y))
    surf.blit(child, rect)


def show_toast(screen, fonts, message, timer):
    if timer <= 0:
        return
    width, height = screen.get_size()
    box = pygame.Surface((width, 80), pygame.SRCALPHA)
    pygame.draw.rect(box, (0, 0, 0, 180), (0, 0, width, 80))
    pygame.draw.rect(box, (0, 255, 160, 90), (0, 0, width, 80), width=2)
    text = fonts['mono'].render(message, True, (240, 255, 240))
    box.blit(text, text.get_rect(center=(width // 2, 40)))
    screen.blit(box, (0, height - 110))


def find_mame_executable():
    """Return absolute path to mame executable if present."""
    base_dir = os.path.dirname(__file__)
    candidates = [
        os.path.join(base_dir, 'mame.exe'),
        os.path.join(base_dir, 'mame'),
        'mame',
    ]
    for c in candidates:
        if os.path.isabs(c):
            if os.path.exists(c):
                return c
        else:
            resolved = shutil.which(c)
            if resolved:
                return resolved
    return None


def try_launch_mame():
    exe = find_mame_executable()
    if not exe:
        return False, 'mame.exe niet gevonden. Plaats mame(.exe) naast main.py.'
    try:
        base_dir = os.path.dirname(__file__)
        subprocess.Popen([exe], cwd=base_dir or None)
        return True, 'MAME wordt gestart...'
    except Exception as exc:
        return False, f'MAME start faalde: {exc}'


def main():
    screen = init_pygame()
    fonts = load_fonts()
    width, height = screen.get_size()

    roms = [
        {'name': 'NEON DRIVE', 'platform': 'RETRO-32', 'year': '1994', 'genre': 'RACER', 'accent': (0, 255, 200), 'code': 'ND-01'},
        {'name': 'PIXEL QUEST', 'platform': 'CUBE 8', 'year': '1991', 'genre': 'ADVENTURE', 'accent': (255, 120, 60), 'code': 'PQ-89'},
        {'name': 'VOID RUNNER', 'platform': 'MEGA 16', 'year': '1998', 'genre': 'SHMUP', 'accent': (130, 160, 255), 'code': 'VR-22'},
        {'name': 'SYNTHWAVE GP', 'platform': 'ARCADE', 'year': '1990', 'genre': 'RACER', 'accent': (255, 60, 180), 'code': 'SG-07'},
    ]

    stars = make_starfield(width, height)
    clock = pygame.time.Clock()
    t = 0.0
    idx = 0
    toast = ''
    toast_timer = 0.0

    while True:
        dt = clock.tick(60) / 1000.0
        t += dt
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    pygame.quit()
                    sys.exit()
                if event.key in (pygame.K_DOWN, pygame.K_s):
                    idx = (idx + 1) % len(roms)
                if event.key in (pygame.K_UP, pygame.K_w):
                    idx = (idx - 1) % len(roms)
                if event.key in (pygame.K_RETURN, pygame.K_SPACE):
                    ok, message = try_launch_mame()
                    if ok:
                        pygame.quit()
                        sys.exit(0)
                    else:
                        toast = message
                        toast_timer = 2.6

        update_starfield(stars, dt, width, height)

        screen.fill((4, 10, 22))
        draw_grid(screen, t)
        draw_starfield(screen, stars)
        draw_holo_card(screen, fonts, roms[idx], idx, len(roms), t)
        draw_scanlines(screen)
        draw_vignette(screen)

        if toast_timer > 0:
            toast_timer -= dt
            show_toast(screen, fonts, toast, toast_timer)

        pygame.display.flip()


if __name__ == '__main__':
    main()
