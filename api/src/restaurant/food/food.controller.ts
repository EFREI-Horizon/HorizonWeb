import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Action, CheckPolicies } from '../../shared/modules/authorization';
import { PaginateDto } from '../../shared/modules/pagination/paginate.dto';
import type { PaginatedResult } from '../../shared/modules/pagination/pagination.interface';
import { CreateFoodDto } from './dto/create-food.dto';
import { UpdateFoodDto } from './dto/update-food.dto';
import { Food } from './food.entity';
import { FoodService } from './food.service';

@ApiTags('Food')
@Controller()
export class FoodController {
  constructor(
    private readonly foodService: FoodService,
  ) {}

  @Post()
  @CheckPolicies(ability => ability.can(Action.Create, Food))
  public async create(@Body() createFoodDto: CreateFoodDto): Promise<Food> {
    return await this.foodService.create(createFoodDto);
  }

  @Get()
  @CheckPolicies(ability => ability.can(Action.Read, Food))
  public async findAll(
    @Query() query: PaginateDto,
  ): Promise<PaginatedResult<Food>> {
    if (query.page)
      return await this.foodService.findAll({ page: query.page, itemsPerPage: query.itemsPerPage ?? 10 });
    return await this.foodService.findAll();
  }

  @Get(':id')
  @CheckPolicies(ability => ability.can(Action.Read, Food))
  public async findOne(@Param('id') id: number): Promise<Food> {
    return await this.foodService.findOne(id);
  }

  @Patch(':id')
  @CheckPolicies(ability => ability.can(Action.Update, Food))
  public async update(@Param('id') id: number, @Body() updateFoodDto: UpdateFoodDto): Promise<Food> {
    return await this.foodService.update(id, updateFoodDto);
  }

  @Delete(':id')
  @CheckPolicies(ability => ability.can(Action.Delete, Food))
  public async remove(@Param('id') id: number): Promise<void> {
    await this.foodService.remove(id);
  }
}
