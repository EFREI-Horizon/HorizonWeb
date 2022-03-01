import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import type { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections';
import { SearchParams } from 'typesense/lib/Typesense/Documents';
import type { SearchResponse } from 'typesense/lib/Typesense/Documents';
import { client } from '../shared/configs/typesense.config';
import RequireTypesense from '../shared/lib/decorators/require-typesense.decorator';
import { BaseRepository } from '../shared/lib/repositories/base.repository';
import { authorizeNotFound, SearchService } from '../shared/modules/search/search.service';
import { Club } from './entities/club.entity';

export interface IndexedClub {
  name: string;
  category: string;
  description?: string;
  id: string;
}

@Injectable()
export class ClubSearchService extends SearchService<Club, IndexedClub> {
  private static readonly schema: CollectionCreateSchema = {
    name: 'clubs',
    fields: [
      { name: 'name', type: 'string' },
      { name: 'category', type: 'string' },
      { name: 'description', type: 'string', optional: true },
    ],
  };

  private readonly documents = client.collections<IndexedClub>('clubs').documents();

  constructor(
    @InjectRepository(Club) private readonly clubRepository: BaseRepository<Club>,
  ) { super(ClubSearchService.schema, 'clubs'); }

  @RequireTypesense()
  public async init(): Promise<void> {
    const clubs = await this.clubRepository.findAll();
    await super.init(clubs, entity => this.toIndexedEntity(entity));
  }

  @RequireTypesense()
  public async add(club: Club): Promise<void> {
    await this.documents.create(this.toIndexedEntity(club));
  }

  @RequireTypesense()
  public async update(club: Club): Promise<void> {
    await this.documents.update(this.toIndexedEntity(club)).catch(authorizeNotFound);
  }

  @RequireTypesense()
  public async remove(clubId: string): Promise<void> {
    await this.documents.delete(clubId).catch(authorizeNotFound);
  }

  @RequireTypesense()
  public async search(queries: SearchParams): Promise<SearchResponse<IndexedClub>> {
    return await this.documents.search(queries);
  }

  @RequireTypesense()
  public async searchAndPopulate(queries: SearchParams): Promise<SearchResponse<Club>> {
    const results = await this.documents.search(queries);

    if (results.hits?.length) {
      const clubIds = results.hits.map(hit => hit.document.id).map(Number);
      const clubs = await this.clubRepository.find({ clubId: { $in: clubIds } });
      for (const hit of results.hits)
        // @ts-expect-error: This works, TypeScript... I know there is a mismatch between IndexedSubject.id and
        // Subject.subjectId. I know.
        hit.document = clubs.find(club => club.clubId === hit.document.id)!;
    }
    // @ts-expect-error: Ditto.
    return results;
  }

  public toIndexedEntity(club: Club): IndexedClub {
    return {
      name: club.name,
      category: club.category,
      description: club.description,
      id: club.clubId.toString(),
    };
  }
}
