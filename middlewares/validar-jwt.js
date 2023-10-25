
const { response, request } = require('express');
const jwt = require('jsonwebtoken');
const Usuario  = require('../model/usuario');


const validarJWT = async (req = request, res = response, next) => {

    const token = req.header('x-token');

    
    if( !token ) {
        return res.status(401).json({
            msg: 'No hay token en la peticion '
        });
    }
    
    try {
       // token = token.replace('Bearer ', '');
        const payload= jwt.verify(token, process.env.SECRETORPRIVATEKEY);

        
        // leer los datos del usuario autenticado

        const usuario =  await Usuario.findByPk( payload.idusuario );

        if(!usuario){
            return res.status(401).json({
                msg: 'Token no válido, usuario no existe '
            });
        }


        
        if(!usuario.activo){
            return res.status(401).json({
                msg: 'Token no válido, usuario con estado false '
            })
        }

        // verificar que tenga los permisos



        req.usuario = usuario;

       //req.idUsuario = payload.idusuario;

        //console.log(payload);
        //console.log(`En el validar el idUsuario es ${payload.idusuario}`);
        //console.log('validar JWT req.usuario ', req.usuario) 
        
        next();
    } catch (error) {
        console.log(error);
        res.status(401).json({
            msg: 'Token no valido '
        });
        
    }

}

module.exports = {
    validarJWT
}


