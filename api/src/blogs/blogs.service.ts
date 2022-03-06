import { wrap } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import slugify from 'slugify';
import { ContentsService } from '../contents/contents.service';
import type { ListOptionsDto } from '../shared/lib/dto/list-options.dto';
import { BaseRepository } from '../shared/lib/repositories/base.repository';
import { ContentMasterType } from '../shared/lib/types/content-master-type.enum';
import { assertPermissions } from '../shared/lib/utils/assert-permission';
import { Action } from '../shared/modules/authorization';
import { CaslAbilityFactory } from '../shared/modules/casl/casl-ability.factory';
import type { PaginateDto } from '../shared/modules/pagination/paginate.dto';
import type { PaginatedResult } from '../shared/modules/pagination/pagination.interface';
import { serializeOrder } from '../shared/modules/sorting/serialize-order';
import { Tag } from '../tags/tag.entity';
import type { User } from '../users/user.entity';
import { Blog } from './blog.entity';
import type { CreateBlogDto } from './dto/create-blog.dto';
import type { CreateDraftBlogDto } from './dto/create-draft-blog.dto';
import type { UpdateBlogDto } from './dto/update-blog.dto';

@Injectable()
export class BlogsService {
  constructor(
    @InjectRepository(Blog) private readonly blogRepository: BaseRepository<Blog>,
    @InjectRepository(Tag) private readonly tagRepository: BaseRepository<Tag>,
    private readonly contentsService: ContentsService,
    private readonly caslAbilityFactory: CaslAbilityFactory,
  ) {}

  public async create(user: User, createBlogDto: CreateBlogDto): Promise<Blog> {
    const blog = new Blog({
      ...createBlogDto,
      slug: slugify(createBlogDto.slug ?? createBlogDto.title),
      isDraft: false,
      location: createBlogDto?.location?.split(',').map(Number) as [lat: number, lon: number] | undefined,
    });

    // TODO: Keep the original order
    const tags = await this.tagRepository.find({ name: { $in: createBlogDto.tags } });
    blog.tags.add(...tags);

    blog.post = await this.contentsService.createPost(user, blog, {
      ...createBlogDto,
      contentMasterType: ContentMasterType.Blog,
    });
    await this.blogRepository.persistAndFlush(blog);
    return blog;
  }

  public async createDraft(user: User, createDraftBlogDto: CreateDraftBlogDto): Promise<Blog> {
    const blog = new Blog({
      ...createDraftBlogDto,
      slug: slugify(createDraftBlogDto.slug ?? createDraftBlogDto.title),
      isDraft: true,
      location: createDraftBlogDto?.location?.split(',').map(Number) as [lat: number, lon: number] | undefined,
    });

    // TODO: Keep the original order
    const tags = await this.tagRepository.find({ name: { $in: createDraftBlogDto.tags } });
    blog.tags.add(...tags);

    blog.post = await this.contentsService.createPost(user, blog, {
      ...createDraftBlogDto,
      contentMasterType: ContentMasterType.Blog,
    });
    await this.blogRepository.persistAndFlush(blog);
    return blog;
  }


  public async findAll(user: User, options?: Required<ListOptionsDto>): Promise<PaginatedResult<Blog>> {
    const canSeeHiddenContent = this.caslAbilityFactory.canSeeHiddenContent(user);
    const visibilityQuery = canSeeHiddenContent ? {} : { post: { isVisible: true } };};
    return await this.blogRepository.findWithPagination(
      options,
      { isDraft: false, ... visibilityQuery },
      { populate: ['post', 'tags'], orderBy: { post: serializeOrder(options?.sortBy) } },
    );
  }

  public async findDraftBlogs(
    user: User,
    paginationOptions?: Required<PaginateDto>,
  ): Promise<PaginatedResult<Blog>> {
    // We may use blogsSearchService
    return await this.blogRepository.findWithPagination(
      paginationOptions,
      { post: { author: user }, isDraft: true },
      { populate: ['post', 'tags'] },
    );
  }

  public async findOne(user: User, contentMasterId: number): Promise<Blog> {
    const blog = await this.blogRepository.findOneOrFail(
      { contentMasterId },
      { populate: ['post', 'post.children', 'post.children.children', 'tags', 'participants'] },
    );

    const ability = this.caslAbilityFactory.createForUser(user);
    assertPermissions(ability, Action.Read, blog);

    return blog;
  }

  public async update(user: User, contentMasterId: number, updateBlogDto: UpdateBlogDto): Promise<Blog> {
    const blog = await this.blogRepository.findOneOrFail({ contentMasterId }, { populate: ['post', 'tags'] });

    const ability = this.caslAbilityFactory.createForUser(user);
    assertPermissions(ability, Action.Update, blog, Object.keys(updateBlogDto));

    // If we try to unlock the blog, then it is the only action that we can do.
    if (blog.locked && updateBlogDto?.locked === false)
      updateBlogDto = { locked: false };

    const { tags: wantedTags, ...updatedProps } = updateBlogDto;

    if (wantedTags) {
      if (wantedTags.length === 0) {
        blog.tags.removeAll();
      } else {
        // TODO: Keep the original order
        const tags = await this.tagRepository.find({ name: { $in: wantedTags } });
        blog.tags.set(tags);
      }
    }

    if (updatedProps) {
      if (updatedProps.isDraft === true && !blog.isDraft)
        updatedProps.isDraft = false;
      wrap(blog).assign(updatedProps);
    }
    await this.blogRepository.flush();
    return blog;
  }

  public async remove(user: User, contentMasterId: number): Promise<void> {
    const blog = await this.blogRepository.findOneOrFail({ contentMasterId });

    const ability = this.caslAbilityFactory.createForUser(user);
    assertPermissions(ability, Action.Delete, blog);

    await this.blogRepository.removeAndFlush(blog);
  }
}
