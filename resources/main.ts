import Vue from 'vue';
import App from './App.vue';
import 'bootstrap/dist/css/bootstrap.min.css';
// import Notification from './components/Notification.vue';

Vue.component('non-login', () => import('./components/NonLogin.vue'));
new Vue({
    el: '#app',
    render: (h) => h(App),
}).$mount('#app');
