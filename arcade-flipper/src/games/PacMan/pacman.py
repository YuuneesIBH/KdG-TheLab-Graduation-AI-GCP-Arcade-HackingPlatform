  
import os
import pygame
pygame.init()
pygame.joystick.init()
JOYSTICK_DEADZONE = 0.3
JOYSTICK_SPEED = 30
active_js_index = None
def _refresh_joysticks():
  return [pygame.joystick.Joystick(i) for i in range(pygame.joystick.get_count())]
for js in _refresh_joysticks():
  js.init()

black = (0,0,0)
white = (255,255,255)
blue = (0,0,255)
red = (255,0,0)
yellow   = ( 255, 255,   0)

Trollicon=pygame.image.load('images/Trollman.png')
pygame.display.set_icon(Trollicon)
try:
    pygame.mixer.init()
    pygame.mixer.music.load('pacman.mp3')
    pygame.mixer.music.play(-1, 0.0)
except pygame.error:
    pass
class Wall(pygame.sprite.Sprite):
    def __init__(self,x,y,width,height, color):
        pygame.sprite.Sprite.__init__(self)
        self.image = pygame.Surface([width, height])
        self.image.fill(color)
        self.rect = self.image.get_rect()
        self.rect.top = y
        self.rect.left = x
def setupRoomOne(all_sprites_list):
    wall_list=pygame.sprite.RenderPlain()
    walls = [ [0,0,6,600],
              [0,0,600,6],
              [0,600,606,6],
              [600,0,6,606],
              [300,0,6,66],
              [60,60,186,6],
              [360,60,186,6],
              [60,120,66,6],
              [60,120,6,126],
              [180,120,246,6],
              [300,120,6,66],
              [480,120,66,6],
              [540,120,6,126],
              [120,180,126,6],
              [120,180,6,126],
              [360,180,126,6],
              [480,180,6,126],
              [180,240,6,126],
              [180,360,246,6],
              [420,240,6,126],
              [240,240,42,6],
              [324,240,42,6],
              [240,240,6,66],
              [240,300,126,6],
              [360,240,6,66],
              [0,300,66,6],
              [540,300,66,6],
              [60,360,66,6],
              [60,360,6,186],
              [480,360,66,6],
              [540,360,6,186],
              [120,420,366,6],
              [120,420,6,66],
              [480,420,6,66],
              [180,480,246,6],
              [300,480,6,66],
              [120,540,126,6],
              [360,540,126,6]
            ]
    for item in walls:
        wall=Wall(item[0],item[1],item[2],item[3],blue)
        wall_list.add(wall)
        all_sprites_list.add(wall)
    return wall_list

def setupGate(all_sprites_list):
      gate = pygame.sprite.RenderPlain()
      gate.add(Wall(282,242,42,2,white))
      all_sprites_list.add(gate)
      return gate
class Block(pygame.sprite.Sprite):
    def __init__(self, color, width, height):
        pygame.sprite.Sprite.__init__(self) 
        self.image = pygame.Surface([width, height])
        self.image.fill(white)
        self.image.set_colorkey(white)
        pygame.draw.ellipse(self.image,color,[0,0,width,height])
        self.rect = self.image.get_rect() 
class Player(pygame.sprite.Sprite):
    change_x=0
    change_y=0
    def __init__(self,x,y, filename):
        pygame.sprite.Sprite.__init__(self)
        self.image = pygame.image.load(filename).convert()
        self.rect = self.image.get_rect()
        self.rect.top = y
        self.rect.left = x
        self.prev_x = x
        self.prev_y = y
    def prevdirection(self):
        self.prev_x = self.change_x
        self.prev_y = self.change_y
    def changespeed(self,x,y):
        self.change_x+=x
        self.change_y+=y
    def update(self,walls,gate):
        
        old_x=self.rect.left
        new_x=old_x+self.change_x
        prev_x=old_x+self.prev_x
        self.rect.left = new_x
        
        old_y=self.rect.top
        new_y=old_y+self.change_y
        prev_y=old_y+self.prev_y
        x_collide = pygame.sprite.spritecollide(self, walls, False)
        if x_collide:
            self.rect.left=old_x
        else:

            self.rect.top = new_y
            y_collide = pygame.sprite.spritecollide(self, walls, False)
            if y_collide:
                self.rect.top=old_y

        if gate != False:
          gate_hit = pygame.sprite.spritecollide(self, gate, False)
          if gate_hit:
            self.rect.left=old_x
            self.rect.top=old_y
