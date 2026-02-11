import pygame
import random
import sys
import math
import os

# Configuración inicial
DEFAULT_SCREEN_WIDTH = 800
DEFAULT_SCREEN_HEIGHT = 600
SCREEN_WIDTH = DEFAULT_SCREEN_WIDTH
SCREEN_HEIGHT = DEFAULT_SCREEN_HEIGHT
PLAYER_SPEED = 6
BULLET_SPEED = 10
ALIEN_SPAWN_RATE = 60  # frames tussen spawns
POWERUP_SPEED = 3

# Colores
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
RED = (255, 0, 0)
GREEN = (0, 255, 0)
BLUE = (0, 150, 255)
YELLOW = (255, 255, 0)
ORANGE = (255, 165, 0)
PURPLE = (200, 0, 255)
CYAN = (0, 255, 255)
DARK_BLUE = (10, 10, 50)

# Configure embedded/windowed mode from launcher environment variables
def parse_window_size(raw_value):
    if not raw_value:
        return None

    cleaned_value = raw_value.strip().lower().replace(' ', '')
    separator = 'x' if 'x' in cleaned_value else ','
    parts = cleaned_value.split(separator)
    if len(parts) != 2:
        return None

    try:
        width = max(320, int(parts[0]))
        height = max(240, int(parts[1]))
        return (width, height)
    except ValueError:
        return None

embedded_mode = os.environ.get('ARCADE_EMBEDDED') == '1'
window_size = parse_window_size(os.environ.get('ARCADE_WINDOW_SIZE'))
window_pos = os.environ.get('ARCADE_WINDOW_POS')

if window_size:
    SCREEN_WIDTH, SCREEN_HEIGHT = window_size

if window_pos:
    os.environ['SDL_VIDEO_WINDOW_POS'] = window_pos

# Inicializa Pygame
pygame.init()

# Fix for pygame.font issue with Python 3.14
# Try to initialize font module explicitly
try:
    pygame.font.init()
except:
    pass

display_flags = pygame.NOFRAME if embedded_mode else 0
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT), display_flags)
pygame.display.set_caption("Space Battle - Alien Invasion")
clock = pygame.time.Clock()

# Helper function to get font with fallback
def get_font(size):
    """Get font with fallback for Python 3.14 compatibility"""
    # Try system fonts first (these usually work even when Font doesn't)
    system_fonts = ['arial', 'helvetica', 'courier', 'times', 'verdana', 'dejavusans']
    
    for font_name in system_fonts:
        try:
            return pygame.font.SysFont(font_name, size)
        except:
            continue
    
    # Try default system font
    try:
        default_font = pygame.font.get_default_font()
        if default_font:
            return pygame.font.SysFont(default_font, size)
    except:
        pass
    
    # Last resort: try Font with None (might fail but worth trying)
    try:
        return pygame.font.Font(None, size)
    except:
        # If all else fails, return None and handle in code
        return None

# Clase de estrellas animadas
class Star:
    def __init__(self):
        self.x = random.randint(0, SCREEN_WIDTH)
        self.y = random.randint(0, SCREEN_HEIGHT)
        self.speed = random.uniform(0.5, 2)
        self.brightness = random.randint(100, 255)
        self.size = random.randint(1, 3)
    
    def update(self):
        self.y += self.speed
        if self.y > SCREEN_HEIGHT:
            self.y = 0
            self.x = random.randint(0, SCREEN_WIDTH)
    
    def draw(self, surface):
        color = (self.brightness, self.brightness, self.brightness)
        pygame.draw.circle(surface, color, (int(self.x), int(self.y)), self.size)

# Clase de partículas para efectos visuales
class Particle:
    def __init__(self, x, y, color):
        self.x = x
        self.y = y
        self.color = color
        self.vx = random.uniform(-4, 4)
        self.vy = random.uniform(-4, 4)
        self.lifetime = 40
        self.size = random.randint(2, 6)

    def update(self):
        self.x += self.vx
        self.y += self.vy
        self.vy += 0.2  # gravedad
        self.lifetime -= 1
        self.size = max(1, self.size - 0.1)

    def draw(self, surface):
        if self.lifetime > 0:
            alpha = int(255 * (self.lifetime / 40))
            pygame.draw.circle(surface, self.color, (int(self.x), int(self.y)), int(self.size))

