import { wrap } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { ContentsService } from '../contents/contents.service';
import { Content } from '../contents/entities/content.entity';
import { Favorite } from '../favorites/favorite.entity';
import { Reaction } from '../reactions/reaction.entity';
import { Report } from '../reports/report.entity';
import type { ListOptionsDto } from '../shared/lib/dto/list-options.dto';
import { BaseRepository } from '../shared/lib/repositories/base.repository';
import { ContentKind } from '../shared/lib/types/content-kind.enum';
import { ContentMasterType } from '../shared/lib/types/content-master-type.enum';
import { assertPermissions } from '../shared/lib/utils/assert-permission';
import { Action } from '../shared/modules/authorization';
import { CaslAbilityFactory } from '../shared/modules/casl/casl-ability.factory';
import type { PaginateDto } from '../shared/modules/pagination/paginate.dto';
import type { PaginatedResult } from '../shared/modules/pagination/pagination.interface';
import { serializeOrder } from '../shared/modules/sorting/serialize-order';
import { Tag } from '../tags/tag.entity';
import { User } from '../users/user.entity';
import { Vote } from '../votes/vote.entity';
import type { CreateDraftThreadDto } from './dto/create-draft-thread.dto';
import type { CreateThreadDto } from './dto/create-thread.dto';
import type { UpdateThreadDto } from './dto/update-thread.dto';
import type { ThreadInteractions } from './thread-interactions.interface';
import { Thread } from './thread.entity';

@Injectable()
export class ThreadsService {
  // eslint-disable-next-line max-params
  constructor(
    @InjectRepository(Thread) private readonly threadRepository: BaseRepository<Thread>,
    @InjectRepository(Tag) private readonly tagRepository: BaseRepository<Tag>,
    @InjectRepository(User) private readonly userRepository: BaseRepository<User>,
    @InjectRepository(Content) private readonly contentRepository: BaseRepository<Content>,
    @InjectRepository(Favorite) private readonly favoriteRepository: BaseRepository<Favorite>,
    @InjectRepository(Reaction) private readonly reactionRepository: BaseRepository<Reaction>,
    @InjectRepository(Vote) private readonly voteRepository: BaseRepository<Vote>,
    @InjectRepository(Report) private readonly reportRepository: BaseRepository<Report>,
    private readonly contentsService: ContentsService,
    private readonly caslAbilityFactory: CaslAbilityFactory,
  ) {}

  public async create(user: User, createThreadDto: CreateThreadDto): Promise<Thread> {
    const thread = new Thread({ ...createThreadDto, isDraft: false });

    // TODO: Keep the original order
    const tags = await this.tagRepository.find({ name: { $in: createThreadDto.tags } });
    thread.tags.add(...tags);

    const assignees = await this.userRepository.find({ userId: { $in: createThreadDto.assignees } });
    thread.assignees.add(...assignees);

    thread.participants.add(user);

    thread.post = await this.contentsService.createPost(user, thread, {
      ...createThreadDto,
      contentMasterType: ContentMasterType.Thread,
    });

    await this.threadRepository.persistAndFlush(thread);

    return thread;
  }

  public async createDraft(user: User, createDraftThreadDto: CreateDraftThreadDto): Promise<Thread> {
    const thread = new Thread(createDraftThreadDto);

    // TODO: Keep the original order
    const tags = await this.tagRepository.find({ name: { $in: createDraftThreadDto.tags } });
    thread.tags.add(...tags);

    const assignees = await this.userRepository.find({ userId: { $in: createDraftThreadDto.assignees } });
    thread.assignees.add(...assignees);

    thread.participants.add(user);

    thread.post = await this.contentsService.createPost(user, thread, {
      ...createDraftThreadDto,
      contentMasterType: ContentMasterType.Thread,
    });

    await this.threadRepository.persistAndFlush(thread);

    return thread;
  }

  public async findAll(user: User, options?: Required<ListOptionsDto>): Promise<PaginatedResult<Thread>> {
    const canSeeHiddenContent = this.caslAbilityFactory.canSeeHiddenContent(user);
    const queryParams = canSeeHiddenContent ? { isDraft: false } : { isDraft: false, post: { isVisible: true } };
    return await this.threadRepository.findWithPagination(
      options,
      { isDraft: false, ...visibilityQuery },
      {
        // TODO: Remove 'post.lastEdit' once we add activities
        populate: ['post', 'tags', 'assignees', 'post.author', 'post.lastEdit', 'opValidatedWith', 'adminValidatedWith', 'adminValidatedBy'],
        orderBy: { post: serializeOrder(options?.sortBy) },
      },
    );
  }

  public async findDraftThreads(
    user: User,
    paginationOptions?: Required<PaginateDto>,
  ): Promise<PaginatedResult<Thread>> {
    return await this.threadRepository.findWithPagination(
      paginationOptions,
      { post: { author: user }, isDraft: true },
      { populate: ['post', 'tags', 'assignees'] },
    );
  }

  public async findOne(user: User, contentMasterId: number): Promise<Thread> {
    const thread = await this.threadRepository.findOneOrFail(
      { contentMasterId },
      { populate: ['post', 'post.lastEdit', 'post.children', 'post.children.children', 'tags', 'assignees', 'participants', 'opValidatedWith', 'adminValidatedWith', 'adminValidatedBy'] },
    );

    const ability = this.caslAbilityFactory.createForUser(user);
    assertPermissions(ability, Action.Read, thread);

    return thread;
  }

