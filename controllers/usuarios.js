//!ADMINISTRACION

const { response, request } = require('express');
const bryptjs = require('bcryptjs');
const Usuario  = require('../model/usuario');
const { Rol, Sucursal } = require('../model');
const { Op } = require("sequelize");


const cambiarContrasena = async (req, res = response) => {
    const { nuevaContrasena } = req.body;
    const { id } = req.params;

    //en este punto ya se valida si el id existe
    try {

        const salt = bryptjs.genSaltSync();
        const nuevaContrasenaEncriptada = bryptjs.hashSync(nuevaContrasena, salt);
        
        const usuario = await Usuario.findByPk(id);
      
        await usuario.update( { contra: nuevaContrasenaEncriptada } );
        
        res.json(usuario);
        

    } catch (error) {
      console.log(error);
      res.status(500).json({ msg: 'Error al cambiar la contraseña' });
    }
};
  
  

//obtener los usuarios o verificar si el correo del usuario se encuentra disponible
const usuariosGet = async (req = request, res = response)=> {
    let limite = req.query.limite;
    let desde = req.query.desde;
    let correo = req.query.correo;

    try {
        //si se envia el parametro correo se verifica si el mismo ya se 
        //encuentra registrado, se utiliza cuando se registra o actualiza un usuario
        //para verificar si el correo se encuentra habilitado 
        if(correo){//ver si el correo esta habilitado

            const existe = await Usuario.findOne({
                where: { correo }
            });
            
            if(existe){
                res.json({
                    isAvailable:false
                })
            }else{       
                res.json({
                    isAvailable:true
                })  
            } 
                  
        }else{   
            //si no se envia el parametro correo, se retorna un listado de usuarios 
    

            if (!limite && !desde) {// si no se envian los parametros desde y limite se retornaran todos los registros

                const [total,usuarios] = await Promise.all([
                    // Usuario.count({where: {activo:true}}),
                    Usuario.count(),
                    Usuario.findAll({
                        // where: {activo:true},
                        include: [{ model: Sucursal, attributes:[ 'nombre'] },
                                    { model: Rol, attributes: ['rol']}]
                    })
                ]);
    
                res.json({
                    total,
                    usuarios
                });
            } else if (limite !== undefined && desde !== undefined) { //si se envia los parametros limite y desde, estos se utilizaran para tener en cuenta la cantidad de registros a retornar
                limite = parseInt(limite);
                desde = parseInt(desde);
    
                if (limite <= desde) {
                    return res.status(404).json({ error: "El valor de 'limite' debe ser mayor que el valor de 'desde'" });
                }
    
                const [total,usuarios] = await Promise.all([
                    // Usuario.count({where: {activo:true}}),
                    Usuario.count(),
                    Usuario.findAll({
                        offset: desde,
                        limit: limite,
                        // where: {activo:true},
                        include: [{ model: Sucursal, attributes:[ 'nombre'] },
                                    { model: Rol, attributes: ['rol']}]   // populate (traer datos de la tabla relacionada)
                    })
                ]);
    
                res.json({
                    total,
                    usuarios
                });
            } else {
                return res.status(404).json({ error: "Si se proporciona uno de los parámetros 'limite' y 'desde', ambos deben ser proporcionados" });
            }
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Error al obtener los usuarios" });
         
    }
}

const usuariosPost =  async (req, res = response)=> {    
    try {
        const usuario = {
            nombre : req.body.nombre.toUpperCase(),
            contra : req.body.contra,
            correo : req.body.correo,
            idrol : req.body.idrol,
            idsucursal:req.body.idsucursal,
            nusuario : req.body.nusuario,
            turno:req.body.turno,

            //todo agregado
            categoria: req.body.categoria
        }

       
        // encriptar la contrasenia
        const salt = bryptjs.genSaltSync();  //nro de vueltas, por defecto es 10
        usuario.contra = bryptjs.hashSync(req.body.contra, salt);

       // guardar el usuario
       Usuario.create(usuario);

       res.status(201).json(usuario);
   } catch (error) {
        console.log(error);
        res.status(500).json({msg: 'Error al registrar el usuario'});
   }
}

const usuariosPut = async (req, res = response )=> {
    
    const {id} = req.params;
    //activo se destructura para no actualizar el mismo (activo solo se actualiza a false cuando se elimina)
    //los datos incluidos en 'resto' son nombre, nusuario, correo, contra, idsucursal, idrol, turno
    // 'img' se actualiza por separado 
    const { nombre, contra, google, activo, ...resto } = req.body; // se utiliza de esta forma para obviar los campos
    
    try {

    if ( contra ){
        // encriptar la contrasenia
        const salt = bryptjs.genSaltSync();  //nro de vueltas, por defecto es 10
        resto.contra = bryptjs.hashSync(req.body.contra, salt);
    }

    resto.nombre=nombre.toUpperCase();

    // para no repetir el correo
    const correoBD = await Usuario.findOne({
        where: {
            correo: resto.correo,//correo es obligatorio
            idUsuario: {
                [Op.ne]: id //que no sea del mismo id de usuario
            }
        }
    });

    
    if(correoBD){
        return res.status(404).json({
            msg: `El correo ${resto.correo}, no se encuentra disponible `
        });
    } 

    const usuario = await Usuario.findByPk(id);
      
    await usuario.update( resto );

    res.json(usuario);

   } catch (error) {
        console.log(error);
        res.status(500).json({
            msg: 'Error al actualizar el usuario'
        });
   }
}


const usuariosDelete = async (req = request, res = response)=> {
    
    const { id } = req.params;
    
    const usuarioAutenticado = req.usuario;

    try {
        const usuario = await Usuario.findByPk(id);

       // await usuario.destroy(); borra definitivamente los datos de la bd
        //todo:para habilitar y anular
    //    await usuario.update({ activo: false, idUsuario: usuarioAutenticado}); // solo cambia el estado del usuario
       await usuario.update({ activo: !usuario.activo, idUsuario: usuarioAutenticado}); // solo cambia el estado del usuario

        res.json({
             usuario, 
             usuarioAutenticado // mostrar los datos del usuario autenticado
        });       
   } catch (error) {
        console.log(error);
        res.status(500).json({msg: 'Error al eliminar usuario'});
   }

}

const obtenerUsuario = async (req, res) => {
    const { id } = req.params;
  
    try {
      const usuario = await Usuario.findByPk(id, {
        include: [
          {
            model: Sucursal, // Nombre de tu modelo Usuario
            attributes: ['nombre'], // Especifica los atributos que deseas obtener del modelo Usuario
          },
          {
            model: Rol, // Nombre de tu modelo Usuario
            attributes: ['rol'], // Especifica los atributos que deseas obtener del modelo Usuario
          },
        ],
      });
  
      if (!usuario) {
        return res.status(404).json({
          msg: 'Sucursal no encontrada',
        });
      }
  
      res.json(usuario);
    } catch (error) {
      console.error(error);
      res.status(500).json({
        msg: 'Error al obtener la producto',
      });
    }
  };


module.exports = {
    usuariosGet,
    usuariosPut,
    usuariosPost,
    usuariosDelete,
    cambiarContrasena,
    obtenerUsuario
}
