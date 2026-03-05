import math
import pygame
import random
import os

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

SCREEN = WIDTH, HEIGHT = parse_window_size(os.environ.get('ARCADE_WINDOW_SIZE')) or (288, 512)
SCALE_X = WIDTH / 288
SCALE_Y = HEIGHT / 512
SIDE_MARGIN = max(24, int(30 * SCALE_X))
ROAD_LEFT = SIDE_MARGIN
ROAD_RIGHT = WIDTH - SIDE_MARGIN
PLAYER_LEFT_LIMIT = ROAD_LEFT + max(8, int(10 * SCALE_X))
PLAYER_RIGHT_LIMIT = ROAD_RIGHT - max(6, int(8 * SCALE_X))

BLUE = (53, 81, 92)
RED = (255, 0, 0)
YELLOW = (255, 255, 0)

lane_pos = [int(v * SCALE_X) for v in [50, 95, 142, 190]]

class Road():
	def __init__(self):
		self.image = pygame.image.load('Assets/road.png')
		self.image = pygame.transform.scale(self.image, (WIDTH - (SIDE_MARGIN * 2), HEIGHT))

		self.reset()
		self.move = True

	def update(self, speed):
		if self.move:
			self.y1 += speed
			self.y2 += speed

			if self.y1 >= HEIGHT:
				self.y1 = -HEIGHT
			if self.y2 >= HEIGHT:
				self.y2 = -HEIGHT

	def draw(self, win):
		win.blit(self.image, (self.x, self.y1))
		win.blit(self.image, (self.x, self.y2))

	def reset(self):
		self.x = SIDE_MARGIN
		self.y1 = 0
		self.y2 = -HEIGHT

class Player(pygame.sprite.Sprite):
	def __init__(self, x, y, type):
		super(Player, self).__init__()
		self.image = pygame.image.load(f'Assets/cars/{type+1}.png')
		self.image = pygame.transform.scale(self.image, (48, 82))
		self.rect = self.image.get_rect()
		self.rect.x = x
		self.rect.y = y

	def update(self, left, right):
		if left:
			self.rect.x -= 5
			if self.rect.x <= PLAYER_LEFT_LIMIT:
				self.rect.x = PLAYER_LEFT_LIMIT
		if right:
			self.rect.x += 5
			if self.rect.right >= PLAYER_RIGHT_LIMIT:
				self.rect.right = PLAYER_RIGHT_LIMIT

		self.mask = pygame.mask.from_surface(self.image)

	def draw(self, win):
		win.blit(self.image, self.rect)

class Obstacle(pygame.sprite.Sprite):
	def __init__(self, type):
		super(Obstacle, self).__init__()
		dx = 0
		self.type = type

		if type == 1:
			ctype = random.randint(1, 8)
			self.image = pygame.image.load(f'Assets/cars/{ctype}.png')
			self.image = pygame.transform.flip(self.image, False, True)
			self.image = pygame.transform.scale(self.image, (48, 82))
		if type == 2:
			self.image = pygame.image.load('Assets/barrel.png')
			self.image = pygame.transform.scale(self.image, (24, 36))
			dx = 10
		elif type == 3:
			self.image = pygame.image.load('Assets/roadblock.png')
			self.image = pygame.transform.scale(self.image, (50, 25))

		self.rect = self.image.get_rect()
		self.rect.x = random.choice(lane_pos) + dx
		self.rect.y = -100

	def update(self, speed):
		self.rect.y += speed

		self.mask = pygame.mask.from_surface(self.image)

	def draw(self, win):
		win.blit(self.image, self.rect)

class Nitro:
	def __init__(self, x, y):
		self.image = pygame.image.load('Assets/nitro.png')
		self.image = pygame.transform.scale(self.image, (42, 42))
		self.rect = self.image.get_rect()
		self.rect.x = x
		self.rect.y = y

		self.gas = 0
		self.radius = 20
		self.CENTER = self.rect.centerx, self.rect.centery

	def update(self, nitro_on):
		if nitro_on:
			self.gas -= 1
			if self.gas <= -60:
				self.gas = -60
		else:
			self.gas += 1
			if self.gas >= 359:
				self.gas = 359

	def draw(self, win):
		win.blit(self.image, self.rect)
		if self.gas > 0 and self.gas < 360:
			for i in range(self.gas):
				x = round(self.CENTER[0] + self.radius * math.cos(i * math.pi / 180))
				y = round(self.CENTER[1] + self.radius * math.sin(i * math.pi / 180))
				pygame.draw.circle(win, YELLOW, (x, y), 1)

class Tree(pygame.sprite.Sprite):
	def __init__(self, x, y):
		super(Tree, self).__init__()

		type = random.randint(1, 4)
		self.image = pygame.image.load(f'Assets/trees/{type}.png')
		self.rect = self.image.get_rect()
		self.rect.x = x
		self.rect.y = y

	def update(self, speed):
		self.rect.y += speed
		if self.rect.top >= HEIGHT:
			self.kill()

	def draw(self, win):
		win.blit(self.image, self.rect)

class Fuel(pygame.sprite.Sprite):
	def __init__(self, x, y):
		super(Fuel, self).__init__()

		self.image = pygame.image.load('Assets/fuel.png')
		self.rect = self.image.get_rect()
		self.rect.x = x
		self.rect.y = y

	def update(self, speed):
		self.rect.y += speed
		if self.rect.top >= HEIGHT:
			self.kill()

	def draw(self, win):
		win.blit(self.image, self.rect)

class Coins(pygame.sprite.Sprite):
	def __init__(self, x, y):
		super(Coins, self).__init__()

		self.images = []
		for i in range(1, 7):
			img = pygame.image.load(f'Assets/Coins/{i}.png')
			self.images.append(img)

		self.counter = 0
		self.index = 0
		self.image = self.images[self.index]
		self.rect = self.image.get_rect()
		self.rect.x = x
		self.rect.y = y

	def update(self, speed):
		self.counter += 1
		if self.counter % 5 == 0:
			self.index = (self.index + 1) % len(self.images)

		self.rect.y += speed
		if self.rect.top >= HEIGHT:
			self.kill()

		self.image = self.images[self.index]

	def draw(self, win):
		win.blit(self.image, self.rect)

class Button(pygame.sprite.Sprite):
	def __init__(self, img, scale, x, y):
		super(Button, self).__init__()
		
		self.scale = scale
		self.image = pygame.transform.scale(img, self.scale)
		self.rect = self.image.get_rect()
		self.rect.x = x
		self.rect.y = y

		self.clicked = False

	def update_image(self, img):
		self.image = pygame.transform.scale(img, self.scale)

	def draw(self, win):
		action = False
		pos = pygame.mouse.get_pos()
		if self.rect.collidepoint(pos):
			if pygame.mouse.get_pressed()[0] and not self.clicked:
				action = True
				self.clicked = True

			if not pygame.mouse.get_pressed()[0]:
				self.clicked = False

		win.blit(self.image, self.rect)
		return action
