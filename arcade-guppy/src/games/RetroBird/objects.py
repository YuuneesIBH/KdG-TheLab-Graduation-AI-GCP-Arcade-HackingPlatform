import pygame
import random

WORLD_WIDTH = 288
WORLD_HEIGHT = 512
DISPLAY_HEIGHT = int(WORLD_HEIGHT * 0.80)

BIRD_WIDTH = 34
BIRD_HEIGHT = 24
BIRD_X = 64
BIRD_RADIUS = 14

PIPE_WIDTH = 52
PIPE_GAP = 116
PIPE_CAP_HEIGHT = 20
PIPE_SPAWN_X = WORLD_WIDTH + 36

GRAVITY = 0.38
MAX_FALL_SPEED = 7.2
FLAP_VELOCITY = -6.2

NEON_GREEN = (0, 255, 0)
NEON_BLUE = (0, 255, 255)
NEON_PINK = (255, 0, 255)
NEON_YELLOW = (255, 255, 0)
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)


class Grumpy:
	def __init__(self, surface):
		self.surface = surface
		self.bird_colors = [NEON_GREEN, NEON_PINK, NEON_YELLOW, NEON_BLUE]
		self.color = random.choice(self.bird_colors)
		self.reset()

	def draw_bird(self):
		body_rect = pygame.Rect(self.rect.x, self.rect.y, self.rect.width, self.rect.height)
		wing_offset = -1 if self.vel < -1 else 2 if self.vel > 3 else 0
		wing_rect = pygame.Rect(body_rect.x + 7, body_rect.y + 8 + wing_offset, 12, 8)
		beak_points = [
			(body_rect.right - 2, body_rect.centery),
			(body_rect.right + 9, body_rect.centery - 3),
			(body_rect.right + 9, body_rect.centery + 3),
		]

		pygame.draw.ellipse(self.surface, self.color, body_rect)
		pygame.draw.ellipse(self.surface, BLACK, body_rect, 2)
		pygame.draw.ellipse(self.surface, NEON_YELLOW, wing_rect)
		pygame.draw.ellipse(self.surface, BLACK, wing_rect, 2)
		pygame.draw.polygon(self.surface, NEON_YELLOW, beak_points)
		pygame.draw.polygon(self.surface, BLACK, beak_points, 2)
		pygame.draw.circle(self.surface, WHITE, (body_rect.x + 22, body_rect.y + 7), 4)
		pygame.draw.circle(self.surface, BLACK, (body_rect.x + 23, body_rect.y + 7), 2)

	def update(self):
		self.vel = min(MAX_FALL_SPEED, self.vel + GRAVITY)
		self.y += self.vel
		self.rect.y = int(round(self.y))
		self.draw_bird()

	def flap(self):
		if not self.alive:
			return
		self.vel = FLAP_VELOCITY

	def draw_flap(self):
		if self.flap_pos <= -10 or self.flap_pos >= 10:
			self.flap_inc *= -1
		self.flap_pos += self.flap_inc * 0.65
		self.y = self.idle_y + self.flap_pos
		self.rect.y = int(round(self.y))
		self.draw_bird()

	def reset(self):
		self.rect = pygame.Rect(BIRD_X, DISPLAY_HEIGHT // 2 - 8, BIRD_WIDTH, BIRD_HEIGHT)
		self.y = float(self.rect.y)
		self.idle_y = float(self.rect.y)
		self.vel = 0.0
		self.alive = True
		self.flap_pos = 0.0
		self.flap_inc = 1.0


class Base:
	def __init__(self, surface, color):
		self.surface = surface
		self.color = color
		self.x1 = 0.0
		self.x2 = float(WORLD_WIDTH)
		self.y = DISPLAY_HEIGHT

	def update(self, speed):
		self.x1 -= speed
		self.x2 -= speed

		if self.x1 <= -WORLD_WIDTH:
			self.x1 = self.x2 + WORLD_WIDTH
		if self.x2 <= -WORLD_WIDTH:
			self.x2 = self.x1 + WORLD_WIDTH

		height = WORLD_HEIGHT - self.y
		for x_offset in (int(round(self.x1)), int(round(self.x2))):
			pygame.draw.rect(self.surface, self.color, (x_offset, self.y, WORLD_WIDTH, height))
			pygame.draw.line(self.surface, WHITE, (x_offset, self.y), (x_offset + WORLD_WIDTH, self.y), 3)
			for x in range(x_offset, x_offset + WORLD_WIDTH, 20):
				pygame.draw.line(self.surface, BLACK, (x, self.y), (x, WORLD_HEIGHT), 1)


class Pipe(pygame.sprite.Sprite):
	def __init__(self, surface, gap_center, position, color):
		super().__init__()

		self.surface = surface
		self.color = color
		self.is_top = position == 1
		self.scored = False
		self.x = float(PIPE_SPAWN_X)
		gap_half = PIPE_GAP // 2

		if self.is_top:
			height = max(56, gap_center - gap_half)
			self.rect = pygame.Rect(int(self.x), 0, PIPE_WIDTH, height)
		else:
			top = min(DISPLAY_HEIGHT - 56, gap_center + gap_half)
			self.rect = pygame.Rect(int(self.x), top, PIPE_WIDTH, DISPLAY_HEIGHT - top)

	def update(self, speed):
		self.x -= speed
		self.rect.x = int(round(self.x))
		if self.rect.right < 0:
			self.kill()
			return

		pygame.draw.rect(self.surface, self.color, self.rect)
		pygame.draw.rect(self.surface, BLACK, self.rect, 3)
		inner_rect = self.rect.inflate(-10, -10)
		if inner_rect.width > 0 and inner_rect.height > 0:
			pygame.draw.rect(self.surface, BLACK, inner_rect, 2)

		for y in range(self.rect.top, self.rect.bottom, 15):
			pygame.draw.line(self.surface, BLACK, (self.rect.left, y), (self.rect.right, y), 1)

		if self.is_top:
			cap_rect = pygame.Rect(self.rect.x - 3, self.rect.bottom - PIPE_CAP_HEIGHT, self.rect.width + 6, PIPE_CAP_HEIGHT)
		else:
			cap_rect = pygame.Rect(self.rect.x - 3, self.rect.top, self.rect.width + 6, PIPE_CAP_HEIGHT)

		pygame.draw.rect(self.surface, self.color, cap_rect)
		pygame.draw.rect(self.surface, BLACK, cap_rect, 3)
