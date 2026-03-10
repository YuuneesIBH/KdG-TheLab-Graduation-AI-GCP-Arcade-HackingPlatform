import pygame
import sys
import math
import random
import os

pygame.init()
pygame.joystick.init()
embedded_mode = os.environ.get('ARCADE_EMBEDDED') == '1'
window_size_raw = os.environ.get('ARCADE_WINDOW_SIZE')
window_pos = os.environ.get('ARCADE_WINDOW_POS')

if window_pos:
    os.environ['SDL_VIDEO_WINDOW_POS'] = window_pos

screen_size = (0, 0)
if embedded_mode and window_size_raw:
    cleaned = window_size_raw.lower().replace(' ', '')
    parts = cleaned.split('x' if 'x' in cleaned else ',')
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
BLACK      = (0,   0,   0)
GREEN      = (0,   255, 70)
GREEN_DIM  = (0,   80,  25)
GREEN_DARK = (0,   20,  8)
AMBER      = (255, 180, 0)
AMBER_DIM  = (100, 60,  0)
WHITE      = (255, 255, 255)
try:
    font_big   = pygame.font.SysFont("couriernew", 96, bold=True)
    font_med   = pygame.font.SysFont("couriernew", 42, bold=True)
    font_small = pygame.font.SysFont("couriernew", 22, bold=True)
except:
    font_big   = pygame.font.SysFont("monospace", 96, bold=True)
    font_med   = pygame.font.SysFont("monospace", 42, bold=True)
    font_small = pygame.font.SysFont("monospace", 22, bold=True)
PAD_W, PAD_H = 19, 185
BALL_R       = 10
PAD_SPEED    = 28
PAD_SPEED_ANALOG = 22
INIT_SPEED   = 25
WIN_SCORE    = 7
MARGIN       = 50
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
        pygame.draw.rect(surf, (0, 0, 0, alpha),
                         (i, i, WIDTH - i * 2, HEIGHT - i * 2), 1)
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
    pygame.draw.rect(surf, GREEN, (0, 0,        WIDTH, 8))
    pygame.draw.rect(surf, GREEN, (0, HEIGHT-8, WIDTH, 8))
    return surf

print("Pre-rendering overlays...")
scanlines  = make_scanlines()
vignette   = make_vignette()
field_bg   = make_field_bg()
print("Done.")
joysticks = [pygame.joystick.Joystick(i) for i in range(pygame.joystick.get_count())]
for js in joysticks:
    js.init()
def pixel_text(surf, text, font, colour, cx, cy, shadow=True):
    if shadow:
        s = font.render(text, False, GREEN_DARK)
        surf.blit(s, s.get_rect(center=(cx + 3, cy + 3)))
    s = font.render(text, False, colour)
    surf.blit(s, s.get_rect(center=(cx, cy)))
class Paddle:
    def __init__(self, x, colour):
        self.x = x
        self.y = HEIGHT // 2 - PAD_H // 2
        self.colour = colour
        self.vy = 0
        self._make_surf()

    def _make_surf(self):
        self.surf = pygame.Surface((PAD_W + 8, PAD_H + 8), pygame.SRCALPHA)
        dim = tuple(int(c * 0.25) for c in self.colour)
        pygame.draw.rect(self.surf, dim,    (0, 0, PAD_W + 8, PAD_H + 8), border_radius=4)
        pygame.draw.rect(self.surf, self.colour, (4, 4, PAD_W,     PAD_H),     border_radius=4)
        pygame.draw.rect(self.surf, WHITE,  (6, 8, 4,         PAD_H - 16),  border_radius=2)

    @property
    def rect(self):
        return pygame.Rect(self.x, int(self.y), PAD_W, PAD_H)

    def move_player(self, up, down, axis_value=0.0):
        if abs(axis_value) > JOYSTICK_DEADZONE:
            self.vy = axis_value * PAD_SPEED_ANALOG
        elif up:
            self.vy = -PAD_SPEED
        elif down:
            self.vy = PAD_SPEED
        else:
            self.vy *= 0.6
        self.y = max(0, min(HEIGHT - PAD_H, self.y + self.vy))

    def move_ai(self, ball):
        center = self.y + PAD_H / 2
        diff   = ball.y - center
        speed  = min(abs(diff), PAD_SPEED * 0.78)
        self.y += math.copysign(speed, diff)
        self.y  = max(0, min(HEIGHT - PAD_H, self.y))

    def draw(self, surf):
        surf.blit(self.surf, (self.x - 4, int(self.y) - 4))
