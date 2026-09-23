import type { Point } from '../../levels/format';
import type { Difficulty } from '../difficulty';
import type { World } from '../world';
import { Enemy, type EnemyContext } from './base';
import { dots, humanoid, skin, walkLegs, type Humanoid } from './models';

const WANDER_SPEED = 0.8;
/** So nah muss Steve sein, damit der Zombie ihn verfolgt. */
const CHASE_RANGE = 6;

const COLORS = {
  zombie: { skin: ['#4f8a3b', '#5a9a45', '#46803a'], shirt: ['#2a8a8a', '#258080', '#309494'], pants: ['#3b3aa0', '#35338f'] },
  husk: { skin: ['#9b8a5c', '#a8966a', '#8e7e52'], shirt: ['#6d5d3c', '#766544'], pants: ['#5a4a2c', '#524427'] },
};

/** Zombie (in der Wüste Wüstenzombie): schlurft herum und verfolgt Steve, wenn er nah ist. */
export class Zombie extends Enemy {
  private readonly body: Humanoid;
  private chasing = false;

  constructor(start: Point, world: World, difficulty: Difficulty, husk: boolean) {
    super(husk ? 'husk' : 'zombie', 0.3, 1.9, start, world, difficulty);
    const c = husk ? COLORS.husk : COLORS.zombie;
    const eye = '#1c1c1c';
    this.body = humanoid(this.model, {
      head: skin(c.skin),
      face: skin(c.skin, (ctx) => dots(ctx, [[1, 3, eye], [2, 3, eye], [5, 3, eye], [6, 3, eye], [3, 5, '#2d4a22'], [4, 5, '#2d4a22']])),
      body: skin(c.shirt),
      arm: skin(c.skin),
      leg: skin(c.pants),
    });
    this.reset();
  }

  protected think(_dt: number, ctx: EnemyContext) {
    this.chasing = this.sees(ctx.player, CHASE_RANGE, 2);
    if (!this.chasing) {
      this.patrol(WANDER_SPEED);
      return;
    }
    // Auf Steve zu, aber nie über eine Kante oder in die Lava
    this.face(ctx.player);
    const blocked = this.blockedAhead(this.pos.x + this.dir * (this.halfWidth + 0.05));
    this.vel.x = blocked || Math.abs(ctx.player.x - this.pos.x) < 0.3 ? 0 : this.dir * this.difficulty.zombieSpeed;
  }

  protected override hitWall() {
    if (!this.chasing) this.flip();
  }

  protected animate() {
    // Die typischen nach vorn gestreckten Arme
    for (const arm of this.body.arms) arm.rotation.x = -Math.PI / 2 + Math.sin(this.timer * 3) * 0.08;
    walkLegs(this.body.legs, this.timer * 6, Math.abs(this.vel.x) > 0.1 ? 0.6 : 0);
  }
}
