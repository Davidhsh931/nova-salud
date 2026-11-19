const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { Op, Transaction } = require('sequelize');
const { sequelize, User, Product, Batch, Customer, Sale, SaleItem } = require('./models');
const { availableStock, expiredBatches, assertSaleItems } = require('./inventory');
const app = express();
app.use(helmet());
app.use(cors({ origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',') }));
app.use(express.json({ limit: '100kb' }));
const asyncRoute = fn => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);
const validate = (req,res,next) => { const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() }); next(); };
function auth(req,res,next) { try { const token = /^Bearer (.+)$/.exec(req.headers.authorization || '')?.[1]; if (!token) return res.status(401).json({ error: 'Autenticación requerida' }); req.auth = jwt.verify(token, process.env.JWT_SECRET); next(); } catch { res.status(401).json({ error: 'Token inválido' }); } }
const admin = (req,res,next) => req.auth.role === 'admin' ? next() : res.status(403).json({ error: 'Solo administrador' });
app.get('/api/health', (req,res) => res.json({ status: 'ok' }));
app.post('/api/login', [body('email').isEmail(),body('password').isString().notEmpty()],validate,asyncRoute(async(req,res)=>{
  const user = await User.findOne({ where: { email: req.body.email } });
  if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) return res.status(401).json({ error: 'Credenciales incorrectas' });
  res.json({ token: jwt.sign({ id:user.id, role:user.role },process.env.JWT_SECRET,{ expiresIn:'8h' }), user: { id:user.id,name:user.name,role:user.role } });
}));
app.get('/api/products',auth,asyncRoute(async(req,res)=>{
 const products = await Product.findAll({ where:{active:true}, include:[Batch], order:[['name','ASC']] });
 const today = new Date().toISOString().slice(0,10);
 res.json(products.map(p=>({ ...p.toJSON(), stock:availableStock(p.batches,today) })));
}));
app.post('/api/products',auth,admin,[body('name').trim().notEmpty(),body('sku').trim().notEmpty(),body('price').isFloat({min:0}),body('minStock').optional().isInt({min:0})],validate,asyncRoute(async(req,res)=>res.status(201).json(await Product.create({name:req.body.name,sku:req.body.sku,price:req.body.price,minStock:req.body.minStock??5}))));
app.put('/api/products/:id',auth,admin,[body('name').optional().trim().notEmpty(),body('price').optional().isFloat({min:0}),body('minStock').optional().isInt({min:0})],validate,asyncRoute(async(req,res)=>{const p=await Product.findByPk(req.params.id);if(!p)return res.status(404).json({error:'Producto no encontrado'}); await p.update(Object.fromEntries(['name','price','minStock'].filter(k=>req.body[k]!==undefined).map(k=>[k,req.body[k]])));res.json(p);}));
app.delete('/api/products/:id',auth,admin,asyncRoute(async(req,res)=>{const p=await Product.findByPk(req.params.id);if(!p)return res.status(404).json({error:'Producto no encontrado'});await p.update({active:false});res.status(204).end();}));
app.post('/api/products/:id/batches',auth,admin,[body('code').trim().notEmpty(),body('expiresAt').isISO8601(),body('quantity').isInt({min:0})],validate,asyncRoute(async(req,res)=>{const p=await Product.findByPk(req.params.id);if(!p||!p.active)return res.status(404).json({error:'Producto no encontrado'});res.status(201).json(await Batch.create({productId:p.id,code:req.body.code,expiresAt:req.body.expiresAt,quantity:req.body.quantity}));}));
app.get('/api/alerts',auth,asyncRoute(async(req,res)=>{const products=await Product.findAll({where:{active:true},include:[Batch]});const today=new Date().toISOString().slice(0,10);res.json({lowStock:products.map(p=>({id:p.id,name:p.name,minStock:p.minStock,stock:availableStock(p.batches,today)})).filter(p=>p.stock<=p.minStock),expiredBatches:products.flatMap(p=>expiredBatches(p.batches,today).map(b=>({product:p.name,code:b.code,expiresAt:b.expiresAt,quantity:b.quantity})))});}));
app.get('/api/customers',auth,asyncRoute(async(req,res)=>res.json(await Customer.findAll({limit:100,order:[['name','ASC']]}))));
app.post('/api/customers',auth,[body('name').trim().notEmpty(),body('document').optional({nullable:true}).isString()],validate,asyncRoute(async(req,res)=>res.status(201).json(await Customer.create({name:req.body.name,document:req.body.document||null}))));
app.post('/api/sales',auth,[body('customerId').optional({nullable:true}).isInt({min:1}),body('items').isArray({min:1}),body('items.*.productId').isInt({min:1}),body('items.*.quantity').isInt({min:1})],validate,asyncRoute(async(req,res)=>{
 const items=req.body.items;
 if(!assertSaleItems(items))return res.status(400).json({error:'Productos repetidos o cantidades inválidas'});
 try {
 const sale=await sequelize.transaction({isolationLevel:Transaction.ISOLATION_LEVELS.READ_COMMITTED},async t=>{
  if(req.body.customerId && !(await Customer.findByPk(req.body.customerId,{transaction:t})))throw Object.assign(new Error('Cliente no encontrado'),{status:400});
  const s=await Sale.create({userId:req.auth.id,customerId:req.body.customerId||null,total:0},{transaction:t});let totalCents=0;
  for(const item of [...items].sort((a,b)=>a.productId-b.productId)){
   const p=await Product.findOne({where:{id:item.productId,active:true},transaction:t,lock:t.LOCK.UPDATE});
   if(!p)throw Object.assign(new Error('Producto no encontrado'),{status:400});
   const batches=await Batch.findAll({where:{productId:p.id,quantity:{[Op.gt]:0},expiresAt:{[Op.gte]:new Date().toISOString().slice(0,10)}},order:[['expiresAt','ASC'],['id','ASC']],transaction:t,lock:t.LOCK.UPDATE});
   if(batches.reduce((sum,b)=>sum+b.quantity,0)<item.quantity)throw Object.assign(new Error(`Stock insuficiente o vencido: ${p.name}`),{status:409});
   let remaining=item.quantity;const cents=Math.round(Number(p.price)*100);
   for(const b of batches){if(!remaining)break;const take=Math.min(remaining,b.quantity);await b.update({quantity:b.quantity-take},{transaction:t});await SaleItem.create({saleId:s.id,productId:p.id,batchId:b.id,quantity:take,unitPrice:p.price,subtotal:(take*cents/100).toFixed(2)},{transaction:t});remaining-=take;}
   totalCents+=item.quantity*cents;
  }
  await s.update({total:(totalCents/100).toFixed(2),receiptNumber:`NS-${String(s.id).padStart(8,'0')}`},{transaction:t});return s;
 });res.status(201).json(sale);
 }catch(e){res.status(e.status||500).json({error:e.status?e.message:'No se pudo registrar la venta'});}
}));
app.get('/api/sales',auth,asyncRoute(async(req,res)=>res.json(await Sale.findAll({include:[{model:SaleItem,include:[Product,Batch]},Customer],order:[['createdAt','DESC']],limit:100}))));
app.get('/api/reports/summary',auth,admin,asyncRoute(async(req,res)=>{const sales=await Sale.findAll({attributes:['total']});res.json({salesCount:sales.length,totalRevenue:sales.reduce((s,v)=>s+Number(v.total),0).toFixed(2)});}));
app.post('/api/users',auth,admin,[body('name').trim().notEmpty(),body('email').isEmail(),body('password').isLength({min:10}),body('role').isIn(['admin','vendedor'])],validate,asyncRoute(async(req,res)=>{const u=await User.create({name:req.body.name,email:req.body.email,passwordHash:await bcrypt.hash(req.body.password,12),role:req.body.role});res.status(201).json({id:u.id,name:u.name,email:u.email,role:u.role});}));
app.use((err,req,res,next)=>{if(err.name==='SequelizeUniqueConstraintError')return res.status(409).json({error:'Registro duplicado'});if(err.name==='SequelizeValidationError'||err.name==='SequelizeForeignKeyConstraintError')return res.status(400).json({error:'Datos inválidos'});console.error(err);res.status(500).json({error:'Error interno'});});
module.exports=app;
