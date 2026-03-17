import os
import random

import pygame

from objects import Base, DISPLAY_HEIGHT, Grumpy, Pipe, WORLD_HEIGHT, WORLD_WIDTH

ACTION_KEYS = {
	pygame.K_RETURN,
	pygame.K_KP_ENTER,
	pygame.K_SPACE,
	pygame.K_UP,
	pygame.K_w,
	pygame.K_x,
	pygame.K_c,
	pygame.K_v,
	pygame.K_b,
	pygame.K_n,
}
ACTION_JOYSTICK_BUTTONS = (0, 9)

STATE_TITLE = 'title'
STATE_PLAYING = 'playing'
STATE_GAME_OVER = 'game-over'

PIPE_SPEED = 3.6
PIPE_FREQUENCY_MS = 900
PIPE_CENTER_MIN = 128
PIPE_CENTER_MAX = DISPLAY_HEIGHT - 74

NEON_GREEN = (0, 255, 0)
NEON_BLUE = (0, 255, 255)
NEON_PINK = (255, 0, 255)
NEON_YELLOW = (255, 255, 0)
ARCADE_ORANGE = (255, 165, 0)
RED = (255, 0, 0)
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)


def parse_window_size(raw_value):
	if not raw_value:
		return None

	cleaned = raw_value.strip().lower().replace(' ', '')
	parts = cleaned.split('x' if 'x' in cleaned else ',')
	if len(parts) != 2:
		return None

	try:
		width = max(320, int(parts[0]))
		height = max(240, int(parts[1]))
		return width, height
	except ValueError:
		return None


def load_joysticks():
	connected = []
	for index in range(pygame.joystick.get_count()):
		joystick = pygame.joystick.Joystick(index)
		if not joystick.get_init():
			joystick.init()
		connected.append(joystick)
	return connected


def is_key_pressed(keys, key):
	return 0 <= key < len(keys) and bool(keys[key])


def is_action_down(joysticks):
	keys = pygame.key.get_pressed()
	for key in ACTION_KEYS:
		if is_key_pressed(keys, key):
			return True

	if pygame.mouse.get_pressed()[0]:
		return True

	for joystick in joysticks:
		button_count = joystick.get_numbuttons()
		for button in ACTION_JOYSTICK_BUTTONS:
			if button < button_count and joystick.get_button(button):
				return True

	return False


def make_font(size, bold=True):
	try:
		return pygame.font.SysFont('courier', size, bold=bold)
	except:
		return pygame.font.Font(None, size)


def draw_retro_background(surface):
	surface.fill((10, 5, 30))
	for x, y, size, color in STAR_FIELD:
		pygame.draw.circle(surface, color, (x, y), size)

	for y in range(0, WORLD_HEIGHT, 20):
		pygame.draw.line(surface, (0, 100, 150), (0, y), (WORLD_WIDTH, y), 1)

	for x in range(0, WORLD_WIDTH, 20):
		pygame.draw.line(surface, (0, 100, 150), (x, 0), (x, WORLD_HEIGHT), 1)


