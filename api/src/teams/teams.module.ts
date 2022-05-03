import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { TeamMembersModule } from './members/members.module';
import { TeamMembershipsModule } from './memberships/memberships.module';
import { TeamMembershipRequestsModule } from './requests/requests.module';
import { CoreTeamsModule } from './teams/teams.module';

@Module({
  imports: [
    RouterModule.register([{
      path: 'teams',
      children: [
        { path: 'teams', module: CoreTeamsModule },
        { path: 'memberships', module: TeamMembershipsModule },
        { path: 'members', module: TeamMembersModule },
        { path: 'requests', module: TeamMembershipRequestsModule },
      ],
    }]),
    CoreTeamsModule,
    TeamMembershipsModule,
    TeamMembersModule,
    TeamMembershipRequestsModule,
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class TeamsModule {}
