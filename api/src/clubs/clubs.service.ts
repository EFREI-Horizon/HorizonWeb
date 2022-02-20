import { UniqueConstraintViolationException, wrap } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { BaseRepository } from '../shared/lib/repositories/base.repository';
import { ClubRole } from '../shared/lib/types/club-role.enum';
import { Role } from '../shared/modules/authorization/types/role.enum';
import type { PaginateDto } from '../shared/modules/pagination/paginate.dto';
import type { PaginatedResult } from '../shared/modules/pagination/pagination.interface';
import { User } from '../users/user.entity';
import { ClubSearchService } from './club-search.service';
import type { CreateClubMemberDto } from './dto/create-club-member.dto';
import type { CreateClubDto } from './dto/create-club.dto';
import type { UpdateClubMemberDto } from './dto/update-club-member.dto';
import type { UpdateClubDto } from './dto/update-club.dto';
import { ClubMember } from './entities/club-member.entity';
import { Club } from './entities/club.entity';

@Injectable()
export class ClubsService {
  constructor(
    @InjectRepository(Club) private readonly clubRepository: BaseRepository<Club>,
    @InjectRepository(ClubMember) private readonly clubMemberRepository: BaseRepository<ClubMember>,
    @InjectRepository(User) private readonly userRepository: BaseRepository<User>,
    private readonly clubSearchService: ClubSearchService,
  ) {}

  public async create(user: User, createClubDto: CreateClubDto): Promise<Club> {
    const club = new Club(createClubDto);

    try {
      await this.clubRepository.persistAndFlush(club);
    } catch (error: unknown) {
      if (error instanceof UniqueConstraintViolationException)
        throw new BadRequestException('Club already exists');
      throw error;
    }

    const member = new ClubMember({ user, club, role: ClubRole.President });
    await this.clubMemberRepository.persistAndFlush(member);
    await this.clubSearchService.add(club);

    return club;
  }

  public async findAll(paginationOptions?: Required<PaginateDto>): Promise<PaginatedResult<Club>> {
    return await this.clubRepository.findWithPagination(
      paginationOptions,
      {},
      { populate: ['contacts', 'contacts.contact'], orderBy: { name: 'ASC' } },
    );
  }

  public async findOne(clubId: number): Promise<Club> {
    return await this.clubRepository.findOneOrFail(
      { clubId },
      { populate: ['members', 'members.user', 'contacts', 'contacts.contact'] },
    );
  }

  public async findNames(): Promise<Array<Pick<Club, 'category' | 'clubId' | 'icon' | 'name'>>> {
    const clubs = await this.clubRepository.findAll({ fields: ['name', 'category', 'icon', 'clubId'], orderBy: { name: 'ASC' } });
    // Remove null values for M:M relations that are automatically filled
    return clubs.map(({ contacts, members, ...keep }) => keep);
  }

  public async update(user: User, clubId: number, updateClubDto: UpdateClubDto): Promise<Club> {
    const club = await this.clubRepository.findOneOrFail(
      { clubId },
      { populate: ['members'] },
    );

    // TODO: Move this to CASL
    if (!user.roles.includes(Role.Admin) && !club.isClubAdmin(user))
      throw new ForbiddenException('Not a club admin');

    wrap(club).assign(updateClubDto);
    await this.clubRepository.flush();
    await this.clubSearchService.update(club);
    return club;
  }

  public async remove(clubId: number): Promise<void> {
    const club = await this.clubRepository.findOneOrFail({ clubId });
    await this.clubRepository.removeAndFlush(club);
    await this.clubSearchService.remove(club.clubId.toString());
  }

  public async findAllUsersInClub(
    clubId: number,
    paginationOptions?: Required<PaginateDto>,
  ): Promise<PaginatedResult<ClubMember>> {
    return await this.clubMemberRepository.findWithPagination(
      paginationOptions,
      { club: { clubId } },
      { populate: ['user', 'club'], orderBy: { user: { lastname: 'ASC' } } },
    );
  }

  public async findClubMembership(
    userId: string,
    paginationOptions?: Required<PaginateDto>,
  ): Promise<PaginatedResult<ClubMember>> {
    return await this.clubMemberRepository.findWithPagination(
      paginationOptions,
      { user: { userId } },
      { populate: ['user', 'club', 'club.contacts', 'club.contacts.contact'], orderBy: { createdAt: 'ASC' } },
    );
  }

  public async addUserToClub(
    requester: User,
    clubId: number,
    createClubMemberDto: CreateClubMemberDto,
): Promise<ClubMember> {
    const club = await this.clubRepository.findOneOrFail(
      { clubId },
      { populate: ['members'] },
    );

    // TODO: Move this to CASL
    if (!requester.roles.includes(Role.Admin) && !club.isClubAdmin(requester))
      throw new ForbiddenException('Not a club admin');

    const user = await this.userRepository.findOneOrFail({ userId: createClubMemberDto.userId });
    const existing = await this.clubMemberRepository.count({ club, user });
    if (existing)
      throw new BadRequestException('User is already in club');

    if (!club.canActOnRole(requester, createClubMemberDto.role))
      throw new ForbiddenException('Role too high');

    const clubMember = new ClubMember({ ...createClubMemberDto, club, user });
    await this.clubMemberRepository.persistAndFlush(clubMember);
    return clubMember;
  }

  public async updateUserRole(
    requester: User,
    clubId: number,
    userId: string,
    updateClubMemberDto: UpdateClubMemberDto,
  ): Promise<ClubMember> {
    const club = await this.clubRepository.findOneOrFail(
      { clubId },
      { populate: ['members'] },
    );

    // TODO: Move this to CASL
    if (!requester.roles.includes(Role.Admin) && !club.isClubAdmin(requester))
      throw new ForbiddenException('Not a club admin');

    if (typeof updateClubMemberDto.role !== 'undefined' && !club.canActOnRole(requester, updateClubMemberDto.role))
      throw new ForbiddenException('Role too high');

    const clubMember = await this.clubMemberRepository.findOneOrFail(
      { club: { clubId }, user: { userId } },
      { populate: ['user', 'club'] },
    );

    wrap(clubMember).assign(updateClubMemberDto);
    await this.clubMemberRepository.flush();
    return clubMember;
  }

  public async removeUserFromClub(requester: User, clubId: number, userId: string): Promise<void> {
    const club = await this.clubRepository.findOneOrFail({ clubId }, { populate: ['members'] });

    const isSelf = requester.userId === userId;

    // TODO: Move this to CASL
    if (!isSelf && !requester.roles.includes(Role.Admin) && !club.isClubAdmin(requester))
      throw new ForbiddenException('Not a club admin');

    const clubMember = await this.clubMemberRepository.findOneOrFail({ club, user: { userId } });

    if (!isSelf && clubMember.role === ClubRole.President)
      throw new ForbiddenException('Cannot remove president');

    await this.clubMemberRepository.removeAndFlush(clubMember);
  }
}