class Ghost(Player):
    def changespeed(self,list,ghost,turn,steps,l):
      try:
        z=list[turn][2]
        if steps < z:
          self.change_x=list[turn][0]
          self.change_y=list[turn][1]
          steps+=1
        else:
          if turn < l:
            turn+=1
          elif ghost == "clyde":
            turn = 2
          else:
            turn = 0
          self.change_x=list[turn][0]
          self.change_y=list[turn][1]
          steps = 0
        return [turn,steps]
      except IndexError:
         return [0,0]

Pinky_directions = [
[0,-30,4],
[15,0,9],
[0,15,11],
[-15,0,23],
[0,15,7],
[15,0,3],
[0,-15,3],
[15,0,19],
[0,15,3],
[15,0,3],
[0,15,3],
[15,0,3],
[0,-15,15],
[-15,0,7],
[0,15,3],
[-15,0,19],
[0,-15,11],
[15,0,9]
]

Blinky_directions = [
[0,-15,4],
[15,0,9],
[0,15,11],
[15,0,3],
[0,15,7],
[-15,0,11],
[0,15,3],
[15,0,15],
[0,-15,15],
[15,0,3],
[0,-15,11],
[-15,0,3],
[0,-15,11],
[-15,0,3],
[0,-15,3],
[-15,0,7],
[0,-15,3],
[15,0,15],
[0,15,15],
[-15,0,3],
[0,15,3],
[-15,0,3],
[0,-15,7],
[-15,0,3],
[0,15,7],
[-15,0,11],
[0,-15,7],
[15,0,5]
]

Inky_directions = [
[30,0,2],
[0,-15,4],
[15,0,10],
[0,15,7],
[15,0,3],
[0,-15,3],
[15,0,3],
[0,-15,15],
[-15,0,15],
[0,15,3],
[15,0,15],
[0,15,11],
[-15,0,3],
[0,-15,7],
[-15,0,11],
[0,15,3],
[-15,0,11],
[0,15,7],
[-15,0,3],
[0,-15,3],
[-15,0,3],
[0,-15,15],
[15,0,15],
[0,15,3],
[-15,0,15],
[0,15,11],
[15,0,3],
[0,-15,11],
[15,0,11],
[0,15,3],
[15,0,1],
]

Clyde_directions = [
[-30,0,2],
[0,-15,4],
[15,0,5],
[0,15,7],
[-15,0,11],
[0,-15,7],
[-15,0,3],
[0,15,7],
[-15,0,7],
[0,15,15],
[15,0,15],
[0,-15,3],
[-15,0,11],
[0,-15,7],
[15,0,3],
[0,-15,11],
[15,0,9],
]

pl = len(Pinky_directions)-1
bl = len(Blinky_directions)-1
il = len(Inky_directions)-1
cl = len(Clyde_directions)-1

LOGICAL_WIDTH = 606
LOGICAL_HEIGHT = 606

def parse_window_size(raw):
  if not raw:
    return None
  parts = raw.lower().split('x')
  if len(parts) != 2:
    return None
  try:
    width = int(parts[0])
    height = int(parts[1])
    if width > 0 and height > 0:
      return (width, height)
  except ValueError:
    return None
  return None

def init_display_surface():
  embedded = os.environ.get("ARCADE_EMBEDDED", "0") == "1"
  requested_size = parse_window_size(os.environ.get("ARCADE_WINDOW_SIZE", ""))

  if embedded:
    flags = pygame.NOFRAME
    if hasattr(pygame, "SCALED"):
      flags |= pygame.SCALED
    return pygame.display.set_mode(requested_size or (LOGICAL_WIDTH, LOGICAL_HEIGHT), flags)

  flags = pygame.FULLSCREEN
  if hasattr(pygame, "SCALED"):
    flags |= pygame.SCALED

  if requested_size:
    return pygame.display.set_mode(requested_size, flags)
  return pygame.display.set_mode((0, 0), flags)

