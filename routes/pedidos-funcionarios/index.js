const { Router } = require('express');
const realizarPedidos = require('./realizar-pedidos');
const verPedidos = require('./ver-pedidos');



const router = Router();


router.use(realizarPedidos);
router.use(verPedidos);

module.exports=router;