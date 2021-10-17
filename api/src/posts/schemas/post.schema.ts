import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { User } from '../../users/user.schema';

enum Issue {
  Question = 1,
  Suggestion,
  Problem,
  Opinion,
  Discussion,
}

enum State {
  NotSolved = 0,
  Solved,
}

@Schema({ timestamps: true })
export class Post extends Document {
  @Prop({ index: true })
  postId: number;

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

  @Prop({ default: '' })
  state: State;

  @Prop({ default: false })
  archived: boolean;

  @Prop({ default: true })
  opened: boolean;

  @Prop({ default: 0 })
  likes: number;

  @Prop({ default: 0 })
  dislikes: number;

  @Prop({ default: null, type: Date })
  contentLastEditedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
  _id: number;
}

export const PostSchema = SchemaFactory.createForClass(Post);

// Update lastEditedAt property
PostSchema.pre('save', function (this: Post, next) {
  if (this.isModified('body') || this.isModified('title'))
    this.contentLastEditedAt = new Date();
  next();
});