def present_frame():
  window_size = display_surface.get_size()
  if window_size == (LOGICAL_WIDTH, LOGICAL_HEIGHT):
    display_surface.blit(screen, (0, 0))
  else:
    scaled = pygame.transform.scale(screen, window_size)
    display_surface.blit(scaled, (0, 0))
  pygame.display.flip()
display_surface = init_display_surface()
screen = pygame.Surface((LOGICAL_WIDTH, LOGICAL_HEIGHT))
pygame.display.set_caption('Pacman')



clock = pygame.time.Clock()

pygame.font.init()
font = pygame.font.Font("freesansbold.ttf", 24)
w = 303-16
p_h = (7*60)+19
m_h = (4*60)+19
b_h = (3*60)+19
i_w = 303-16-32
c_w = 303+(32-16)

def pick_active_js():
  global active_js_index
  pads = [js for js in _refresh_joysticks() if js.get_init() or js.init() is None]
  if active_js_index is None or not any(js.get_id() == active_js_index for js in pads):
    active_js_index = pads[0].get_id() if pads else None
  for js in pads:
    moved = False
    if js.get_numaxes() >= 2:
      moved = abs(js.get_axis(0)) > JOYSTICK_DEADZONE or abs(js.get_axis(1)) > JOYSTICK_DEADZONE
    pressed = any(js.get_button(i) for i in range(js.get_numbuttons()))
    if moved or pressed:
      active_js_index = js.get_id()
      break
  return next((js for js in pads if js.get_id() == active_js_index), None)

