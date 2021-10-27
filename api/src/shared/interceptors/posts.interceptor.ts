import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Post } from '../../posts/schemas/post.schema';
import type { CustomPaginateResult } from '../pagination';
import type { PostResponse } from './post.interceptor';

type PostsResponse = CustomPaginateResult<PostResponse>;

@Injectable()
export class PostsInterceptor<T extends CustomPaginateResult<Post>> implements NestInterceptor<T, PostsResponse> {
  public intercept(context: ExecutionContext, next: CallHandler<T>): Observable<PostsResponse> {
    return next
      .handle()
      .pipe(
        map(result => ({
          ...result,
          items: result.items?.map(post => ({
            title: post.title,
            body: post.body,
            downvotes: post.downvotes,
            upvotes: post.upvotes,
            author: post.author,
            locked: post.locked,
            favs: post.favs,
            id: post.id,
            createdAt: post.createdAt,
            contentLastEditedAt: post.contentLastEditedAt,
            state: post.state,
            tags: post.tags,
            type: post.type,
            updatedAt: post.updatedAt,
            views: post.views,
          })),
        })),
      );
  }
}
