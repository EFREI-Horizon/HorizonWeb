import { wrap } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import type { MyEfreiDto } from '../auth/dto/my-efrei.dto';
import type { RegisterDto } from '../auth/dto/register.dto';
import { BaseRepository } from '../shared/lib/repositories/base.repository';
import type { PaginationOptions } from '../shared/modules/pagination/pagination-option.interface';
import type { PaginatedResult } from '../shared/modules/pagination/pagination.interface';
import type { Stat } from '../stats/userStat.entity';
import type { UpdateUserDto } from './dto/update-user.dto';
import { UserSearchService } from './user-search.service';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepository: BaseRepository<User>,
    private readonly userSearchService: UserSearchService,
  ) {}

  public async findOneById(userId: string): Promise<User> {
    return await this.userRepository.findOneOrFail({ userId });
  }

  public async create(body: MyEfreiDto | RegisterDto): Promise<User> {
    const user = new User(body);
    if ('password' in body)
      await user.setPassword(body.password);
    await this.userRepository.persistAndFlush(user);
    await this.userSearchService.add(user);
    return user;
  }

  public async updateUser(userId: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findOneOrFail({ userId }, { populate: ['badges'] });

    wrap(user).assign(updateUserDto);
    await this.userRepository.flush();

    return user;
  }

  public async findAll(paginationOptions?: PaginationOptions): Promise<PaginatedResult<User>> {
    return await this.userRepository.findWithPagination(paginationOptions);
  }

  public async getUserStats(userId: string): Promise<Stat | null> {
    const user = await this.userRepository.findOne({ userId });
    if (user != null) {
      const sameDay = (first: Date, second: Date): boolean => (first.getFullYear() === second.getFullYear()
      && first.getMonth() === second.getMonth()
      && first.getDate() === second.getDate());
      const now = new Date();
      if (!sameDay(now, user.stat.lastAction))
        user.stat.actionStreak = 0;

      if (!sameDay(now, user.stat.lastPost))
        user.stat.postStreak = 0;

      if (!sameDay(now, user.stat.lastReply))
        user.stat.replyStreak = 0;

      if (!sameDay(now, user.stat.lastComment))
        user.stat.commentStreak = 0;


      await this.userRepository.flush();
      return user.stat;
    }
    return user;
  }
}
