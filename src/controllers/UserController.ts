import { Request, Response } from 'express';
import argon2 from 'argon2';
import { UserModel } from '../models/UserModel';

class UserController {
  private userModel: UserModel;

  constructor(userModel: UserModel) {
    this.userModel = userModel;
  }

  async registerUser(req: Request, res: Response): Promise<void> {
    const { username, password } = req.body;

    if (!username || !password) {
      res.sendStatus(400);
      return;
    }

    const passwordHash = await argon2.hash(password);
    const newUser = await this.userModel.addNewUser(username, passwordHash);

    if (!newUser) {
      res.status(409).send('User with that username already exists');
      return;
    }

    req.session.userId = newUser.userId;
    req.session.username = newUser.username;
    req.session.isPro = newUser.isPro;
    req.session.isAdmin = newUser.isAdmin;
    req.session.isLoggedIn = true;

    res.status(201).json({
      userId: newUser.userId,
      username: newUser.username,
      isAdmin: newUser.isAdmin,
      isPro: newUser.isPro,
    });
  }

  async loginUser(req: Request, res: Response): Promise<void> {
    const { username, password } = req.body;

    if (!username || !password) {
      res.sendStatus(400);
      return;
    }

    const user = await this.userModel.getUserByUsername(username);

    if (!user) {
      res.sendStatus(401);
      return;
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, password);

    if (!isPasswordValid) {
      res.sendStatus(401);
      return;
    }

    req.session.userId = user.userId;
    req.session.username = user.username;
    req.session.isPro = user.isPro;
    req.session.isAdmin = user.isAdmin;
    req.session.isLoggedIn = true;

    res.sendStatus(200);
  }
}

export { UserController };
