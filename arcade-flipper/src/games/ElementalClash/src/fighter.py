import random
import pygame
class Fighter:
    def __init__(self, player, x, y, flip, data, sprite_sheet, animation_steps, sound):
        self.player = player
        self.size = data[0]
        self.image_scale = data[1]
        self.offset = data[2]
        self.flip = flip
        self.ground_offset = self._calculate_ground_offset(sprite_sheet, animation_steps)
        self.animation_list = self.load_images(sprite_sheet, animation_steps)
        self.action = 0  # 0:idle #1:run #2:jump #3:attack1 #4: attack2 #5:hit #6:death
        self.frame_index = 0
        self.image = self.animation_list[self.action][self.frame_index]
        self.update_time = pygame.time.get_ticks()
        # rect height based on scaled sprite minus the vertical offset
        rect_height = self.size * self.image_scale - int(self.offset[1] * self.image_scale)
        rect_height = max(100, rect_height)
        self.rect = pygame.Rect((x, y, 80, rect_height))
        self.vel_y = 0
        self.running = False
        self.jump = False
        self.attacking = False
        self.attack_type = 0
        self.attack_cooldown = 0
        self.attack_sound = sound
        self.hit = False
        self.health = 100
        self.alive = True

    def _calculate_ground_offset(self, sprite_sheet, animation_steps):
        # Find the lowest visible pixel across all frames so feet align with ground.
        lowest_visible_y = 0
        for row, frame_count in enumerate(animation_steps):
            for col in range(frame_count):
                frame = sprite_sheet.subsurface(col * self.size, row * self.size, self.size, self.size)
                mask = pygame.mask.from_surface(frame)
                if mask.count() == 0:
                    continue
                bounds = mask.get_bounding_rects()
                if not bounds:
                    continue
                for rect in bounds:
                    lowest_visible_y = max(lowest_visible_y, rect.bottom - 1)
        bottom_padding = max(0, (self.size - 1) - lowest_visible_y)
        return bottom_padding * self.image_scale

    def load_images(self, sprite_sheet, animation_steps):
        # extract images from spritesheet
        animation_list = []
        for y, animation in enumerate(animation_steps):
            temp_img_list = []
            for x in range(animation):
                temp_img = sprite_sheet.subsurface(x * self.size, y * self.size, self.size, self.size)
                temp_img_list.append(
                    pygame.transform.scale(temp_img, (self.size * self.image_scale, self.size * self.image_scale)))
            animation_list.append(temp_img_list)
        return animation_list

    def move(self, screen_width, screen_height, target, round_over, ground_y=None):
        SPEED = 10
        GRAVITY = 2
        dx = 0
        dy = 0
        self.running = False
        self.attack_type = 0

        # get keypresses
        key = pygame.key.get_pressed()

        # can only perform other actions if not currently attacking
        if self.attacking == False and self.alive == True and round_over == False:
            # check player 1 controls
            if self.player == 1:
                # movement
                if key[pygame.K_a]:
                    dx = -SPEED
                    self.running = True
                if key[pygame.K_d]:
                    dx = SPEED
                    self.running = True
                # jump
                if key[pygame.K_w] and self.jump == False:
                    self.vel_y = -30
                    self.jump = True
                # attack
                if key[pygame.K_r]:
                    self.attack_type = 1
                    self.attack(target)
                elif key[pygame.K_t]:
                    self.attack_type = 2
                    self.attack(target)

            # check player 2 controls
            if self.player == 2:
                # movement
                if key[pygame.K_LEFT]:
                    dx = -SPEED
                    self.running = True
                if key[pygame.K_RIGHT]:
                    dx = SPEED
                    self.running = True
                # jump
                if key[pygame.K_UP] and self.jump == False:
                    self.vel_y = -30
                    self.jump = True
                # attack
                if key[pygame.K_m]:
                    self.attack_type = 1
                    self.attack(target)
                elif key[pygame.K_n]:
                    self.attack_type = 2
                    self.attack(target)

        # apply gravity
        self.vel_y += GRAVITY
        dy += self.vel_y

        # ensure player stays on screen
        if self.rect.left + dx < 0:
            dx = -self.rect.left
        if self.rect.right + dx > screen_width:
            dx = screen_width - self.rect.right
        floor_y = ground_y if ground_y is not None else screen_height - 10
        if self.rect.bottom + dy > floor_y:
            self.vel_y = 0
            self.jump = False
            dy = floor_y - self.rect.bottom

        # ensure players face each other
        if target.rect.centerx > self.rect.centerx:
            self.flip = False
        else:
            self.flip = True

        # apply attack cooldown
        if self.attack_cooldown > 0:
            self.attack_cooldown -= 1

        # update player position
        self.rect.x += dx
        self.rect.y += dy

    # handle animation updates
    def update(self):
        # check what action the player is performing
        if self.health <= 0:
            self.health = 0
            self.alive = False
            self.update_action(6)  # 6:death
        elif self.hit:
            self.update_action(5)  # 5:hit
        elif self.attacking:
            if self.attack_type == 1:
                self.update_action(3)  # 3:attack1
            elif self.attack_type == 2:
                self.update_action(4)  # 4:attack2
        elif self.jump:
            self.update_action(2)  # 2:jump
        elif self.running:
            self.update_action(1)  # 1:run
        else:
            self.update_action(0)  # 0:idle

        animation_cooldown = 50
        # update image
        self.image = self.animation_list[self.action][self.frame_index]
        # check if enough time has passed since the last update
        if pygame.time.get_ticks() - self.update_time > animation_cooldown:
            self.frame_index += 1
            self.update_time = pygame.time.get_ticks()
        # check if the animation has finished
        if self.frame_index >= len(self.animation_list[self.action]):
            # if the player is dead then end the animation
            if not self.alive:
                self.frame_index = len(self.animation_list[self.action]) - 1
            else:
                self.frame_index = 0
                # check if an attack was executed
                if self.action == 3 or self.action == 4:
                    self.attacking = False
                    self.attack_cooldown = 20
                # check if damage was taken
                if self.action == 5:
                    self.hit = False
                    # if the player was in the middle of an attack, then the attack is stopped
                    self.attacking = False
                    self.attack_cooldown = 20

    def attack(self, target):
        if self.attack_cooldown == 0:
            # execute attack
            self.attacking = True
            self.attack_sound.play()
            if self.attack_type == 2:
                forward_reach = int(self.rect.width * 4.4)
                back_reach = int(self.rect.width * 0.65)
                attack_height = int(self.rect.height * 1.25)
            else:
                forward_reach = int(self.rect.width * 3.6)
                back_reach = int(self.rect.width * 0.5)
                attack_height = int(self.rect.height * 1.15)

            attack_y = self.rect.centery - attack_height // 2
            if self.flip:
                attack_x = self.rect.centerx - forward_reach
            else:
                attack_x = self.rect.centerx - back_reach
            attacking_rect = pygame.Rect(attack_x, attack_y, forward_reach + back_reach, attack_height)

            # Slightly larger hurtbox so hit detection matches large visual sprites better.
            target_hurtbox = target.rect.inflate(
                int(target.rect.width * 1.8),
                int(target.rect.height * 0.35),
            )
            if attacking_rect.colliderect(target_hurtbox):
                if self.attack_type == 2:
                    damage = random.randint(14, 18)
                else:
                    damage = random.randint(10, 14)
                target.health -= damage
                target.hit = True

    def update_action(self, new_action):
        # check if the new action is different to the previous one
        if new_action != self.action:
            self.action = new_action
            # update the animation settings
            self.frame_index = 0
            self.update_time = pygame.time.get_ticks()

    def draw(self, surface):
        img = pygame.transform.flip(self.image, self.flip, False)
        draw_x = self.rect.x - (self.offset[0] * self.image_scale)
        draw_y = self.rect.y - (self.offset[1] * self.image_scale) + self.ground_offset
        surface.blit(img, (draw_x, draw_y))
