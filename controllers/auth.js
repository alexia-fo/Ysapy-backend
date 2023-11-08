const { response } = require("express");
const bryptjs = require('bcryptjs');
const Usuario = require('../model/usuario');
const { generarJWT } = require("../helpers/generar-jwt");
const { googleVerify } = require("../helpers/google-verify");
const { json } = require("body-parser");
const { Rol, Sucursal } = require("../model");


const login = async (req, res=response) => {
    const {correo, contra} = req.body;

    try {

        // verificar si el email existe // si el usuario esta ativo
        const usuario = await Usuario.findOne({where: {correo: correo, activo:true}});
        if( !usuario ) {
            return res.status(401).json({
                msg: 'Usuario / Contraseña no son correctos'
            });
        }
        
        // verficar la contra
        const validContra = bryptjs.compareSync(contra, usuario.contra);
        if( !validContra ) {
            return res.status(401).json({
                msg: 'Usuario / Contraseña no son correctos'
            });
        }
        //generar el JWT
        const token = await generarJWT( usuario.idUsuario );
          
        res.json({
            usuario,
            token
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({msg:' Algo salio mal, hable con el administrador '})
    }
}

const googleSignIn = async(req, res = response) => {
    const {id_token} = req.body;

    try {
        const {nombre, img, correo} = await googleVerify( id_token );
        //console.log(googleUser);

        let  usuario = await Usuario.findOne({where: {correo: correo, activo:true}});

        if(!usuario) {
            // hay que crearlo
            const data ={
                nombre,
                nusuario: nombre,
                correo,
                contra: ':P',
                img,
                google: true
            };
            usuario = new Usuario(data);
            await usuario.save(); 
        }

        //verifica el estado del usuario en bd
        if(!usuario.activo){
            return res.status(401).json({
                msg: 'Hable con el administrador, usuario bloqueado'
            });
        }

        // generar el jwt
        const token = await generarJWT( usuario.idUsuario );
        
        res.json({
            usuario,
            id_token
        });

    } catch (error) {
        json.status(400).json({
            ok: false,
            msg: 'El token no se pudo verificar'
        })
    }
}

//FIXME: retorna el perfil en base al token
const retornarPerfil = async (req, res) => {
    try {
        // EL ID DE USUARIO VA A EXISTIR EN ESTE PUNTO PORQUE SE VERIFICARA EL JWT

        const {idUsuario} = req.usuario;
  
        const usuario = await Usuario.findAll({
            where:{idUsuario},
            include: [{ model: Rol, attributes: ['rol']}, { model: Sucursal, attributes: ['nombre']}]
        });

            
        if(usuario){
            res.json({usuario:usuario[0]});
        }else{
            res.status(404).json({
                msg: `No existe el usuario con id ${ id } `
            });
        }
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({ msg: "Error al obtener el perfil del usuario" });
    }
}

// const crearPrimerUsuario =  async (req, res = response)=> {    
//     try {
//         const usuario = {
//             nombre : "ROOT AUTOMATICO",
//             contra : "12345678",
//             correo : "rootautomatico@gmail.com",
//             idrol : 1,
//             idsucursal:1,
//             nusuario : "rootautomatico",
//             turno:'M'
//         }

       
//         // encriptar la contrasenia
//         const salt = bryptjs.genSaltSync();  //nro de vueltas, por defecto es 10
//         usuario.contra = bryptjs.hashSync(req.body.contra, salt);

//        // guardar el usuario
//        Usuario.create(usuario);

//        res.status(201).json(usuario);
//    } catch (error) {
//         console.log(error);
//         res.status(500).json({msg: 'Error al registrar el usuario'});
//    }
// }

module.exports ={
    login,
    googleSignIn,
    retornarPerfil,
}