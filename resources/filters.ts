import Vue from 'vue';
import moment from 'moment';

Vue.filter('dt', (value: any, format: string) => {
    return value ? moment(value).format(format) : value;
});
