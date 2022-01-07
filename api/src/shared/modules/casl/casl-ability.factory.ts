import type { AbilityClass, ExtractSubjectType, InferSubjects } from '@casl/ability';
import { Ability, AbilityBuilder, ForbiddenError } from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { Article } from '../../../articles/entities/article.entity';
import { Comment } from '../../../comments/entities/comment.entity';
import { StudyDoc } from '../../../files/entities/study-doc.entity';
import { Post } from '../../../posts/entities/post.entity';
import { Reply } from '../../../replies/entities/reply.entity';
import { Subject } from '../../../subjects/subject.entity';
import { Tag } from '../../../tags/tag.entity';
import type { User } from '../../../users/user.entity';
import { Action } from '../authorization/types/action.enum';
import { Role } from '../authorization/types/role.enum';

export type Subjects = InferSubjects<
  | typeof Article
  | typeof Comment
  | typeof Post
  | typeof Reply
  | typeof StudyDoc
  | typeof Subject
  | typeof Tag>
  | 'all';

export type AppAbility = Ability<[action: Action, subjects: Subjects]>;

@Injectable()
export class CaslAbilityFactory {
  public createForUser(user: User): AppAbility {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const { can: allow, cannot: forbid, build } = new AbilityBuilder<AppAbility>(Ability as AbilityClass<AppAbility>);

    const isAuthor = { 'author.userId': user.userId };

    if (user.roles.includes(Role.Admin)) {
      allow(Action.Manage, 'all');
    } else {
      allow(Action.Read, 'all');
      allow(Action.Create, [Comment, Post, Reply, Tag, StudyDoc]);
      allow(Action.Interact, [Comment, Post, Reply]);

      if (user.roles.includes(Role.Moderator)) {
        allow(Action.Update, 'all');
        allow(Action.Manage, [Subject, Tag, Article, StudyDoc]);
      } else {
        // FIXME: Make an "automatted" type for this

        // @ts-expect-error: CASL requires dot notation for nested properties in conditions,
        // but its typings don't allow it :(
        allow(Action.Update, Post, ['body', 'opened', 'solved', 'tags', 'title', 'type'], isAuthor)
          .because('Not the author');
        // @ts-expect-error: ditto
        allow(Action.Update, Comment, ['body'], isAuthor)
          .because('Not the author');
        // @ts-expect-error: ditto
        allow(Action.Update, Reply, ['body'], isAuthor)
          .because('Not the author');
        // @ts-expect-error: ditto
        allow(Action.Update, StudyDoc, ['description', 'docSeries', 'name', 'subject', 'tags', 'year'], { 'file.user.userId': user.userId })
          .because('Not the author');

        // @ts-expect-error: ditto
        allow(Action.Delete, [Post, Comment, Reply], isAuthor)
          .because('Not the author');
        // @ts-expect-error: ditto
        allow(Action.Delete, StudyDoc, { 'file.user.userId': user.userId })
          .because('Not the author');

        forbid([Action.Update, Action.Delete, Action.Interact], Post, { locked: true })
          .because('Post is locked');
        // @ts-expect-error: ditto
        forbid([Action.Create, Action.Update, Action.Delete, Action.Interact], [Comment, Reply], { 'post.locked': true })
          .because('Post is locked');
      }
    }

    ForbiddenError.setDefaultMessage(error => `Cannot perform ${error.action.toLowerCase()} on a ${error.subjectType.toLowerCase()}`);

    return build({
      detectSubjectType: item => item.constructor as ExtractSubjectType<Subjects>,
    });
  }
}
