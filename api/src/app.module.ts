import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { config } from './config';
import { PostsModule } from './posts/posts.module';
import { UserModule } from './users/users.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [
    AuthModule,
    UserModule,
    ConfigModule.forRoot(),
    MongooseModule.forRoot(config.get('mongoUri')),
    PostsModule,
    UploadModule
  ],
  providers: [],
  controllers: [],
  exports: [],
})
export class AppModule { }
