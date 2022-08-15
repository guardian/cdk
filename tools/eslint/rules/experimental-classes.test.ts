/**
 * This robot is supposed to do helpful things.
 *
 * @experimental This robot should be helpful, but it might also take over the world...
 */
export class HelpfulRobotExperimental {
  private constructor(task: string) {
    console.log(task);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- testing file
class TheRobot {
  private constructor(name: string) {
    console.log(name);
  }
}
