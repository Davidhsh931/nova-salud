const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 3306), dialect: 'mysql', logging: false,
  define: { underscored: true }
});
const User = sequelize.define('user', { name: { type: DataTypes.STRING, allowNull: false }, email: { type: DataTypes.STRING, allowNull: false, unique: true }, passwordHash: { type: DataTypes.STRING, allowNull: false }, role: { type: DataTypes.ENUM('admin', 'vendedor'), allowNull: false } });
const Product = sequelize.define('product', { name: { type: DataTypes.STRING, allowNull: false }, sku: { type: DataTypes.STRING, allowNull: false, unique: true }, price: { type: DataTypes.DECIMAL(10,2), allowNull: false }, minStock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 }, active: { type: DataTypes.BOOLEAN, defaultValue: true } });
const Batch = sequelize.define('batch', { code: { type: DataTypes.STRING, allowNull: false }, expiresAt: { type: DataTypes.DATEONLY, allowNull: false }, quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 } }, { indexes: [{ unique: true, fields: ['product_id','code'] }] });
const Customer = sequelize.define('customer', { name: { type: DataTypes.STRING, allowNull: false }, document: { type: DataTypes.STRING, unique: true } });
const Sale = sequelize.define('sale', { total: { type: DataTypes.DECIMAL(12,2), allowNull: false }, receiptNumber: { type: DataTypes.STRING, unique: true } });
const SaleItem = sequelize.define('sale_item', { quantity: { type: DataTypes.INTEGER, allowNull: false }, unitPrice: { type: DataTypes.DECIMAL(10,2), allowNull: false }, subtotal: { type: DataTypes.DECIMAL(12,2), allowNull: false } });
Product.hasMany(Batch); Batch.belongsTo(Product);
User.hasMany(Sale); Sale.belongsTo(User);
Customer.hasMany(Sale); Sale.belongsTo(Customer);
Sale.hasMany(SaleItem); SaleItem.belongsTo(Sale);
Product.hasMany(SaleItem); SaleItem.belongsTo(Product);
Batch.hasMany(SaleItem); SaleItem.belongsTo(Batch);
module.exports = { sequelize, User, Product, Batch, Customer, Sale, SaleItem };
