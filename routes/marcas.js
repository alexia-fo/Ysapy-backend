//!ADMINISTRACION
const { Router } = require('express');
const { marcasGet } = require('../controllers/marca');

const router = Router();

//FIXME: para obtener el listado de marcas para el combo en abmc de productos
//posibles parametros: (limite y desde) en 
router.get('/', marcasGet);

module.exports = router;



