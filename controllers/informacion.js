//!ADMINISTRACION

const { response } = require("express");
const {Usuario} = require('../model');
const { Op } = require("sequelize");
const Informacion = require("../model/informacion");

//FIXME: para listar informaciones a funcionarios y administradores en la ventana de informaciones a mostarar 
const informacionesGet = async (req = request, res = response)=> {
    let limite = req.query.limite;
    let desde = req.query.desde;

    try {

            if (!limite && !desde) {// si no se envian los parametros desde y limite se retornaran todos los registros
                const [total, informacion] = await Promise.all([
                    Informacion.count({where: {activo:true}}),
                    Informacion.findAll({
                        where: {activo:true},
                        include: [{ model: Usuario, attributes:[ 'nombre'] },]
                    })
                ]);
    
                res.json({
                    total,
                    informacion
                });
            } else if (limite !== undefined && desde !== undefined) { //si se envia los parametros limite y desde, estos se utilizaran para tener en cuenta la cantidad de registros a retornar
                limite = parseInt(limite);
                desde = parseInt(desde);
    
                if (limite <= desde) {
                    return res.status(404).json({ error: "El valor de 'limite' debe ser mayor que el valor de 'desde'" });
                }
    
                const [total, informacion] = await Promise.all([
                    Informacion.count({where: {activo:true}}),
                    Informacion.findAll({
                        offset: desde,
                        limit: limite,
                        where: {activo:true},
                        include: [{ model: Usuario, attributes:[ 'nombre'] }]
                    })
                ]);
    
                res.json({
                    total,
                    informacion
                });
            } else {
                return res.status(404).json({ error: "Si se proporciona uno de los parámetros 'limite' y 'desde', ambos deben ser proporcionados" });
            }
        
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Error al obtener las informaciones" });
    }

}

//FIXME: para listar informaciones en la tabla de abmc de admin
const informacionesGetAdmin = async (req = request, res = response)=> {
    let limite = req.query.limite;
    let desde = req.query.desde;

    try {

            if (!limite && !desde) {// si no se envian los parametros desde y limite se retornaran todos los registros
                const [total, informacion] = await Promise.all([
                    Informacion.count({where: {activo:true}}),
                    Informacion.findAll({
                        where: {activo:true},
                        include: [{ model: Usuario, attributes:[ 'nombre'] },]
                    })
                ]);
    
                res.json({
                    total,
                    informacion
                });
            } else if (limite !== undefined && desde !== undefined) { //si se envia los parametros limite y desde, estos se utilizaran para tener en cuenta la cantidad de registros a retornar
                limite = parseInt(limite);
                desde = parseInt(desde);
    
                if (limite <= desde) {
                    return res.status(404).json({ error: "El valor de 'limite' debe ser mayor que el valor de 'desde'" });
                }
    
                const [total, informacion] = await Promise.all([
                    Informacion.count({where: {activo:true}}),
                    Informacion.findAll({
                        offset: desde,
                        limit: limite,
                        where: {activo:true},
                        include: [{ model: Usuario, attributes:[ 'nombre'] }]
                    })
                ]);
    
                res.json({
                    total,
                    informacion
                });
            } else {
                return res.status(404).json({ error: "Si se proporciona uno de los parámetros 'limite' y 'desde', ambos deben ser proporcionados" });
            }
        
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Error al obtener las informaciones" });
    }

}

const crearInformacion = async (req, res = response) => {
    
    try {
        
        const titulo = req.body.titulo.toUpperCase();
        let descripcion = req.body.descripcion;
        let fecha = req.body.fecha;

        if (descripcion) {
            descripcion = descripcion.toUpperCase();
        }

        const data ={
            titulo,
            descripcion,
            fecha,
            idusuario: req.usuario.idUsuario,
        }

        const informacion = new Informacion(data);

        await informacion.save();

        res.status(201).json({ msg: "Información registrada correctamente" });
    } catch (error) {
        return res.status(500).json({ msg: "Error al registrar la informacion" });
    }
}

const informacionPut = async (req, res = response )=> {
    
    const {id} = req.params;
    //activo y usuario se destructura para no actualizar los mismos (activo solo se actualiza a false cuando se elimina)
    //los datos incluidos en 'resto' son titulo, descripcion,fecha que es opcional
    // 'img' se actualiza por separado 
    const { titulo, descripcion, usuario, activo,img,  ...resto } = req.body;

    try {

        resto.titulo = titulo.toUpperCase();
        resto.idusuario = req.usuario.idUsuario;
        if(descripcion){
            resto.descripcion = descripcion.toUpperCase(); 
        }

        const informacion = await Informacion.findByPk(id);
    
        //Se actualiza: idclasificacion, precio, facturable, nombre, idusuario
        await informacion.update( resto );
    
        res.json({ msg: 'Información registrada correctamente'});
   } catch (error) {
        console.log(error);
        res.status(500).json({
            msg: 'Error al actualizar la informacion'
        });
   }
}

const informacionDelete = async (req = request, res = response)=> {
    
    const { id } = req.params;
    
    const usuarioAutenticado = req.usuario;

    try {
       const informacion = await Informacion.findByPk(id);

       await informacion.update({ activo: false, idUsuario: usuarioAutenticado}); // solo cambia el estado del usuario

       res.json({
            informacion, 
            usuarioAutenticado // mostrar los datos del usuario autenticado
        });
        
   } catch (error) {
        console.log(error);
        res.status(500).json({msg: 'Error al eliminar el informacion'});
   }

}

module.exports = {
    crearInformacion,
    informacionesGet,
    informacionPut,
    informacionDelete,
    informacionesGetAdmin
}