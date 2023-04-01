import express, { Express } from 'express';
import 'express-async-errors';
import dotenv from 'dotenv';
import { UserModel } from './models/UserModel';
import { LinkModel } from './models/LinkModel';
import { UserController } from './controllers/UserController';
import { LinkController } from './controllers/LinkController';
import { AppDataSource } from './dataSource';

dotenv.config();
const app: Express = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { PORT } = process.env;

(async (): Promise<void> => {
  const userModel = new UserModel(AppDataSource.manager);
  const userController = new UserController(userModel);

  const linkModel = new LinkModel(AppDataSource.manager);
  const linkController = new LinkController(linkModel, AppDataSource.manager);

  app.post('/api/users', userController.registerUser);
  app.post('/api/users/login', userController.loginUser);

  app.post('/api/links', linkController.createLink);
  app.get('/api/links/:linkId', linkController.getLink);
  app.delete('/api/links/:linkId', linkController.deleteLink);
  app.get('/:targetLinkId', linkController.getOriginalUrl);
  app.get('/api/users/:userId/links', linkController.getLinksByUserId);
  app.get('/api/users/:targetUserId/links', linkController.getLinksByUserIdForOwnAccount);
  app.delete('/api/users/:targetUserId/links/:targetLinkId', linkController.deleteLink);

  app.listen(PORT, () => {
    console.log(`[ALERT] Server started at http://localhost:${PORT}`);
  });
})();

process.on('uncaughtException', (error: Error) => {
  console.error(`[ERROR] Uncaught exception: ${error.message}\n\t${error.stack}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  console.error(`[ERROR] Unhandled promise rejection: ${reason}\n\t${promise}`);
  process.exit(1);
});
