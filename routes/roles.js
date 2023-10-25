//!ADMINISTRACION

const { Router } = require('express');
const { rolesGet } = require('../controllers/rol');

const router = Router();

// obtener todos los roles
//posibles parametros:(desde, limite), tipo
router.get('/', rolesGet);

module.exports = router;
