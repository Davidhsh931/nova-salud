require('dotenv').config();
const bcrypt=require('bcryptjs');
const app=require('./app');
const {sequelize,User}=require('./models');
(async()=>{
 if(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32)throw new Error('Configura JWT_SECRET de al menos 32 caracteres');
 await sequelize.authenticate();await sequelize.sync();
 if(process.env.ADMIN_EMAIL&&process.env.ADMIN_PASSWORD){if(process.env.ADMIN_PASSWORD.length<10)throw new Error('ADMIN_PASSWORD demasiado corta');const existing=await User.findOne({where:{email:process.env.ADMIN_EMAIL}});if(!existing)await User.create({name:'Administrador',email:process.env.ADMIN_EMAIL,passwordHash:await bcrypt.hash(process.env.ADMIN_PASSWORD,12),role:'admin'});}
 app.listen(Number(process.env.PORT||3001),()=>console.log(`Nova Salud API en puerto ${process.env.PORT||3001}`));
})().catch(e=>{console.error(e);process.exit(1)});