class Ball:
    def __init__(self):
        self.trail = []
        self.colour = GREEN
        self.reset(1)

    def reset(self, direction=1):
        self.x = WIDTH  / 2
        self.y = HEIGHT / 2
        angle  = random.uniform(-0.6, 0.6)
        self.vx = math.cos(angle) * INIT_SPEED * direction
        self.vy = math.sin(angle) * INIT_SPEED
        self.speed = INIT_SPEED
        self.trail.clear()

    @property
    def rect(self):
        return pygame.Rect(int(self.x) - BALL_R, int(self.y) - BALL_R,
                           BALL_R * 2, BALL_R * 2)

    def update(self, player, ai):
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

        for pad in (player, ai):
            if self.rect.colliderect(pad.rect):
                rel = (self.y - (pad.y + PAD_H / 2)) / (PAD_H / 2)
                rel = max(-1.0, min(1.0, rel))
                self.speed = min(self.speed + 1.5, 100)
                angle = rel * math.pi / 3.5
                direction = 1 if pad is player else -1
                self.vx = math.cos(angle) * self.speed * direction
                self.vy = math.sin(angle) * self.speed
                if pad is player:
                    self.x = pad.x + PAD_W + BALL_R + 1
                else:
                    self.x = pad.x - BALL_R - 1

        if self.x < 0:
            return "ai"
        if self.x > WIDTH:
            return "player"
        return None

    def draw(self, surf):
        for i, (tx, ty) in enumerate(self.trail):
            alpha = (i + 1) / max(len(self.trail), 1)
            g = int(120 * alpha)
            pygame.draw.circle(surf, (0, g, int(30 * alpha)), (tx, ty),
                                max(3, int(BALL_R * alpha * 0.6)))
        pygame.draw.circle(surf, GREEN_DIM, (int(self.x), int(self.y)), BALL_R + 4)
        pygame.draw.circle(surf, GREEN,     (int(self.x), int(self.y)), BALL_R)
        pygame.draw.circle(surf, WHITE,     (int(self.x) - 3, int(self.y) - 3), 3)
