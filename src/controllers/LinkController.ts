import { Request, Response } from 'express';
import { EntityManager } from 'typeorm';
import { LinkModel } from '../models/LinkModel';
import { UserModel } from '../models/UserModel';
import { Link } from '../entities/Link';

class LinkController {
  private readonly linkModel: LinkModel;

  private readonly userModel: UserModel;

  private readonly entityManager: EntityManager;

  constructor(linkModel: LinkModel, entityManager: EntityManager) {
    this.linkModel = linkModel;
    this.entityManager = entityManager;
  }

  async createLink(req: Request, res: Response): Promise<void> {
    const { originalUrl } = req.body;
    const { userId } = req.session;

    if (!originalUrl) {
      res.sendStatus(400);
      return;
    }

    const authenticatedUser = await this.userModel.getUserById(userId);

    if (!authenticatedUser) {
      res.sendStatus(401);
      return;
    }

    const linkId = LinkModel.generateLinkId(originalUrl, userId);
    const newLink = await this.linkModel.createNewLink(originalUrl, linkId, authenticatedUser);

    if (!newLink) {
      res.sendStatus(400);
      return;
    }

    res.status(201).json({
      linkId: newLink.linkId,
      originalUrl: newLink.originalUrl,
    });
  }

  async getLink(req: Request, res: Response): Promise<void> {
    const { linkId } = req.params;
    const { userId } = req.session;

    const link = await this.linkModel.getLinkById(linkId);

    if (!link) {
      res.sendStatus(404);
      return;
    }

    if (!userId || link.user.userId !== userId) {
      res.sendStatus(401);
      return;
    }

    res.status(200).json({
      linkId: link.linkId,
      originalUrl: link.originalUrl,
      userId: link.user.userId,
    });
  }

  async deleteLink(req: Request, res: Response): Promise<void> {
    const { linkId } = req.params;
    const { userId, isAdmin } = req.session;

    const link = await this.linkModel.getLinkById(linkId);

    if (!link) {
      res.status(404).json({ message: 'Link not found' });
      return;
    }

    if (!isAdmin && link.user.userId !== userId) {
      res.status(403).json({ message: 'Unauthorized to delete link' });
      return;
    }

    await this.linkModel.deleteLinkByLinkIdAndUserId(linkId, userId);

    res.status(200).json({ message: 'Link deleted successfully' });
  }

  async shortenUrl(req: Request, res: Response): Promise<void> {
    const { userId } = req.session;

    if (!userId) {
      res.sendStatus(401);
      return;
    }

    const user = await this.userModel.getUserById(userId);

    if (!user) {
      res.sendStatus(401);
      return;
    }

    const linkCount = await this.linkModel.getLinkCountByUserId(userId);
    if (!user.isPro && !user.isAdmin && linkCount >= 5) {
      res.status(403).send('You cannot generate more than 5 links with a free account');
      return;
    }

    const { originalUrl } = req.body;
    const linkId = LinkModel.generateLinkId(originalUrl, userId);

    try {
      const newLink = await this.linkModel.createNewLink(originalUrl, linkId, user);
      if (newLink) {
        res.status(201).json({
          linkId: newLink.linkId,
          originalUrl: newLink.originalUrl,
        });
      } else {
        res.sendStatus(400);
      }
    } catch (error) {
      res.sendStatus(500);
    }
  }

  async getLinksByUserId(req: Request, res: Response): Promise<void> {
    const { userId } = req.session;

    if (!userId) {
      const links = await this.linkModel.getLinksByUserId(req.params.userId);
      res.status(200).json(links);
      return;
    }

    const user = await this.userModel.getUserById(userId);

    if (!user) {
      res.sendStatus(401);
      return;
    }

    if (user.isAdmin || user.userId === req.params.userId) {
      const links = await this.linkModel.getLinksByUserId(req.params.userId);
      res.status(200).json(links);
      return;
    }

    res.sendStatus(403);
  }

  async getLinksByUserIdForOwnAccount(userId: string): Promise<Link[]> {
    const links = await this.entityManager
      .createQueryBuilder(Link, 'link')
      .leftJoinAndSelect('link.user', 'user')
      .where('user.userId = :userId', { userId })
      .select([
        'link.linkId',
        'link.originalUrl',
        'link.numHits',
        'link.lastAccessedOn',
        'user.userId',
        'user.username',
        'user.isPro',
        'user.isAdmin',
      ])
      .getMany();

    return links;
  }

  getOriginalUrl = async (req: Request, res: Response): Promise<void> => {
    const { targetLinkId } = req.params;

    const link = await this.linkModel.getLinkById(targetLinkId);

    if (!link) {
      res.sendStatus(404);
      return;
    }

    await this.linkModel.updateLinkVisits(link);

    res.redirect(301, link.originalUrl);
  };
}

export { LinkController };
