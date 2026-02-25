import pygame
import random
import os

from objects import Player, Bar, Ball, Block, ScoreCard, Message, Particle, generate_particles

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

pygame.init()
SCREEN = WIDTH, HEIGHT = parse_window_size(os.environ.get('ARCADE_WINDOW_SIZE')) or (288, 512)
BASE_WIDTH = 288
BASE_HEIGHT = 512
scale_x = WIDTH / BASE_WIDTH
scale_y = HEIGHT / BASE_HEIGHT
embedded_mode = os.environ.get('ARCADE_EMBEDDED') == '1'
window_pos = os.environ.get('ARCADE_WINDOW_POS')
if window_pos:
	os.environ['SDL_VIDEO_WINDOW_POS'] = window_pos

display_flags = pygame.NOFRAME | pygame.SCALED
if not embedded_mode:
	display_flags |= pygame.FULLSCREEN

win = pygame.display.set_mode(SCREEN, display_flags)

clock = pygame.time.Clock()
FPS = 45

# COLORS

RED = (255, 0, 0)
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
GRAY = (54, 69, 79)
c_list = [RED, BLACK, WHITE]

# Fonts

pygame.font.init()
score_font = pygame.font.Font('Fonts/BubblegumSans-Regular.ttf', 50)

# Sounds

coin_fx = pygame.mixer.Sound('Sounds/coin.mp3')
death_fx = pygame.mixer.Sound('Sounds/death.mp3')
move_fx = pygame.mixer.Sound('Sounds/move.mp3')

# backgrounds

bg_list = []
for i in range(1,5):
	if i == 2:
		ext = "jpeg"
	else:
		ext = "jpg"
	img = pygame.image.load(f"Assets/Backgrounds/bg{i}.{ext}")
	img = pygame.transform.scale(img, (WIDTH, HEIGHT))
	bg_list.append(img)

home_bg = pygame.image.load(f"Assets/Backgrounds/home.jpeg")

bg = home_bg

# objects
bar_group = pygame.sprite.Group()
ball_group = pygame.sprite.Group()
block_group = pygame.sprite.Group()
destruct_group = pygame.sprite.Group()
win_particle_group = pygame.sprite.Group()
bar_gap = max(100, int(120 * scale_x))
	
particles = []

