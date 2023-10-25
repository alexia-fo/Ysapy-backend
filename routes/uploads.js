const { Router } = require('express');
const { check } = require('express-validator');

const { validarCampos } = require('../middlewares/validar-campos');
const { cargarArchivo, actualizarImagen, mostrarImagen } = require('../controllers/uploads');
const { coleccionesPermitidas } = require('../helpers/db-validators');
const { validarArchivoSubir } = require('../middlewares/validar-archivo');

const router = Router();


router.post('/', validarArchivoSubir ,cargarArchivo);

router.put('/:coleccion/:id',[
    
    validarArchivoSubir,
    check('coleccion').custom( c=> coleccionesPermitidas (c, ['usuarios','productos', 'informaciones'])),
    validarCampos
    
], actualizarImagen);


router.get('/:coleccion/:id',[
    check('coleccion').custom( c=> coleccionesPermitidas (c, ['usuarios','productos', 'informaciones'])),
    validarCampos
],  mostrarImagen);

module.exports = router;
