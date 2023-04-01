import { EntityManager } from 'typeorm';
import { createHash } from 'crypto';
import { Link } from '../entities/Link';
import { User } from '../entities/User';

class LinkModel {
  private readonly entityManager: EntityManager;

  constructor(entityManager: EntityManager) {
    this.entityManager = entityManager;
  }

  static generateLinkId(originalUrl: string, userId: string): string {
    const md5 = createHash('md5');
    md5.update(`${originalUrl}${userId}`);
    const urlHash = md5.digest('base64url');
    const linkId = urlHash.substr(0, 9);
    return linkId;
  }

  async getLinkById(linkId: string): Promise<Link | null> {
    const link = await this.entityManager.findOne(Link, {
      where: { linkId },
      relations: ['user'],
    });
    return link || null;
  }

  async createNewLink(originalUrl: string, linkId: string, creator: User): Promise<Link> {
    const link = new Link();
    link.linkId = linkId;
    link.originalUrl = originalUrl;
    link.user = creator;
    return this.entityManager.save(link);
  }

  async updateLink(link: Link): Promise<Link | null> {
    try {
      await this.entityManager.save(link);
    } catch (e) {
      console.error(e);
      return null;
    }

    return link;
  }

  async deleteLink(link: Link): Promise<void> {
    await this.entityManager.remove(link);
  }

  async getLinkCountByUserId(userId: string): Promise<number> {
    const linkCount = await this.entityManager
      .createQueryBuilder(Link, 'link')
      .where('link.user.userId = :userId', { userId })
      .getCount();

    return linkCount;
  }

  async updateLinkVisits(link: Link): Promise<Link> {
    const updatedLink = { ...link };
    updatedLink.numHits += 1;

    const now = new Date();
    updatedLink.lastAccessedOn = now;

    const savedLink = await this.entityManager.save(updatedLink);
    return savedLink;
  }

  async getLinksByUserId(userId: string): Promise<Link[]> {
    const links = await this.entityManager
      .createQueryBuilder(Link, 'link')
      .leftJoinAndSelect('link.user', 'user')
      .select(['link.linkId', 'link.originalUrl', 'user.userId', 'user.username', 'user.isAdmin'])
      .where('user.userId = :userId', { userId })
      .getMany();

    return links;
  }

  async getAllLinks(): Promise<Link[]> {
    const links = await this.entityManager.find(Link, {
      relations: ['user'],
    });
    return links || [];
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

  async deleteLinkByLinkIdAndUserId(linkId: string, userId: string): Promise<void> {
    await this.entityManager
      .createQueryBuilder()
      .delete()
      .from(Link)
      .where('linkId = :linkId AND user.userId = :userId', { linkId, userId })
      .execute();
  }
}

export { LinkModel };
