import pygame
import random

from objects import Grumpy, Pipe, Base, Score

# Setup *******************************************

pygame.init()
SCREEN = WIDTH, HEIGHT = 288, 512
display_height = 0.80 * HEIGHT
info = pygame.display.Info()

width = info.current_w
height = info.current_h

if width >= height:
	win = pygame.display.set_mode(SCREEN, pygame.NOFRAME)
else:
	win = pygame.display.set_mode(SCREEN, pygame.NOFRAME | pygame.SCALED | pygame.FULLSCREEN)

clock = pygame.time.Clock()
FPS = 60

# COLORS - RETRO ARCADE PALETTE
NEON_GREEN = (0, 255, 0)
NEON_BLUE = (0, 255, 255)
NEON_PINK = (255, 0, 255)
NEON_YELLOW = (255, 255, 0)
ARCADE_ORANGE = (255, 165, 0)
RED = (255, 0, 0)
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)

# RETRO FONT
try:
	arcade_font = pygame.font.SysFont('courier', 24, bold=True)
	title_font = pygame.font.SysFont('courier', 48, bold=True)
	score_font = pygame.font.SysFont('courier', 72, bold=True)
except:
	arcade_font = pygame.font.Font(None, 24)
	title_font = pygame.font.Font(None, 48)
	score_font = pygame.font.Font(None, 72)

# Backgrounds - RETRO GRADIENT
def draw_retro_background(surface):
	# Starfield background
	for i in range(50):
		x = random.randint(0, WIDTH)
		y = random.randint(0, HEIGHT)
		size = random.randint(1, 3)
		color = random.choice([WHITE, NEON_BLUE, NEON_PINK])
		pygame.draw.circle(surface, color, (x, y), size)
	
	# Grid lines
	for y in range(0, HEIGHT, 20):
		alpha = 30
		pygame.draw.line(surface, (0, 100, 150), (0, y), (WIDTH, y), 1)
	
	for x in range(0, WIDTH, 20):
		pygame.draw.line(surface, (0, 100, 150), (x, 0), (x, HEIGHT), 1)

# Create static background once
bg_surface = pygame.Surface((WIDTH, HEIGHT))
bg_surface.fill((10, 5, 30))  # Dark blue/purple
draw_retro_background(bg_surface)

# Pipe colors - NEON
pipe_colors = [NEON_GREEN, NEON_PINK, NEON_YELLOW, NEON_BLUE]
current_pipe_color = random.choice(pipe_colors)

