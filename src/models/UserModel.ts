import { EntityManager } from 'typeorm';
import argon2 from 'argon2';
import { User } from '../entities/User';

class UserModel {
  constructor(private readonly entityManager: EntityManager) {}

  async getUserById(userId: string): Promise<User | null> {
    const user = await this.entityManager.findOne(User, {
      where: { userId },
      relations: ['links'],
    });
    return user || null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const user = await this.entityManager.findOne(User, {
      where: { username },
      relations: ['links'],
    });
    return user || null;
  }

  async addNewUser(username: string, password: string): Promise<User | null> {
    const existingUser = await this.getUserByUsername(username);
    if (existingUser) {
      return null;
    }

    const hashedPassword = await argon2.hash(password);

    const newUser = new User();
    newUser.username = username;
    newUser.passwordHash = hashedPassword;
    newUser.isPro = false;
    newUser.isAdmin = false;

    try {
      await this.entityManager.save(newUser);
    } catch (e) {
      console.error(e);
      return null;
    }

    return newUser;
  }

  async updateUser(user: User): Promise<User | null> {
    try {
      await this.entityManager.save(user);
    } catch (e) {
      console.error(e);
      return null;
    }

    return user;
  }

  async deleteUser(user: User): Promise<void> {
    await this.entityManager.remove(user);
  }

  async loginUser(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) {
      return null;
    }

    const isPasswordMatch = await argon2.verify(user.passwordHash, password);
    if (!isPasswordMatch) {
      return null;
    }

    return user;
  }
}

export { UserModel };
