

const path = require('path');
const fs = require('fs');

const { response } = require("express");
const { subirArchivo } = require('../helpers/subir-archivo');
const { Usuario, Producto } = require("../model");
const Informacion = require('../model/informacion');





const cargarArchivo = async (req, res = response) =>{

    let sampleFile;
   // let uploadPath;


    try {
        
        //const nombre = await subirArchivo(req.files, ['txt','md'], 'textos');
        const nombre = await subirArchivo(req.files, undefined, 'imgs');
        setTimeout(function(){

            res.json({ nombre });
        }, 2000);
        
    } catch (error) {
        res.status(400).json({error});
    }

}


const actualizarImagen = async (req, res=response) => {

    const { id, coleccion} = req.params;

    let modelo;

    switch (coleccion) {
        case 'usuarios':
           modelo = await Usuario.findByPk(id);
           if(!modelo){
            return res.status(400).json({
                msg: `No existe un usuario con el ID ${id}`
            })
           }
            break;
        case 'productos':
            modelo = await Producto.findByPk(id);
            if(!modelo){
                return res.status(400).json({
                    msg: `No existe un producto con el ID ${id}`
                });
            }
            break;
    
        case 'informaciones':
            modelo = await Informacion.findByPk(id);
            if(!modelo){
                return res.status(400).json({
                    msg: `No existe la informacion con el ID ${id}`
                });
            }
            break;
    
        default:
            return res.status(500).json({msg: 'Esto falta todavía'});
        
    }


    // limpiar imagenes previas

    try {
        if(modelo.img){
            // hay que borrar la imagen del servidor
            const pathImagen = path.join(__dirname, '../uploads', coleccion, modelo.img);
            if(fs.existsSync(pathImagen) ){
                fs.unlinkSync(pathImagen);
            }
        }
    } catch (error) {
        
    }

    const nombre = await subirArchivo(req.files, undefined, coleccion);
    modelo.img  = nombre;

    await modelo.save();

    setTimeout(function(){
            
        res.json(modelo);
    }, 2000);

    

}


const mostrarImagen = async (req, res=response) =>{


    const { id, coleccion} = req.params;

    let modelo;

    switch (coleccion) {
        case 'usuarios':
           modelo = await Usuario.findByPk(id);
           if(!modelo){
                return res.status(400).json({
                    msg: `No existe un usuario con el ID ${id}`
                })
           }
            break;
        case 'productos':
            modelo = await Producto.findByPk(id);
            if(!modelo){
                return res.status(400).json({
                    msg: `No existe un producto con el ID ${id}`
                });
            }
            break;

        case 'informaciones':
            modelo = await Informacion.findByPk(id);
            if(!modelo){
                return res.status(400).json({
                    msg: `No existe la informacion con el ID ${id}`
                });
            }
            break;
    
        default:
            return res.status(500).json({msg: 'Esto falta todavía'});
    }


    // limpiar imagenes previas

    try {
        if(modelo.img){
            // hay que borrar la imagen del servidor
            const pathImagen = path.join(__dirname, '../uploads', coleccion, modelo.img);
            if(fs.existsSync(pathImagen) ){
                return res.sendFile(pathImagen);
            }
        }
    } catch (error) {
        res.status(500).json({
            msg: 'Hable con el administrador, error al mostra la imagen'
        });
        
    }

    const pathImagen = path.join(__dirname, '../assets','no-image.jpg');
            if(fs.existsSync(pathImagen) ){
                setTimeout(function(){

                    return res.sendFile(pathImagen);
                }, 2000);
    }
    
}

module.exports = {
    cargarArchivo,
    actualizarImagen,
    mostrarImagen
}