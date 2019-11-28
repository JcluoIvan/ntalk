import Vue from 'vue';
import App from './App.vue';
// import 'bootstrap/dist/css/bootstrap.min.css';
import '@/assets/material-icons/icon.scss';
// import Notification from './components/Notification.vue';
import './filters';
import Vuetify from 'vuetify';
import 'vuetify/dist/vuetify.min.css';

Vue.use(Vuetify);
Vue.component('access-login', require('@/components/AccessLogin.vue').default);
Vue.component('navbar', require('@/components/Navbar.vue').default);
Vue.component('sidebar', require('@/components/Sidebar.vue').default);
Vue.component('profile', require('@/components/Profile.vue').default);
Vue.component('talk-item', require('@/components/TalkItem.vue').default);
Vue.component('talk-content', require('@/components/TalkContent.vue').default);
Vue.component('message', require('@/components/Message.vue').default);
Vue.component('notice-message', require('@/components/NoticeMessage.vue').default);

const vuetify = new Vuetify({
    icons: {
        iconfont: 'mdiSvg', // 'mdi' || 'mdiSvg' || 'md' || 'fa' || 'fa4'
    },
});

new Vue({
    vuetify,
    render: (h) => h(App),
}).$mount('#app');
