import pygame
import random

SCREEN = WIDTH, HEIGHT = 288, 512
display_height = 0.80 * HEIGHT

# RETRO COLORS
NEON_GREEN = (0, 255, 0)
NEON_BLUE = (0, 255, 255)
NEON_PINK = (255, 0, 255)
NEON_YELLOW = (255, 255, 0)
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)

class Grumpy:
	def __init__(self, win):
		self.win = win
		self.bird_colors = [NEON_GREEN, NEON_PINK, NEON_YELLOW, NEON_BLUE]
		self.color = random.choice(self.bird_colors)
		self.reset()
	
	def draw_bird(self):
		# Simple retro bird - just colored squares/circles
		size = 20
		
		# Body
		pygame.draw.circle(self.win, self.color, 
						 (self.rect.centerx, self.rect.centery), size)
		pygame.draw.circle(self.win, BLACK, 
						 (self.rect.centerx, self.rect.centery), size, 2)
		
		# Eye
		eye_x = self.rect.centerx + 8
		eye_y = self.rect.centery - 5
		pygame.draw.circle(self.win, WHITE, (eye_x, eye_y), 5)
		pygame.draw.circle(self.win, BLACK, (eye_x, eye_y), 3)
		
		# Beak
		beak_points = [
			(self.rect.centerx + 15, self.rect.centery),
			(self.rect.centerx + 25, self.rect.centery - 3),
			(self.rect.centerx + 25, self.rect.centery + 3)
		]
		pygame.draw.polygon(self.win, NEON_YELLOW, beak_points)
		pygame.draw.polygon(self.win, BLACK, beak_points, 2)
	
	def update(self):
		# gravity
		self.vel += 0.3
		if self.vel >= 8:
			self.vel = 8
		if self.rect.bottom <= display_height:
			self.rect.y += int(self.vel)
		
		if self.alive:
			# jump
			if pygame.mouse.get_pressed()[0] == 1 and not self.jumped:
				self.jumped = True
				self.vel = -6
			if pygame.mouse.get_pressed()[0] == 0:
				self.jumped = False
			
			# Flap animation
			self.counter += 1
			if self.counter > 5:
				self.counter = 0
		
		# Update rect for collision
		self.rect.width = 40
		self.rect.height = 40
		
		self.draw_bird()
	
	def draw_flap(self):
		# Floating animation on start screen
		self.counter += 1
		if self.counter > 5:
			self.counter = 0
		
		if self.flap_pos <= -10 or self.flap_pos > 10:
			self.flap_inc *= -1
		self.flap_pos += self.flap_inc
		self.rect.y += self.flap_inc
		self.rect.x = WIDTH // 2 - 20
		
		self.draw_bird()
	
	def reset(self):
		self.rect = pygame.Rect(0, 0, 40, 40)
		self.rect.x = 60
		self.rect.y = int(display_height) // 2
		self.counter = 0
		self.vel = 0
		self.jumped = False
		self.alive = True
		self.theta = 0
		self.flap_pos = 0
		self.flap_inc = 1

class Base:
	def __init__(self, win, color):
		self.win = win
		self.color = color
		self.x1 = 0
		self.x2 = WIDTH
		self.y = int(display_height)
	
	def update(self, speed):
		self.x1 -= speed
		self.x2 -= speed
		
		if self.x1 <= -WIDTH:
			self.x1 = WIDTH - 5
		if self.x2 <= -WIDTH:
			self.x2 = WIDTH - 5
		
		# Draw retro base
		height = HEIGHT - self.y
		
		# Main base block
		pygame.draw.rect(self.win, self.color, (self.x1, self.y, WIDTH, height))
		pygame.draw.rect(self.win, self.color, (self.x2, self.y, WIDTH, height))
		
		# Border
		pygame.draw.line(self.win, WHITE, (0, self.y), (WIDTH, self.y), 3)
		
		# Grid pattern on base
		for x in range(int(self.x1), int(self.x1) + WIDTH, 20):
			pygame.draw.line(self.win, BLACK, (x, self.y), (x, HEIGHT), 1)
		for x in range(int(self.x2), int(self.x2) + WIDTH, 20):
			pygame.draw.line(self.win, BLACK, (x, self.y), (x, HEIGHT), 1)

class Pipe(pygame.sprite.Sprite):
	def __init__(self, win, y, position, color):
		super(Pipe, self).__init__()
		
		self.win = win
		self.color = color
		self.width = 52
		self.height = 320
		pipe_gap = 100 // 2
		x = WIDTH
		
		if position == 1:
			# Top pipe
			self.rect = pygame.Rect(x, y - pipe_gap - self.height, self.width, self.height)
			self.is_top = True
		elif position == -1:
			# Bottom pipe
			self.rect = pygame.Rect(x, y + pipe_gap, self.width, self.height)
			self.is_top = False
	
	def update(self, speed):
		self.rect.x -= speed
		if self.rect.right < 0:
			self.kill()
		
		# Draw retro pipe
		# Main body
		pygame.draw.rect(self.win, self.color, self.rect)
		pygame.draw.rect(self.win, BLACK, self.rect, 3)
		
		# Inner details
		inner_rect = self.rect.inflate(-10, -10)
		pygame.draw.rect(self.win, BLACK, inner_rect, 2)
		
		# Horizontal lines for texture
		for y in range(self.rect.top, self.rect.bottom, 15):
			pygame.draw.line(self.win, BLACK, 
						   (self.rect.left, y), 
						   (self.rect.right, y), 1)
		
		# Pipe cap
		if self.is_top:
			cap_rect = pygame.Rect(self.rect.x - 3, self.rect.bottom - 20, 
								 self.width + 6, 20)
		else:
			cap_rect = pygame.Rect(self.rect.x - 3, self.rect.top, 
								 self.width + 6, 20)
		
		pygame.draw.rect(self.win, self.color, cap_rect)
		pygame.draw.rect(self.win, BLACK, cap_rect, 3)

class Score:
	def __init__(self, x, y, win):
		self.x = x
		self.y = y
		self.win = win
	
	def update(self, score):
		# Rendered in main.py with retro style
		pass