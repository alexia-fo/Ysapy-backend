//!ADMINISTRACION
const { Router } = require('express');
const { clasificacionesGet  } = require('../controllers/clasificaciones');

const router = Router();

//FIXME: para obtener el listado de clasificaciones para el combo en abmc de productos
//posibles parametros: (limite y desde) en 
router.get('/', clasificacionesGet);

module.exports = router;