  public async findInteractions(user: User, contentMasterId: number): Promise<ThreadInteractions> {
    const thread = await this.threadRepository.findOneOrFail({ contentMasterId }, { populate: ['post'] });

    const ability = this.caslAbilityFactory.createForUser(user);
    assertPermissions(ability, Action.Read, thread);

    const favorites = await this.favoriteRepository.find({ user, content: { contentMaster: thread } });
    const reactions = await this.reactionRepository.find({ user, content: { contentMaster: thread } });
    const votes = await this.voteRepository.find({ user, content: { contentMaster: thread } });
    const reports = await this.reportRepository.find({ reporter: user, content: { contentMaster: thread } });

    return {
      favorites,
      reactions,
      votes,
      reports,
    };
  }

  public async update(user: User, contentMasterId: number, updateThreadDto: UpdateThreadDto): Promise<Thread> {
    const thread = await this.threadRepository.findOneOrFail(
      { contentMasterId },
      { populate: ['post', 'post.lastEdit', 'tags', 'assignees', 'opValidatedWith', 'adminValidatedWith', 'adminValidatedBy'] },
    );

    const ability = this.caslAbilityFactory.createForUser(user);
    assertPermissions(ability, Action.Update, thread, Object.keys(updateThreadDto));

    // If we try to unlock the thread, then it is the only action that we can do.
    if (thread.locked && updateThreadDto?.locked === false)
      updateThreadDto = { locked: false };

    const {
      tags: wantedTags,
      assignees: wantedAssignees,
      opValidatedWith,
      adminValidatedWith,
      ...updatedProps
    } = updateThreadDto;

    if (wantedTags) {
      if (wantedTags.length === 0) {
        thread.tags.removeAll();
      } else {
        const tags = await this.tagRepository.find({ name: { $in: wantedTags } });
        thread.tags.set(tags);
      }
    }

    if (wantedAssignees) {
      if (wantedAssignees.length === 0) {
        thread.assignees.removeAll();
      } else {
        const assignees = await this.userRepository.find({ userId: { $in: wantedAssignees } });
        thread.assignees.set(assignees);
      }
    }

    const validationReplyQuery = { kind: ContentKind.Reply, contentMaster: { contentMasterId } };

    if (typeof opValidatedWith !== 'undefined') {
      thread.opValidatedWith = opValidatedWith
        ? await this.contentRepository.findOneOrFail({ contentId: opValidatedWith, ...validationReplyQuery })
        : null;
    }

    if (typeof adminValidatedWith !== 'undefined') {
      thread.adminValidatedWith = adminValidatedWith
        ? await this.contentRepository.findOneOrFail({ contentId: adminValidatedWith, ...validationReplyQuery })
        : null;
      thread.adminValidatedBy = adminValidatedWith
        ? user
        : null;
    }

    if (updatedProps) {
      if (!thread.isDraft && updatedProps.isDraft === true)
        updatedProps.isDraft = false;
      wrap(thread).assign(updatedProps);
    }
    await this.threadRepository.flush();
    return thread;
  }

  public async remove(user: User, contentMasterId: number): Promise<void> {
    const thread = await this.threadRepository.findOneOrFail({ contentMasterId });

    const ability = this.caslAbilityFactory.createForUser(user);
    assertPermissions(ability, Action.Delete, thread);

    await this.threadRepository.removeAndFlush(thread);
  }

  public async addTags(contentMasterId: number, newTags: string[]): Promise<Thread> {
    const thread = await this.threadRepository.findOneOrFail(
      { contentMasterId },
      { populate: ['post', 'tags', 'assignees', 'opValidatedWith', 'adminValidatedWith', 'adminValidatedBy'] },
    );

    const tags = await this.tagRepository.find({ name: { $in: newTags } });
    thread.tags.add(...tags);
    await this.threadRepository.flush();
    return thread;
  }

  public async removeTags(contentMasterId: number, droppedTags: string[]): Promise<void> {
    const thread = await this.threadRepository.findOneOrFail({ contentMasterId }, { populate: ['tags'] });

    const tags = await this.tagRepository.find({ name: { $in: droppedTags } });
    thread.tags.remove(...tags);
    await this.threadRepository.flush();
  }

  public async addAssignees(contentMasterId: number, assignees: string[]): Promise<Thread> {
    const thread = await this.threadRepository.findOneOrFail(
      { contentMasterId },
      { populate: ['post', 'tags', 'assignees', 'opValidatedWith', 'adminValidatedWith', 'adminValidatedBy'] },
    );

    const users = await this.userRepository.find({ userId: { $in: assignees } });
    thread.assignees.add(...users.filter(user => !thread.assignees.contains(user)));
    await this.threadRepository.flush();
    return thread;
  }

  public async removeAssignees(contentMasterId: number, assignees: string[]): Promise<void> {
    const thread = await this.threadRepository.findOneOrFail({ contentMasterId }, { populate: ['assignees'] });

    const users = await this.userRepository.find({ userId: { $in: assignees } });
    thread.assignees.remove(...users);
    await this.threadRepository.flush();
  }
}