def startGame():
  while True:
      js = pick_active_js()
      all_sprites_list = pygame.sprite.RenderPlain()
      block_list = pygame.sprite.RenderPlain()
      monsta_list = pygame.sprite.RenderPlain()
      pacman_collide = pygame.sprite.RenderPlain()
      wall_list = setupRoomOne(all_sprites_list)
      gate = setupGate(all_sprites_list)

      p_turn = 0
      p_steps = 0
      b_turn = 0
      b_steps = 0
      i_turn = 0
      i_steps = 0
      c_turn = 0
      c_steps = 0
      Pacman = Player(w, p_h, "images/Trollman.png")
      all_sprites_list.add(Pacman)
      pacman_collide.add(Pacman)

      Blinky = Ghost(w, b_h, "images/Blinky.png")
      monsta_list.add(Blinky)
      all_sprites_list.add(Blinky)

      Pinky = Ghost(w, m_h, "images/Pinky.png")
      monsta_list.add(Pinky)
      all_sprites_list.add(Pinky)

      Inky = Ghost(i_w, m_h, "images/Inky.png")
      monsta_list.add(Inky)
      all_sprites_list.add(Inky)

      Clyde = Ghost(c_w, m_h, "images/Clyde.png")
      monsta_list.add(Clyde)
      all_sprites_list.add(Clyde)
      for row in range(19):
          for column in range(19):
              if (row == 7 or row == 8) and (column == 8 or column == 9 or column == 10):
                  continue

              block = Block(yellow, 4, 4)
              block.rect.x = (30 * column + 6) + 26
              block.rect.y = (30 * row + 6) + 26

              b_collide = pygame.sprite.spritecollide(block, wall_list, False)
              p_collide = pygame.sprite.spritecollide(block, pacman_collide, False)
              if b_collide or p_collide:
                  continue
              block_list.add(block)
              all_sprites_list.add(block)

      bll = len(block_list)
      score = 0
      done = False

      while not done:
          # allow any controller to claim active before handling events
          js = pick_active_js()

          for event in pygame.event.get():
              if event.type == pygame.QUIT:
                  return

              if event.type == pygame.KEYDOWN:
                  if event.key in (pygame.K_ESCAPE, pygame.K_z, pygame.K_w):
                      return
                  if event.key == pygame.K_LEFT:
                      Pacman.changespeed(-30,0)
                  if event.key == pygame.K_RIGHT:
                      Pacman.changespeed(30,0)
                  if event.key == pygame.K_UP:
                      Pacman.changespeed(0,-30)
                  if event.key == pygame.K_DOWN:
                      Pacman.changespeed(0,30)

              if event.type == pygame.KEYUP:
                  if event.key == pygame.K_LEFT:
                      Pacman.changespeed(30,0)
                  if event.key == pygame.K_RIGHT:
                      Pacman.changespeed(-30,0)
                  if event.key == pygame.K_UP:
                      Pacman.changespeed(0,30)
                  if event.key == pygame.K_DOWN:
                      Pacman.changespeed(0,-30)

          # joystick override (when axis moves)
          if js:
              axis_x = js.get_axis(0) if js.get_numaxes() > 0 else 0
              axis_y = js.get_axis(1) if js.get_numaxes() > 1 else 0
              if abs(axis_x) > JOYSTICK_DEADZONE or abs(axis_y) > JOYSTICK_DEADZONE:
                  Pacman.change_x = 0
                  Pacman.change_y = 0
                  if abs(axis_x) > abs(axis_y):
                      Pacman.change_x = -JOYSTICK_SPEED if axis_x < 0 else JOYSTICK_SPEED
                  else:
                      Pacman.change_y = -JOYSTICK_SPEED if axis_y < 0 else JOYSTICK_SPEED
          Pacman.update(wall_list,gate)

          returned = Pinky.changespeed(Pinky_directions,False,p_turn,p_steps,pl)
          p_turn = returned[0]
          p_steps = returned[1]
          Pinky.changespeed(Pinky_directions,False,p_turn,p_steps,pl)
          Pinky.update(wall_list,False)

          returned = Blinky.changespeed(Blinky_directions,False,b_turn,b_steps,bl)
          b_turn = returned[0]
          b_steps = returned[1]
          Blinky.changespeed(Blinky_directions,False,b_turn,b_steps,bl)
          Blinky.update(wall_list,False)

          returned = Inky.changespeed(Inky_directions,False,i_turn,i_steps,il)
          i_turn = returned[0]
          i_steps = returned[1]
          Inky.changespeed(Inky_directions,False,i_turn,i_steps,il)
          Inky.update(wall_list,False)

          returned = Clyde.changespeed(Clyde_directions,"clyde",c_turn,c_steps,cl)
          c_turn = returned[0]
          c_steps = returned[1]
          Clyde.changespeed(Clyde_directions,"clyde",c_turn,c_steps,cl)
          Clyde.update(wall_list,False)
          blocks_hit_list = pygame.sprite.spritecollide(Pacman, block_list, True)
          if len(blocks_hit_list) > 0:
              score += len(blocks_hit_list)
          screen.fill(black)

          wall_list.draw(screen)
          gate.draw(screen)
          all_sprites_list.draw(screen)
          monsta_list.draw(screen)

          text=font.render("Score: "+str(score)+"/"+str(bll), True, red)
          screen.blit(text, [10, 10])

          if score == bll:
            if doNext("Congratulations, you won!", 145):
              done = True
              break
            return

          monsta_hit_list = pygame.sprite.spritecollide(Pacman, monsta_list, False)

          if monsta_hit_list:
            if doNext("Game Over", 235):
              done = True
              break
            return

          present_frame()
          clock.tick(10)

def doNext(message, left):
  while True:
      for event in pygame.event.get():
        if event.type == pygame.QUIT:
          return False
        if event.type == pygame.KEYDOWN:
          if event.key in (pygame.K_ESCAPE, pygame.K_z, pygame.K_w):
            return False
          if event.key == pygame.K_RETURN:
            return True
      # joystick buttons: A/Start continue, B/Back esc
      js = pick_active_js()
      if js:
        if js.get_button(0) or js.get_button(9):
          return True
        if js.get_button(1) or js.get_button(8):
          return False
      w = pygame.Surface((400,200))
      w.set_alpha(10)
      w.fill((128,128,128))
      screen.blit(w, (100,200))
      text1=font.render(message, True, white)
      screen.blit(text1, [left, 233])

      text2=font.render("To play again, press ENTER.", True, white)
      screen.blit(text2, [135, 303])
      text3=font.render("To quit, press ESCAPE.", True, white)
      screen.blit(text3, [165, 333])

      present_frame()

      clock.tick(10)

startGame()

pygame.quit()
