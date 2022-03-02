import { wrap } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../shared/lib/repositories/base.repository';
import type { PaginateDto } from '../../shared/modules/pagination/paginate.dto';
import type { PaginatedResult } from '../../shared/modules/pagination/pagination.interface';
import type { CreateFoodDto } from './dto/create-food.dto';
import type { UpdateFoodDto } from './dto/update-food.dto';
import { Food } from './food.entity';

@Injectable()
export class FoodService {
  constructor(
    @InjectRepository(Food) private readonly foodRepository: BaseRepository<Food>,
  ) {}

  public async create(createFoodDto: CreateFoodDto): Promise<Food> {
    const food = new Food(createFoodDto);
    await this.foodRepository.persistAndFlush(food);
    return food;
  }

  public async findAll(paginationOptions?: Required<PaginateDto>): Promise<PaginatedResult<Food>> {
    return await this.foodRepository.findWithPagination(paginationOptions, {}, { orderBy: { name: 'ASC' } });
  }

  public async findOne(foodId: number): Promise<Food> {
    return await this.foodRepository.findOneOrFail({ foodId });
  }

  public async update(foodId: number, updateFoodDto: UpdateFoodDto): Promise<Food> {
    const food = await this.foodRepository.findOneOrFail({ foodId });
    wrap(food).assign(updateFoodDto);
    await this.foodRepository.flush();
    return food;
  }

  public async remove(foodId: number): Promise<void> {
    const food = await this.foodRepository.findOneOrFail({ foodId });
    await this.foodRepository.removeAndFlush(food);
  }
}