# Sistema de partículas
class ParticleSystem:
    def __init__(self):
        self.particles = []

    def emit(self, x, y, color, count=15):
        for _ in range(count):
            self.particles.append(Particle(x, y, color))

    def update(self):
        self.particles = [p for p in self.particles if p.lifetime > 0]
        for particle in self.particles:
            particle.update()

    def draw(self, surface):
        for particle in self.particles:
            particle.draw(surface)

# Clase del jugador - SPACESHIP DETALLADO
class Player:
    def __init__(self):
        self.width = 60
        self.height = 50
        self.image = self.create_spaceship()
        self.rect = self.image.get_rect(midbottom=(SCREEN_WIDTH / 2, SCREEN_HEIGHT - 40))
        self.speed = PLAYER_SPEED
        self.bullets = []
        self.shoot_delay = 0
        self.max_shoot_delay = 10
        self.powerup_active = False
        self.powerup_timer = 0
        self.shield_active = False
        self.shield_timer = 0
        self.engine_glow = 0

    def create_spaceship(self):
        surface = pygame.Surface((self.width, self.height), pygame.SRCALPHA)
        
        # Cuerpo principal de la nave (forma de flecha)
        body_color = (200, 200, 220)
        pygame.draw.polygon(surface, body_color, [
            (30, 0),      # punta
            (15, 20),     # izquierda arriba
            (20, 35),     # izquierda medio
            (10, 50),     # izquierda abajo
            (50, 50),     # derecha abajo
            (40, 35),     # derecha medio
            (45, 20),     # derecha arriba
        ])
        
        # Cabina (azul brillante)
        pygame.draw.ellipse(surface, (100, 200, 255), (22, 8, 16, 18))
        pygame.draw.ellipse(surface, (200, 240, 255), (24, 10, 12, 12))
        
        # Alas laterales
        wing_color = (150, 150, 180)
        # Ala izquierda
        pygame.draw.polygon(surface, wing_color, [(20, 20), (0, 30), (5, 40), (20, 35)])
        # Ala derecha
        pygame.draw.polygon(surface, wing_color, [(40, 20), (60, 30), (55, 40), (40, 35)])
        
        # Detalles de color
        pygame.draw.line(surface, CYAN, (30, 5), (30, 25), 2)
        
        # Motores (circulitos en la parte trasera)
        pygame.draw.circle(surface, (80, 80, 100), (15, 48), 4)
        pygame.draw.circle(surface, (80, 80, 100), (45, 48), 4)
        pygame.draw.circle(surface, ORANGE, (15, 48), 2)
        pygame.draw.circle(surface, ORANGE, (45, 48), 2)
        
        # Líneas de detalle
        pygame.draw.line(surface, (150, 150, 170), (25, 15), (25, 30), 1)
        pygame.draw.line(surface, (150, 150, 170), (35, 15), (35, 30), 1)
        
        return surface

    def move(self, direction):
        if direction == "left" and self.rect.left > 0:
            self.rect.x -= self.speed
        elif direction == "right" and self.rect.right < SCREEN_WIDTH:
            self.rect.x += self.speed

    def shoot(self):
        if self.shoot_delay <= 0:
            if self.powerup_active:
                # Triple disparo
                self.bullets.append(Bullet(self.rect.centerx, self.rect.top, 0))
                self.bullets.append(Bullet(self.rect.centerx - 20, self.rect.top + 10, -1))
                self.bullets.append(Bullet(self.rect.centerx + 20, self.rect.top + 10, 1))
            else:
                bullet = Bullet(self.rect.centerx, self.rect.top, 0)
                self.bullets.append(bullet)
            self.shoot_delay = self.max_shoot_delay

    def update_bullets(self):
        if self.shoot_delay > 0:
            self.shoot_delay -= 1
        
        for bullet in self.bullets[:]:
            bullet.move()
            if bullet.rect.bottom < 0:
                self.bullets.remove(bullet)

    def update_powerups(self):
        if self.powerup_active:
            self.powerup_timer -= 1
            if self.powerup_timer <= 0:
                self.powerup_active = False
        
        if self.shield_active:
            self.shield_timer -= 1
            if self.shield_timer <= 0:
                self.shield_active = False

    def activate_powerup(self, powerup_type):
        if powerup_type == "triple":
            self.powerup_active = True
            self.powerup_timer = 400
        elif powerup_type == "shield":
            self.shield_active = True
            self.shield_timer = 400

    def draw(self, surface):
        # Efecto de motores brillantes (animado)
        self.engine_glow = (self.engine_glow + 1) % 20
        glow_size = 3 + self.engine_glow // 5
        
        # Glow de motores
        engine_color = (255, int(150 + self.engine_glow * 5), 0)
        pygame.draw.circle(surface, engine_color, 
                         (self.rect.left + 15, self.rect.bottom - 2), glow_size)
        pygame.draw.circle(surface, engine_color, 
                         (self.rect.right - 15, self.rect.bottom - 2), glow_size)
        
        # Dibujar nave
        surface.blit(self.image, self.rect)
        
        # Dibujar escudo si está activo
        if self.shield_active:
            time = pygame.time.get_ticks()
            alpha = int(100 + 50 * math.sin(time / 100))
            
            # Crear superficie para el escudo hexagonal
            shield_surface = pygame.Surface((self.width + 30, self.height + 30), pygame.SRCALPHA)
            center_x = self.width // 2 + 15
            center_y = self.height // 2 + 15
            radius = 38
            
            # Hexágono giratorio
            angle_offset = time / 500
            points = []
            for i in range(6):
                angle = math.pi / 3 * i + angle_offset
                x = center_x + radius * math.cos(angle)
                y = center_y + radius * math.sin(angle)
                points.append((x, y))
            
            pygame.draw.polygon(shield_surface, (*CYAN, alpha), points, 3)
            pygame.draw.polygon(shield_surface, (*BLUE, alpha // 2), points, 1)
            
            surface.blit(shield_surface, (self.rect.x - 15, self.rect.y - 15))

# Clase de disparos del jugador
class Bullet:
    def __init__(self, x, y, angle=0):
        self.width = 4
        self.height = 18
        self.image = pygame.Surface((self.width, self.height), pygame.SRCALPHA)
        
        # Laser azul brillante
        pygame.draw.rect(self.image, CYAN, (0, 0, 4, 18))
        pygame.draw.rect(self.image, WHITE, (1, 0, 2, 6))
        
        self.rect = self.image.get_rect(center=(x, y))
        self.speed = BULLET_SPEED
        self.angle = angle

    def move(self):
        self.rect.y -= self.speed
        self.rect.x += self.angle * 2

# Clase de aliens que bajan desde arriba
class Alien:
    def __init__(self, x, alien_type=0):
        self.type = alien_type
        self.width = 50
        self.height = 50
        self.image = self.create_alien()
        self.rect = self.image.get_rect(center=(x, -50))
        
        # Diferentes patrones de movimiento
        if alien_type == 0:
            self.speed_y = random.uniform(1.5, 2.5)
            self.speed_x = 0
            self.points = 10
        elif alien_type == 1:
            self.speed_y = random.uniform(2, 3)
            self.speed_x = random.choice([-1, 1]) * random.uniform(0.5, 1.5)
            self.points = 20
        else:
            self.speed_y = random.uniform(2.5, 3.5)
            self.speed_x = math.sin(pygame.time.get_ticks() / 1000) * 2
            self.points = 30
        
        self.shoot_cooldown = random.randint(60, 180)
        self.wobble = random.uniform(0, math.pi * 2)

    def create_alien(self):
        surface = pygame.Surface((self.width, self.height), pygame.SRCALPHA)
        
        if self.type == 0:
            # Alien tipo pulpo - rojo
            color = RED
            # Cuerpo redondo
            pygame.draw.circle(surface, color, (25, 20), 18)
            # Ojos grandes
            pygame.draw.circle(surface, (255, 255, 0), (17, 17), 6)
            pygame.draw.circle(surface, (255, 255, 0), (33, 17), 6)
            pygame.draw.circle(surface, BLACK, (17, 17), 3)
            pygame.draw.circle(surface, BLACK, (33, 17), 3)
            # Tentáculos
            for i in range(5):
                x = 8 + i * 8
                pygame.draw.line(surface, color, (x, 35), (x - 3, 48), 3)
            
        elif self.type == 1:
            # Alien tipo insecto - púrpura
            color = PURPLE
            # Cuerpo ovalado
            pygame.draw.ellipse(surface, color, (10, 15, 30, 25))
            # Cabeza
            pygame.draw.circle(surface, color, (25, 12), 10)
            # Ojos compuestos
            pygame.draw.circle(surface, (0, 255, 0), (20, 10), 4)
            pygame.draw.circle(surface, (0, 255, 0), (30, 10), 4)
            pygame.draw.circle(surface, BLACK, (20, 10), 2)
            pygame.draw.circle(surface, BLACK, (30, 10), 2)
            # Antenas
            pygame.draw.line(surface, color, (18, 8), (12, 0), 2)
            pygame.draw.line(surface, color, (32, 8), (38, 0), 2)
            pygame.draw.circle(surface, (255, 255, 0), (12, 0), 2)
            pygame.draw.circle(surface, (255, 255, 0), (38, 0), 2)
            # Patas
            for i in range(3):
                y = 20 + i * 5
                pygame.draw.line(surface, color, (10, y), (3, y + 8), 2)
                pygame.draw.line(surface, color, (40, y), (47, y + 8), 2)
                
        else:
            # Alien tipo nave - naranja
            color = ORANGE
            # Platillo volador
            pygame.draw.ellipse(surface, color, (5, 20, 40, 15))
            pygame.draw.ellipse(surface, (255, 200, 0), (10, 18, 30, 10))
            # Cúpula
            pygame.draw.ellipse(surface, (200, 100, 0), (15, 10, 20, 18))
            pygame.draw.ellipse(surface, (255, 255, 100), (18, 12, 14, 12))
            # Luces parpadeantes
            for i in range(4):
                x = 12 + i * 8
                pygame.draw.circle(surface, CYAN, (x, 27), 2)
        
        return surface

    def move(self):
        self.rect.y += self.speed_y
        
        # Movimiento ondulante para algunos tipos
        if self.type >= 1:
            self.wobble += 0.05
            self.rect.x += math.sin(self.wobble) * 1.5
        else:
            self.rect.x += self.speed_x
        
        # Mantener en pantalla horizontalmente
        if self.rect.left < 0:
            self.rect.left = 0
            self.speed_x *= -1
        elif self.rect.right > SCREEN_WIDTH:
            self.rect.right = SCREEN_WIDTH
            self.speed_x *= -1

    def can_shoot(self):
        self.shoot_cooldown -= 1
        if self.shoot_cooldown <= 0:
            self.shoot_cooldown = random.randint(80, 200)
            return True
        return False

# Clase de disparos de aliens
class AlienBullet:
    def __init__(self, x, y):
        self.width = 6
        self.height = 16
        self.image = pygame.Surface((self.width, self.height), pygame.SRCALPHA)
        
        # Plasma rojo
        pygame.draw.ellipse(self.image, RED, (0, 0, 6, 16))
        pygame.draw.ellipse(self.image, ORANGE, (1, 2, 4, 12))
        pygame.draw.ellipse(self.image, YELLOW, (2, 4, 2, 8))
        
        self.rect = self.image.get_rect(center=(x, y))
        self.speed = 4

    def move(self):
        self.rect.y += self.speed

# Power-ups
class PowerUp:
    def __init__(self, x, y, powerup_type):
        self.type = powerup_type
        self.size = 25
        self.image = pygame.Surface((self.size, self.size), pygame.SRCALPHA)
        self.create_image()
        self.rect = self.image.get_rect(center=(x, y))
        self.speed = POWERUP_SPEED
        self.wobble = 0

    def create_image(self):
        if self.type == "triple":
            # Símbolo de triple disparo
            pygame.draw.circle(self.image, ORANGE, (12, 12), 12)
            pygame.draw.circle(self.image, YELLOW, (12, 12), 10)
            font = get_font(20)
            if font:
                text = font.render("3X", True, BLACK)
            else:
                text = None
            if text:
                self.image.blit(text, (4, 6))
            
        elif self.type == "shield":
            # Símbolo de escudo
            pygame.draw.circle(self.image, CYAN, (12, 12), 12)
            pygame.draw.circle(self.image, BLUE, (12, 12), 10)
            # Hexágono pequeño
            points = []
            for i in range(6):
                angle = math.pi / 3 * i
                x = 12 + 7 * math.cos(angle)
                y = 12 + 7 * math.sin(angle)
                points.append((x, y))
            pygame.draw.polygon(self.image, WHITE, points, 2)

    def move(self):
        self.rect.y += self.speed
        self.wobble += 0.1
        self.rect.x += math.sin(self.wobble) * 0.5

# Clase principal del juego
class SpaceBattle:
    def __init__(self):
        self.player = Player()
        self.aliens = []
        self.alien_bullets = []
        self.powerups = []
        self.stars = [Star() for _ in range(100)]
        self.score = 0
        self.lives = 3
        self.level = 1
        self.particles = ParticleSystem()
        self.game_state = "playing"  # playing, game_over
        self.spawn_timer = 0
        self.aliens_killed = 0
        self.spawn_rate = ALIEN_SPAWN_RATE

    def spawn_alien(self):
        self.spawn_timer -= 1
        if self.spawn_timer <= 0:
            x = random.randint(50, SCREEN_WIDTH - 50)
            
            # Probabilidad de diferentes tipos según el nivel
            rand = random.random()
            if rand < 0.6:
                alien_type = 0
            elif rand < 0.85:
                alien_type = 1
            else:
                alien_type = 2
            
            self.aliens.append(Alien(x, alien_type))
            
            # Aumentar dificultad con el tiempo
            self.spawn_rate = max(20, ALIEN_SPAWN_RATE - self.level * 3)
            self.spawn_timer = self.spawn_rate

    def move_aliens(self):
        for alien in self.aliens[:]:
            alien.move()
            
            # Eliminar aliens que salieron de la pantalla
            if alien.rect.top > SCREEN_HEIGHT:
                self.aliens.remove(alien)
                self.lives -= 1
                if self.lives <= 0:
                    self.game_state = "game_over"

    def alien_shoot(self):
        for alien in self.aliens:
            if alien.can_shoot() and random.random() < 0.02:
                bullet = AlienBullet(alien.rect.centerx, alien.rect.bottom)
                self.alien_bullets.append(bullet)

    def update_alien_bullets(self):
        for bullet in self.alien_bullets[:]:
            bullet.move()
            if bullet.rect.top > SCREEN_HEIGHT:
                self.alien_bullets.remove(bullet)
            elif bullet.rect.colliderect(self.player.rect):
                self.alien_bullets.remove(bullet)
                if not self.player.shield_active:
                    self.lives -= 1
                    self.particles.emit(self.player.rect.centerx, self.player.rect.centery, RED, 25)
                    if self.lives <= 0:
                        self.game_state = "game_over"
                else:
                    self.particles.emit(bullet.rect.centerx, bullet.rect.centery, CYAN, 12)

    def check_collisions(self):
        for bullet in self.player.bullets[:]:
            for alien in self.aliens[:]:
                if bullet.rect.colliderect(alien.rect):
                    if bullet in self.player.bullets:
                        self.player.bullets.remove(bullet)
                    self.aliens.remove(alien)
                    self.score += alien.points
                    self.aliens_killed += 1
                    
                    # Efecto de explosión según tipo
                    if alien.type == 0:
                        self.particles.emit(alien.rect.centerx, alien.rect.centery, RED, 20)
                    elif alien.type == 1:
                        self.particles.emit(alien.rect.centerx, alien.rect.centery, PURPLE, 20)
                    else:
                        self.particles.emit(alien.rect.centerx, alien.rect.centery, ORANGE, 25)
                    
                    # Subir de nivel cada 20 aliens
                    if self.aliens_killed % 20 == 0:
                        self.level += 1
                    
                    # Probabilidad de soltar power-up
                    if random.random() < 0.15:
                        powerup_type = random.choice(["triple", "shield"])
                        self.powerups.append(PowerUp(alien.rect.centerx, alien.rect.centery, powerup_type))
                    break

    def update_powerups(self):
        for powerup in self.powerups[:]:
            powerup.move()
            if powerup.rect.top > SCREEN_HEIGHT:
                self.powerups.remove(powerup)
            elif powerup.rect.colliderect(self.player.rect):
                self.player.activate_powerup(powerup.type)
                self.powerups.remove(powerup)
                self.particles.emit(powerup.rect.centerx, powerup.rect.centery, 
                                  ORANGE if powerup.type == "triple" else CYAN, 20)

    def update_stars(self):
        for star in self.stars:
            star.update()

    def draw(self):
        # Fondo degradado espacial
        for y in range(SCREEN_HEIGHT):
            color_value = int(10 + (y / SCREEN_HEIGHT) * 20)
            pygame.draw.line(screen, (color_value, color_value, color_value + 20), 
                           (0, y), (SCREEN_WIDTH, y))
        
        # Estrellas animadas
        for star in self.stars:
            star.draw(screen)
        
        # Partículas
        self.particles.draw(screen)
        
        # Jugador y elementos
        self.player.draw(screen)
        
        for bullet in self.player.bullets:
            screen.blit(bullet.image, bullet.rect)
        
        for bullet in self.alien_bullets:
            screen.blit(bullet.image, bullet.rect)
        
        for alien in self.aliens:
            screen.blit(alien.image, alien.rect)
        
        for powerup in self.powerups:
            screen.blit(powerup.image, powerup.rect)
        
        # HUD con diseño mejorado
        font = get_font(32)
        font_small = get_font(24)
        
        # Skip rendering if fonts are not available
        if font is None or font_small is None:
            return
        
        # Panel superior semi-transparente
        panel = pygame.Surface((SCREEN_WIDTH, 60), pygame.SRCALPHA)
        panel.fill((0, 0, 0, 120))
        screen.blit(panel, (0, 0))
        
        # Textos del HUD
        score_text = font.render(f"SCORE: {self.score}", True, YELLOW)
        lives_text = font.render(f"LIVES: {self.lives}", True, GREEN if self.lives > 1 else RED)
        level_text = font.render(f"LEVEL: {self.level}", True, CYAN)
        
        screen.blit(score_text, (20, 15))
        screen.blit(level_text, (SCREEN_WIDTH // 2 - 60, 15))
        screen.blit(lives_text, (SCREEN_WIDTH - 150, 15))
        
        # Indicadores de power-ups activos
        if self.player.powerup_active:
            time_left = self.player.powerup_timer // 60
            powerup_text = font_small.render(f"TRIPLE SHOT: {time_left}s", True, ORANGE)
            screen.blit(powerup_text, (20, 65))
        
        if self.player.shield_active:
            time_left = self.player.shield_timer // 60
            shield_text = font_small.render(f"SHIELD: {time_left}s", True, CYAN)
            screen.blit(shield_text, (20, 90 if self.player.powerup_active else 65))
        
        # Game Over
        if self.game_state == "game_over":
            self.draw_game_over()

    def draw_game_over(self):
        overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
        overlay.fill((0, 0, 0, 200))
        screen.blit(overlay, (0, 0))
        
        font_huge = get_font(90)
        font_large = get_font(48)
        font_medium = get_font(36)
        
        if not (font_huge and font_large and font_medium):
            return
        
        game_over_text = font_huge.render("GAME OVER", True, RED)
        score_text = font_large.render(f"Final Score: {self.score}", True, YELLOW)
        level_text = font_medium.render(f"Level Reached: {self.level}", True, CYAN)
        kills_text = font_medium.render(f"Aliens Destroyed: {self.aliens_killed}", True, GREEN)
        restart_text = font_large.render("Press R to Restart", True, WHITE)
        
        screen.blit(game_over_text, (SCREEN_WIDTH // 2 - 230, SCREEN_HEIGHT // 2 - 120))
        screen.blit(score_text, (SCREEN_WIDTH // 2 - 160, SCREEN_HEIGHT // 2 - 20))
        screen.blit(level_text, (SCREEN_WIDTH // 2 - 130, SCREEN_HEIGHT // 2 + 30))
        screen.blit(kills_text, (SCREEN_WIDTH // 2 - 150, SCREEN_HEIGHT // 2 + 70))
        screen.blit(restart_text, (SCREEN_WIDTH // 2 - 180, SCREEN_HEIGHT // 2 + 130))

    def reset_game(self):
        self.player = Player()
        self.aliens = []
        self.alien_bullets = []
        self.powerups = []
        self.score = 0
        self.lives = 3
        self.level = 1
        self.game_state = "playing"
        self.spawn_timer = 0
        self.aliens_killed = 0

    def run(self):
        running = True
        while running:
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    pygame.quit()
                    sys.exit()
                elif event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_SPACE and self.game_state == "playing":
                        self.player.shoot()
                    elif event.key == pygame.K_r and self.game_state == "game_over":
                        self.reset_game()

            if self.game_state == "playing":
                keys = pygame.key.get_pressed()
                if keys[pygame.K_LEFT] or keys[pygame.K_a]:
                    self.player.move("left")
                if keys[pygame.K_RIGHT] or keys[pygame.K_d]:
                    self.player.move("right")

                # Actualiza lógica del juego
                self.spawn_alien()
                self.player.update_bullets()
                self.player.update_powerups()
                self.move_aliens()
                self.alien_shoot()
                self.update_alien_bullets()
                self.check_collisions()
                self.update_powerups()
                self.particles.update()
                self.update_stars()

            # Dibuja en pantalla
            self.draw()
            pygame.display.flip()
            clock.tick(60)

if __name__ == "__main__":
    game = SpaceBattle()
    game.run()
