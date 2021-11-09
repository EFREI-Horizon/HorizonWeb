import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import type { Tag } from './tag.entity';
import { TagsService } from './tags.service';

@ApiTags('Tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  public async create(@Body() createTagDto: CreateTagDto): Promise<Tag> {
    return await this.tagsService.create(createTagDto);
  }

  @Get()
  public async findAll(): Promise<Tag[]> {
    return await this.tagsService.findAll();
  }

  @Get(':name')
  public async findOne(@Param('name') name: string): Promise<Tag | null> {
    return await this.tagsService.findOne(name);
  }

  @Patch(':name')
  public async update(@Param('name') name: string, @Body() updateTagDto: UpdateTagDto): Promise<Tag> {
    return await this.tagsService.update(name, updateTagDto);
  }

  @Delete(':name')
  public async remove(@Param('name') name: string): Promise<void> {
    await this.tagsService.remove(name);
  }
}
