import { log } from "../config/logger";
import * as moment from 'moment';
import { sequelize } from '../config/database';

export class BaseRepository {
    public db = sequelize;
};

