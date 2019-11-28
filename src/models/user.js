"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var types_1 = require("sequelize/types");
var database_1 = require("../config/database");
var User = /** @class */ (function (_super) {
    __extends(User, _super);
    function User() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    User.scopeWithout = function () {
        return User.scope('without');
    };
    return User;
}(types_1.Model));
exports.User = User;
User.init({
    id: {
        type: types_1.DataTypes.BIGINT,
        primaryKey: true
    },
    token: types_1.DataTypes.STRING,
    sessid: types_1.DataTypes.STRING,
    avatar: types_1.DataTypes.STRING,
    name: types_1.DataTypes.BIGINT,
    createdAt: types_1.DataTypes.DATE
}, {
    underscored: true,
    tableName: 'user',
    sequelize: database_1.sequelize,
    updatedAt: false,
    scopes: {
        withoutToken: {
            attributes: { exclude: ['token'] }
        }
    }
});