p = Player(win)
score_card = ScoreCard(WIDTH // 2, max(36, int(40 * scale_y)), win)

# Functions

def destroy_bird():
	x, y = p.rect.center
	for i in range (50):
		c = random.choice(c_list)
		particle = Particle(x,y, 1,c, win)
		destruct_group.add(particle)
		
def win_particles():
	for x,y in [(40, 120), (WIDTH - 20, 240), (15, HEIGHT - 30)]:
		for i in range(10):
			particle = Particle (x,y, 2, WHITE, win)
			win_particle_group.add(particle)

# Messages
title_font = "Fonts/Robus-BWqOd.otf"
dodgy = Message(WIDTH // 2 - max(10, int(10 * scale_x)), int(90 * scale_y), int(100 * scale_y), "Angry",title_font, WHITE, win)
walls = Message(WIDTH // 2 + max(20, int(20 * scale_x)), int(145 * scale_y), int(80 * scale_y), "Walls",title_font, WHITE, win)

tap_to_play_font = "Fonts/DebugFreeTrial-MVdYB.otf"
tap_to_play = Message(WIDTH // 2, int(400 * scale_y), int(32 * scale_y), "TAP TO PLAY",tap_to_play_font, WHITE, win)
tap_to_replay = Message(WIDTH // 2, int(400 * scale_y), int(30 * scale_y), "Tap to Replay",tap_to_play_font, WHITE, win)

# Variables

bar_width_list = sorted(set(max(35, int(i * scale_x)) for i in range(40, 150, 10)))
bar_frequency = 1200
bar_speed = 4
touched = False
pos = None
home_page = True
score_page = False
bird_dead = False
score = 0
high_score = 0
move_left = False
move_right = True
prev_x = 0
p_count = 0

running = True
while running:
	win.blit(bg, (0,0))
	
	for event in pygame.event.get():
		if event.type == pygame.QUIT:
			running = False

		if event.type == pygame.KEYDOWN:
			if event.key == pygame.K_ESCAPE:
				running = False

		if event.type == pygame.MOUSEBUTTONDOWN and (home_page or score_page):
			home_page = False
			score_page = False
			win_particle_group.empty()
			
			bg = random.choice(bg_list)
			
			particles = []
			last_bar = pygame.time.get_ticks() - bar_frequency
			next_bar = 0
			bar_speed = 4
			bar_frequency = 1200
			bird_dead = False
			score = 0
			p_count = 0
			score_list = []
			
			for _ in range(15):
				x = random.randint(30, WIDTH - 30)
				y = random.randint(60, HEIGHT - 60)
				max = random.randint(8,16)
				b = Block(x,y,max, win)
				block_group.add(b)

		if event.type == pygame.MOUSEBUTTONDOWN and not home_page:
			if p.rect.collidepoint(event.pos):
				touched = True
				x, y = event.pos
				offset_x = p.rect.x - x

		if event.type == pygame.MOUSEBUTTONUP and not home_page:
			touched = False

		if event.type == pygame.MOUSEMOTION and not home_page:
			if touched:
				x, y = event.pos
				if move_right and prev_x > x:
					move_right = False
					move_left = True
					move_fx.play()
				if move_left and  prev_x < x:
					move_right = True
					move_left = False
					move_fx.play()

				prev_x = x
				p.rect.x =  x + offset_x
				
	if home_page:
		bg = home_bg
		particles = generate_particles(p, particles, WHITE, win)
		dodgy.update()
		walls.update()
		tap_to_play.update()
		p.update()
		
	elif score_page:
		bg = home_bg
		particles = generate_particles(p, particles, WHITE, win)
		tap_to_replay.update()
		p.update()
		score_msg.update()
		score_point.update()
		if p_count % 5 == 0:
			win_particles()
		p_count += 1
		win_particle_group.update()
		
	else:

		next_bar = pygame.time.get_ticks()
		if next_bar - last_bar >= bar_frequency and not bird_dead:
			bwidth = random.choice(bar_width_list)
			
			b1prime = Bar(0,0,bwidth+3,GRAY, win)
			b1 = Bar(0,-3,bwidth,WHITE,win)
			
			b2prime = Bar(bwidth+bar_gap+3, 0, WIDTH - bwidth - bar_gap, GRAY, win)
			b2 = Bar(bwidth+bar_gap, -3, WIDTH - bwidth - bar_gap, WHITE, win)
			
			bar_group.add(b1prime)
			bar_group.add(b1)
			bar_group.add(b2prime)
			bar_group.add(b2)
			
			color = random.choice(["red", "white"])
			pos = random.choice([0,1])
			if pos == 0:
				x = bwidth + 12
			elif pos == 1:
				x = bwidth + bar_gap - 12
			ball = Ball(x, 10, 1, color, win)
	
			ball_group.add(ball)
			last_bar = next_bar
			
		for ball in ball_group:
			if ball.rect.colliderect(p):
				if ball.color == "white":
					ball.kill()
					coin_fx.play()
					score += 1
					if score > high_score:
						high_score += 1
					score_card.animate = True
				elif ball.color == "red":
					if not bird_dead:
						death_fx.play()
						destroy_bird()
							
					bird_dead = True
					bar_speed = 0
	
		if pygame.sprite.spritecollide(p, bar_group, False):
			if not bird_dead:
				death_fx.play()
				destroy_bird()
					
			bird_dead = True
			bar_speed = 0
		
		block_group.update()
		bar_group.update(bar_speed)
		ball_group.update(bar_speed)
		
		if bird_dead:
				destruct_group.update()
				
		score_card.update(score)
		
		if not bird_dead:
			particles = generate_particles(p, particles, WHITE, win)
			p.update()

		if score and score % 10 == 0:
			rem = score // 10
			if rem not in score_list:
				score_list.append(rem)
				bar_speed += 1
				bar_frequency -= 200
				
		if bird_dead and len(destruct_group) == 0:
			score_page = True
			font =  "Fonts/BubblegumSans-Regular.ttf"
			if score < high_score:
				score_msg = Message(WIDTH // 2, int(60 * scale_y), int(55 * scale_y), "Score",font, WHITE, win)
			else:
				score_msg = Message(WIDTH // 2, int(60 * scale_y), int(55 * scale_y), "New High",font, WHITE, win)
			
			score_point = Message(WIDTH // 2, int(110 * scale_y), int(45 * scale_y), f"{score}", font, WHITE, win)
	
		if score_page:
			block_group.empty()
			bar_group.empty()
			ball_group.empty()
			
			p.reset()
	
	clock.tick(FPS)
	pygame.display.update()
	
pygame.quit()