def draw_hud(surf, score_p1, score_p2, paused):
    pixel_text(surf, str(score_p1), font_big, GREEN, WIDTH // 4,     70)
    pixel_text(surf, str(score_p2), font_big, AMBER, WIDTH * 3 // 4, 70)
    pixel_text(surf, "<  P1  >", font_small, GREEN_DIM, WIDTH // 4,     130, shadow=False)
    pixel_text(surf, "<  P2  >", font_small, AMBER_DIM, WIDTH * 3 // 4, 130, shadow=False)

    hint = "[P1] UP/DN of LS1    [P2] W/S of LS2    [ P ] PAUZE    [ ESC ] STOP"
    pixel_text(surf, hint, font_small, GREEN_DIM, WIDTH // 2, HEIGHT - 22, shadow=False)

    t = pygame.time.get_ticks()
    if (t // 700) % 2 == 0:
        pixel_text(surf, "* EERSTE TOT 7 WINT *", font_small, GREEN_DIM,
                   WIDTH // 2, HEIGHT - 50, shadow=False)

    if paused:
        ov = pygame.Surface((WIDTH, HEIGHT), pygame.SRCALPHA)
        ov.fill((0, 0, 0, 170))
        surf.blit(ov, (0, 0))
        pixel_text(surf, "** PAUZE **", font_med, GREEN, WIDTH // 2, HEIGHT // 2)
        pixel_text(surf, "DRUK  P  OM  VERDER  TE  GAAN", font_small, GREEN_DIM,
                   WIDTH // 2, HEIGHT // 2 + 60)
def win_screen(winner):
    colour = GREEN if winner == "P1" else AMBER
    t = 0
    while True:
        clock.tick(FPS)
        t += 1
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit(); sys.exit()
            if event.type == pygame.KEYDOWN and event.key == pygame.K_RETURN:
                return

        screen.blit(field_bg, (0, 0))
        if (t // 20) % 2 == 0:
            pygame.draw.rect(screen, colour, (40, 40, WIDTH - 80, HEIGHT - 80), 4)
        flash = WHITE if (t // 15) % 2 == 0 else colour
        pixel_text(screen, "** GAME  OVER **", font_med, GREEN_DIM, WIDTH // 2, HEIGHT // 2 - 130)
        pixel_text(screen, "WINNAAR",          font_big, flash,     WIDTH // 2, HEIGHT // 2 - 40)
        pixel_text(screen, winner,             font_big, colour,    WIDTH // 2, HEIGHT // 2 + 70)
        pixel_text(screen, "DRUK  ENTER  OM  OPNIEUW  TE  SPELEN",
                   font_small, GREEN_DIM, WIDTH // 2, HEIGHT // 2 + 160)
        screen.blit(scanlines, (0, 0))
        screen.blit(vignette,  (0, 0))
        pygame.display.flip()
def game():
    player1 = Paddle(MARGIN,                 GREEN)
    player2 = Paddle(WIDTH - MARGIN - PAD_W, AMBER)
    ball   = Ball()
    score_p1 = score_p2 = 0
    paused  = False
    direction = 1

    while True:
        clock.tick(FPS)
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit(); sys.exit()
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    pygame.quit(); sys.exit()
                if event.key == pygame.K_p:
                    paused = not paused

        if paused:
            screen.blit(field_bg, (0, 0))
            player1.draw(screen)
            player2.draw(screen)
            ball.draw(screen)
            draw_hud(screen, score_p1, score_p2, True)
            screen.blit(scanlines, (0, 0))
            screen.blit(vignette,  (0, 0))
            pygame.display.flip()
            continue

        keys = pygame.key.get_pressed()

        # Joystick inputs (LS Y) — swap mapping: JS0 -> P2, JS1 -> P1 (if both present)
        if len(joysticks) >= 2:
            p1_axis = joysticks[1].get_axis(1)
            p2_axis = joysticks[0].get_axis(1)
        elif len(joysticks) == 1:
            p1_axis = joysticks[0].get_axis(1)
            p2_axis = 0.0
        else:
            p1_axis = p2_axis = 0.0

        p1_up = keys[pygame.K_UP] or p1_axis < -JOYSTICK_DEADZONE
        p1_dn = keys[pygame.K_DOWN] or p1_axis > JOYSTICK_DEADZONE
        p2_up = keys[pygame.K_w] or p2_axis < -JOYSTICK_DEADZONE
        p2_dn = keys[pygame.K_s] or p2_axis > JOYSTICK_DEADZONE

        player1.move_player(p1_up, p1_dn, p1_axis)
        player2.move_player(p2_up, p2_dn, p2_axis)

        result = ball.update(player1, player2)

        if result:
            if result == "player":
                score_p1  += 1; direction = -1
            else:
                score_p2 += 1; direction = 1

            screen.blit(field_bg, (0, 0))
            player1.draw(screen); player2.draw(screen); ball.draw(screen)
            draw_hud(screen, score_p1, score_p2, False)
            screen.blit(scanlines, (0, 0))
            screen.blit(vignette,  (0, 0))
            pygame.display.flip()

            if score_p1 >= WIN_SCORE: pygame.time.delay(500); win_screen("P1"); return
            if score_p2 >= WIN_SCORE: pygame.time.delay(500); win_screen("P2"); return

            ball.reset(direction)
            pygame.time.delay(400)

        screen.blit(field_bg, (0, 0))
        player1.draw(screen)
        player2.draw(screen)
        ball.draw(screen)
        draw_hud(screen, score_p1, score_p2, False)
        screen.blit(scanlines, (0, 0))
        screen.blit(vignette,  (0, 0))
        pygame.display.flip()


while True:
    game()
