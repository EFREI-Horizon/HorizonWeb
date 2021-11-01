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
            author: post.author,
            body: post.body,
            contentLastEditedAt: post.contentLastEditedAt,
            createdAt: post.createdAt,
            downvotes: post.downvotes,
            favorites: post.favorites,
            id: post.id,
            locked: post.locked,
            tags: post.tags,
            title: post.title,
            type: post.type,
            updatedAt: post.updatedAt,
            upvotes: post.upvotes,
            views: post.views,
          })),
        })),
      );
  }
}
