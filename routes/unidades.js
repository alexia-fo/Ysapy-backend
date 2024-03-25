//!ADMINISTRACION
const { Router } = require('express');
const { unidadesGet } = require('../controllers/unidad');

const router = Router();

//FIXME: para obtener el listado de unidades para el combo en abmc de productos
//posibles parametros: (limite y desde) en 
router.get('/', unidadesGet);

module.exports = router;



