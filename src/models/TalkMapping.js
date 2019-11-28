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
/**
 * @extends InterfaceModel
 */
var TalkMapping = /** @class */ (function (_super) {
    __extends(TalkMapping, _super);
    function TalkMapping() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return TalkMapping;
}(types_1.Model));
exports.TalkMapping = TalkMapping;
TalkMapping.init({
    id: {
        type: types_1.DataTypes.BIGINT,
        primaryKey: true
    },
    talkId: types_1.DataTypes.BIGINT,
    userId: types_1.DataTypes.BIGINT,
    unread: types_1.DataTypes.INTEGER,
    lastReadId: types_1.DataTypes.BIGINT,
    createdAt: types_1.DataTypes.DATE
}, {
    underscored: true,
    tableName: 'talk_mapping',
    sequelize: database_1.sequelize,
    updatedAt: false
});
