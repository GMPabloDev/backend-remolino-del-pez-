import type { PasswordService } from "./password.service";

export class BunPasswordService implements PasswordService {
  async hash(password: string): Promise<string> {
    return Bun.password.hash(password, {
      algorithm: "argon2id",
      memoryCost: 19456,
      timeCost: 2,
    });
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return Bun.password.verify(password, hash);
  }
}
