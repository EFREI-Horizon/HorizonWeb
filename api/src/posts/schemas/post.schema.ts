import { Prop, Schema } from '@nestjs/mongoose';
import type { CallbackError } from 'mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { PreHook } from '../../shared/decorators/mongoose-hooks.decorator';
import { createSchemaForClass } from '../../shared/utils/createSchemaForClass';
import { User } from '../../users/user.schema';

// Enum Issue {
//   Question = 1,
//   Suggestion,
//   Problem,
//   Opinion,
//   Discussion,
// }

// enum State {
//   NotSolved = 0,
//   Solved,
// }

@Schema({ timestamps: true })
export class Post extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  body: string;

  @Prop()
  tags?: string[];

  @Prop({ required: true })
  type: number;

  @Prop({ required: true, type: SchemaTypes.ObjectId, ref: 'User' })
  author: User;

  @Prop({ default: 0 })
  state: number;

  @Prop({ default: false })
  locked: boolean;

  @Prop({ default: true })
  opened: boolean;

  @Prop({ default: 0 })
  views: number;

  @Prop({ default: 0 })
  favs: number;

  @Prop({ default: 0 })
  upvotes: number;

  @Prop({ default: 0 })
  downvotes: number;

  @Prop({ default: null, type: Date })
  contentLastEditedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
  _id: number;

  @PreHook('save')
  public saveHook(next: (err?: CallbackError) => void): void {
    if (this.isModified('body') || this.isModified('title'))
      this.contentLastEditedAt = new Date();
    next();
  }
}

export const PostSchema = createSchemaForClass(Post);
