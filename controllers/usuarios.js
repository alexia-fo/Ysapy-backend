const { response, request } = require('express');


const usuariosGet = (req = request, res = response)=> {
    //const query = req.query;
    const {q,nombre='Sin nombre',apikey} = req.query;

    res.json({
        msg: 'get API - controlador',
        q,
        nombre,
        apikey
    });
}

const usuariosPut = (req, res = response )=> {


    //const id = req.params.id;
    
    const { id } = req.params;

    res.json({
        msg: 'put API - controlador',
        id
    });
}

const usuariosPost =   (req, res = response)=> {
    body = req.body;

    res.json({
        msg: 'post API - controlador',
        body
    });
}

const usuariosDelete = (req, res = response)=> {
    res.json({
        msg: 'delete API - controlador'
    });
}

const usuariosPatch = (req, res = response)=> {
    res.json({
        msg: 'patch API - controlador'
    });
}


module.exports = {
    usuariosGet,
    usuariosPut,
    usuariosPost,
    usuariosDelete,
    usuariosPatch

}