def draw_retro_title(surface):
	title_text = 'RETRO'
	subtitle_text = 'BIRD'
	title_x = WORLD_WIDTH // 2 - 58
	subtitle_x = WORLD_WIDTH // 2 - 50

	for offset in range(4, 0, -1):
		title_shadow = TITLE_FONT.render(title_text, True, NEON_BLUE)
		surface.blit(title_shadow, (title_x + offset, 56 + offset))

	title = TITLE_FONT.render(title_text, True, NEON_YELLOW)
	surface.blit(title, (title_x, 56))

	for offset in range(4, 0, -1):
		sub_shadow = TITLE_FONT.render(subtitle_text, True, NEON_PINK)
		surface.blit(sub_shadow, (subtitle_x + offset, 106 + offset))

	subtitle = TITLE_FONT.render(subtitle_text, True, NEON_GREEN)
	surface.blit(subtitle, (subtitle_x, 106))

	help_text = ARCADE_FONT.render('ONE BUTTON TO FLAP', True, WHITE)
	surface.blit(help_text, help_text.get_rect(center=(WORLD_WIDTH // 2, 332)))

	if pygame.time.get_ticks() % 1000 < 550:
		start_text = ARCADE_FONT.render('PRESS BUTTON TO START', True, WHITE)
		surface.blit(start_text, start_text.get_rect(center=(WORLD_WIDTH // 2, 372)))


def draw_retro_gameover(surface, score):
	box_rect = pygame.Rect(22, 150, WORLD_WIDTH - 44, 162)
	pygame.draw.rect(surface, BLACK, box_rect)
	pygame.draw.rect(surface, RED, box_rect, 4)
	pygame.draw.rect(surface, RED, box_rect.inflate(-6, -6), 2)

	gameover_text = TITLE_FONT.render('GAME OVER', True, RED)
	surface.blit(gameover_text, gameover_text.get_rect(center=(WORLD_WIDTH // 2, 186)))

	score_text = ARCADE_FONT.render(f'SCORE: {score}', True, NEON_YELLOW)
	surface.blit(score_text, score_text.get_rect(center=(WORLD_WIDTH // 2, 236)))

	if pygame.time.get_ticks() % 800 < 450:
		restart_text = ARCADE_FONT.render('PRESS BUTTON FOR MENU', True, WHITE)
		surface.blit(restart_text, restart_text.get_rect(center=(WORLD_WIDTH // 2, 278)))


def draw_retro_score(surface, score):
	score_text = SCORE_FONT.render(str(score), True, NEON_YELLOW)
	text_rect = score_text.get_rect(center=(WORLD_WIDTH // 2, 58))
	for offset in range(3, 0, -1):
		glow = SCORE_FONT.render(str(score), True, ARCADE_ORANGE)
		glow_rect = glow.get_rect(center=(WORLD_WIDTH // 2 + offset, 58 + offset))
		surface.blit(glow, glow_rect)

	surface.blit(score_text, text_rect)
	pygame.draw.line(surface, NEON_YELLOW, (0, 96), (WORLD_WIDTH, 96), 2)


def create_particles(x, y, color):
	for _ in range(12):
		particles.append({
			'x': x,
			'y': y,
			'vx': random.uniform(-2.6, 2.6),
			'vy': random.uniform(-4.5, -0.8),
			'life': 28,
			'color': color,
		})


def update_particles(surface):
	for particle in particles[:]:
		particle['x'] += particle['vx']
		particle['y'] += particle['vy']
		particle['vy'] += 0.24
		particle['life'] -= 1

		if particle['life'] <= 0:
			particles.remove(particle)
			continue

		size = max(1, particle['life'] // 8)
		pygame.draw.circle(surface, particle['color'], (int(particle['x']), int(particle['y'])), size)


def render_frame():
	game_surface.blit(bg_surface, (0, 0))

	if game_state == STATE_TITLE:
		base.update(0)
		grumpy.draw_flap()
		draw_retro_title(game_surface)
	elif game_state == STATE_PLAYING:
		base.update(PIPE_SPEED)
		pipe_group.update(PIPE_SPEED)
		grumpy.update()
		update_scoring()
		draw_retro_score(game_surface, score)
	else:
		base.update(0)
		pipe_group.update(0)
		grumpy.draw_bird()
		draw_retro_score(game_surface, score)
		draw_retro_gameover(game_surface, score)

	update_particles(game_surface)

	window.fill(BLACK)
	frame = pygame.transform.scale(game_surface, scaled_size)
	window.blit(frame, render_offset)
	pygame.display.update()


def spawn_pipe_pair():
	gap_center = random.randint(PIPE_CENTER_MIN, PIPE_CENTER_MAX)
	pipe_group.add(Pipe(game_surface, gap_center, 1, current_pipe_color))
	pipe_group.add(Pipe(game_surface, gap_center, -1, current_pipe_color))


def update_scoring():
	global score

	top_pipes = sorted((pipe for pipe in pipe_group if pipe.is_top), key=lambda pipe: pipe.rect.x)
	for pipe in top_pipes:
		if pipe.scored:
			continue
		if grumpy.rect.left > pipe.rect.right:
			pipe.scored = True
			score += 1
			create_particles(WORLD_WIDTH // 2, 58, NEON_YELLOW)
		break


def start_round():
	global action_requires_release, base, current_pipe_color, game_state
	global grumpy, last_pipe, score

	game_state = STATE_PLAYING
	score = 0
	last_pipe = pygame.time.get_ticks() - PIPE_FREQUENCY_MS
	pipe_group.empty()
	particles.clear()
	current_pipe_color = random.choice(pipe_colors)
	base = Base(game_surface, current_pipe_color)
	grumpy = Grumpy(game_surface)
	action_requires_release = True


def trigger_game_over():
	global action_requires_release, game_state

	if game_state != STATE_PLAYING:
		return

	game_state = STATE_GAME_OVER
	if grumpy.alive:
		create_particles(grumpy.rect.centerx, grumpy.rect.centery, RED)
	grumpy.alive = False
	grumpy.vel = 0
	grumpy.rect.top = max(grumpy.rect.top, 0)
	grumpy.rect.bottom = min(grumpy.rect.bottom, DISPLAY_HEIGHT)
	grumpy.y = float(grumpy.rect.y)
	action_requires_release = True


def handle_action_press():
	global running

	if game_state == STATE_TITLE:
		start_round()
		return

	if game_state == STATE_GAME_OVER:
		running = False
		return

	if game_state == STATE_PLAYING:
		grumpy.flap()


pygame.init()
pygame.joystick.init()

SCREEN = parse_window_size(os.environ.get('ARCADE_WINDOW_SIZE')) or (WORLD_WIDTH, WORLD_HEIGHT)
WINDOW_WIDTH, WINDOW_HEIGHT = SCREEN

embedded_mode = os.environ.get('ARCADE_EMBEDDED') == '1'
window_pos = os.environ.get('ARCADE_WINDOW_POS')
if window_pos:
	os.environ['SDL_VIDEO_WINDOW_POS'] = window_pos

display_flags = pygame.NOFRAME
if not embedded_mode:
	display_flags |= pygame.FULLSCREEN

window = pygame.display.set_mode(SCREEN, display_flags)
game_surface = pygame.Surface((WORLD_WIDTH, WORLD_HEIGHT)).convert()
clock = pygame.time.Clock()
FPS = 60

scale = min(WINDOW_WIDTH / WORLD_WIDTH, WINDOW_HEIGHT / WORLD_HEIGHT)
scaled_size = (
	max(1, int(WORLD_WIDTH * scale)),
	max(1, int(WORLD_HEIGHT * scale)),
)
render_offset = (
	(WINDOW_WIDTH - scaled_size[0]) // 2,
	(WINDOW_HEIGHT - scaled_size[1]) // 2,
)

ARCADE_FONT = make_font(18)
TITLE_FONT = make_font(34)
SCORE_FONT = make_font(54)

STAR_FIELD = [
	(
		random.randint(0, WORLD_WIDTH),
		random.randint(0, WORLD_HEIGHT),
		random.randint(1, 2),
		random.choice([WHITE, NEON_BLUE, NEON_PINK]),
	)
	for _ in range(44)
]

bg_surface = pygame.Surface((WORLD_WIDTH, WORLD_HEIGHT)).convert()
draw_retro_background(bg_surface)

pipe_colors = [NEON_GREEN, NEON_PINK, NEON_YELLOW, NEON_BLUE]
current_pipe_color = random.choice(pipe_colors)
pipe_group = pygame.sprite.Group()
base = Base(game_surface, current_pipe_color)
grumpy = Grumpy(game_surface)
particles = []

game_state = STATE_TITLE
score = 0
last_pipe = 0
joysticks = load_joysticks()
action_was_down = False
action_requires_release = True
running = True

while running:
	for event in pygame.event.get():
		if event.type == pygame.QUIT:
			running = False
		elif event.type in (pygame.JOYDEVICEADDED, pygame.JOYDEVICEREMOVED):
			joysticks = load_joysticks()
		elif event.type == pygame.KEYDOWN and event.key in (pygame.K_ESCAPE, pygame.K_q):
			running = False

	action_down = is_action_down(joysticks)
	if not action_down:
		action_requires_release = False
	if action_down and not action_was_down and not action_requires_release:
		handle_action_press()
	action_was_down = action_down

	if game_state == STATE_PLAYING:
		now = pygame.time.get_ticks()
		if now - last_pipe >= PIPE_FREQUENCY_MS:
			spawn_pipe_pair()
			last_pipe = now

	render_frame()
	if game_state == STATE_PLAYING:
		if pygame.sprite.spritecollide(grumpy, pipe_group, False) or grumpy.rect.top <= 0:
			trigger_game_over()
		elif grumpy.rect.bottom >= DISPLAY_HEIGHT:
			trigger_game_over()
	clock.tick(FPS)

pygame.quit()
