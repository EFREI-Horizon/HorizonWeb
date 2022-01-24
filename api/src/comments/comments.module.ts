import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { BadgeUnlock } from '../badges/badge-unlock.entity';
import { Badge } from '../badges/badge.entity';
import { BadgesModule } from '../badges/badges.module';
import { Post } from '../posts/entities/post.entity';
import { Reply } from '../replies/entities/reply.entity';
import { CaslAbilityFactory } from '../shared/modules/casl/casl-ability.factory';
import { CommentVotesService } from './comments-votes.service';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { CommentVote } from './entities/comment-vote.entity';
import { Comment } from './entities/comment.entity';

@Module({
  imports: [
    MikroOrmModule.forFeature([Post, Reply, Comment, CommentVote, Badge, BadgeUnlock]),
    BadgesModule,
  ],
  controllers: [CommentsController],
  providers: [CaslAbilityFactory, CommentsService, CommentVotesService],
  exports: [CommentsService],
})
export class CommentsModule {}