# RETRO TITLE
def draw_retro_title(surface):
	title_text = "RETRO"
	subtitle_text = "BIRD"
	
	# Draw title with neon glow effect
	for offset in range(5, 0, -1):
		title_shadow = title_font.render(title_text, True, NEON_BLUE)
		surface.blit(title_shadow, (WIDTH//2 - 80 + offset, 50 + offset))
	
	title = title_font.render(title_text, True, NEON_YELLOW)
	surface.blit(title, (WIDTH//2 - 80, 50))
	
	for offset in range(5, 0, -1):
		sub_shadow = title_font.render(subtitle_text, True, NEON_PINK)
		surface.blit(sub_shadow, (WIDTH//2 - 70 + offset, 100 + offset))
	
	subtitle = title_font.render(subtitle_text, True, NEON_GREEN)
	surface.blit(subtitle, (WIDTH//2 - 70, 100))
	
	# Blinking "CLICK TO START"
	if pygame.time.get_ticks() % 1000 < 500:
		start_text = arcade_font.render("CLICK TO START", True, WHITE)
		surface.blit(start_text, (WIDTH//2 - 90, HEIGHT - 100))

# RETRO GAME OVER
def draw_retro_gameover(surface, score):
	# Game Over box
	box_rect = pygame.Rect(20, 150, WIDTH - 40, 200)
	pygame.draw.rect(surface, BLACK, box_rect)
	pygame.draw.rect(surface, RED, box_rect, 4)
	
	# Inner glow
	pygame.draw.rect(surface, RED, box_rect.inflate(-4, -4), 2)
	
	# Text
	gameover_text = title_font.render("GAME", True, RED)
	surface.blit(gameover_text, (WIDTH//2 - 60, 170))
	
	over_text = title_font.render("OVER", True, RED)
	surface.blit(over_text, (WIDTH//2 - 60, 220))
	
	score_text = arcade_font.render(f"SCORE: {score}", True, NEON_YELLOW)
	surface.blit(score_text, (WIDTH//2 - 60, 280))
	
	# Blinking restart
	if pygame.time.get_ticks() % 800 < 400:
		restart_text = arcade_font.render("CLICK TO RESTART", True, WHITE)
		surface.blit(restart_text, (WIDTH//2 - 100, 320))

# RETRO SCORE DISPLAY
def draw_retro_score(surface, score):
	score_text = score_font.render(str(score), True, NEON_YELLOW)
	text_rect = score_text.get_rect(center=(WIDTH//2, 60))
	
	# Glow effect
	for offset in range(3, 0, -1):
		glow = score_font.render(str(score), True, ARCADE_ORANGE)
		glow_rect = glow.get_rect(center=(WIDTH//2 + offset, 60 + offset))
		surface.blit(glow, glow_rect)
	
	surface.blit(score_text, text_rect)
	
	# Border lines
	pygame.draw.line(surface, NEON_YELLOW, (0, 100), (WIDTH, 100), 2)

# Objects
pipe_group = pygame.sprite.Group()
base = Base(win, current_pipe_color)
grumpy = Grumpy(win)

# Variables
base_height = 0.80 * HEIGHT
speed = 0
game_started = False
game_over = False
restart = False
score = 0
start_screen = True
pipe_pass = False
pipe_frequency = 1600
last_pipe = 0

# Particle effects
particles = []

def create_particles(x, y, color):
	for _ in range(10):
		particles.append({
			'x': x,
			'y': y,
			'vx': random.uniform(-3, 3),
			'vy': random.uniform(-5, 0),
			'life': 30,
			'color': color
		})

def update_particles(surface):
	for particle in particles[:]:
		particle['x'] += particle['vx']
		particle['y'] += particle['vy']
		particle['vy'] += 0.3
		particle['life'] -= 1
		
		if particle['life'] <= 0:
			particles.remove(particle)
		else:
			size = max(1, particle['life'] // 10)
			pygame.draw.circle(surface, particle['color'], 
							 (int(particle['x']), int(particle['y'])), size)

running = True
while running:
	# Draw background
	win.blit(bg_surface, (0, 0))
	
	if start_screen:
		speed = 0
		grumpy.draw_flap()
		base.update(speed)
		draw_retro_title(win)
		
	else:
		if game_started and not game_over:
			next_pipe = pygame.time.get_ticks()
			if next_pipe - last_pipe >= pipe_frequency:
				y = display_height // 2
				pipe_pos = random.choice(range(-100, 100, 4))
				height = y + pipe_pos
				
				top = Pipe(win, height, 1, current_pipe_color)
				bottom = Pipe(win, height, -1, current_pipe_color)
				pipe_group.add(top)
				pipe_group.add(bottom)
				last_pipe = next_pipe
		
		pipe_group.update(speed)
		base.update(speed)
		grumpy.update()
		
		if pygame.sprite.spritecollide(grumpy, pipe_group, False) or grumpy.rect.top <= 0:
			game_started = False
			if grumpy.alive:
				# Hit effect
				create_particles(grumpy.rect.centerx, grumpy.rect.centery, RED)
			grumpy.alive = False
			grumpy.theta = grumpy.vel * -2
		
		if grumpy.rect.bottom >= display_height:
			speed = 0
			game_over = True
		
		if len(pipe_group) > 0:
			p = pipe_group.sprites()[0]
			if grumpy.rect.left > p.rect.left and grumpy.rect.right < p.rect.right and not pipe_pass and grumpy.alive:
				pipe_pass = True
			
			if pipe_pass:
				if grumpy.rect.left > p.rect.right:
					pipe_pass = False
					score += 1
					# Score effect
					create_particles(WIDTH//2, 60, NEON_YELLOW)
		
		# Draw score
		draw_retro_score(win, score)
	
	# Update particles
	update_particles(win)
	
	if not grumpy.alive:
		draw_retro_gameover(win, score)
	
	for event in pygame.event.get():
		if event.type == pygame.QUIT:
			running = False
		if event.type == pygame.KEYDOWN:
			if event.key == pygame.K_ESCAPE or event.key == pygame.K_q:
				running = False
		if event.type == pygame.MOUSEBUTTONDOWN:
			if start_screen:
				game_started = True
				speed = 2
				start_screen = False
				game_over = False
				last_pipe = pygame.time.get_ticks() - pipe_frequency
				pipe_group.empty()
				score = 0
				current_pipe_color = random.choice(pipe_colors)
				base = Base(win, current_pipe_color)
			
			if game_over:
				start_screen = True
				grumpy = Grumpy(win)
				particles.clear()
	
	clock.tick(FPS)
	pygame.display.update()

pygame.quit()