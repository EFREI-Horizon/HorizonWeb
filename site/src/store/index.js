import { createStore } from 'vuex'
import { auth } from './auth.module'
import { posts } from './posts.module'
import { files } from './files.module'
import { userConfig } from './userConfig.module'
import { users } from './users.module'

const store = createStore({
    state: {
    },
    modules: {
        auth,
        posts,
        files,
        userConfig,
        users
    }
})

export default store
