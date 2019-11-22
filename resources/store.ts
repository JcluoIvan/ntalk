import Vue from 'vue';

export const side = new Vue({
    data: {

    }
});


export const app = new Vue<{
    user: User;
}>({
    data: {
        user: {
            id: 0,
            name: '',
            image: '',
            online: false,
        }
    }

});



